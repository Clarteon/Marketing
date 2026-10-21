import "server-only";
import { getConfig } from "@/lib/config";
import { bookingRules } from "./config";
import { BookingNotConfiguredError, GoogleCalendarError } from "./errors";
import type {
  BusyInterval,
  CalendarEvent,
  CalendarProvider,
  CreateCalendarEventInput,
} from "./types";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

interface GoogleBookingConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

interface GoogleEvent {
  id?: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
  };
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

interface FreeBusyResponse {
  calendars?: Record<
    string,
    {
      busy?: Array<{ start?: string; end?: string }>;
      errors?: Array<{ reason?: string }>;
    }
  >;
}

let tokenCache: TokenCache | undefined;
let tokenRequest: Promise<string> | undefined;

function getGoogleBookingConfig(): GoogleBookingConfig {
  const config = getConfig();
  const clientId = config.GOOGLE_CLIENT_ID;
  const clientSecret = config.GOOGLE_CLIENT_SECRET;
  const refreshToken = config.GOOGLE_REFRESH_TOKEN;
  const calendarId = config.GOOGLE_CALENDAR_ID;

  if (!clientId || !clientSecret || !refreshToken || !calendarId) {
    throw new BookingNotConfiguredError("Google Calendar is not configured.");
  }

  return { clientId, clientSecret, refreshToken, calendarId };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchToken(config: GoogleBookingConfig): Promise<string> {
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new GoogleCalendarError("token_network");
  }

  if (!response.ok) throw new GoogleCalendarError(`token_http_${response.status}`);

  let payload: { access_token?: string; expires_in?: number };
  try {
    payload = (await response.json()) as { access_token?: string; expires_in?: number };
  } catch {
    throw new GoogleCalendarError("token_invalid_response");
  }

  if (!payload.access_token) throw new GoogleCalendarError("token_missing");

  const lifetimeSeconds = Math.max(60, (payload.expires_in ?? 3_600) - 60);
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + lifetimeSeconds * 1_000,
  };
  return payload.access_token;
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }

  const config = getGoogleBookingConfig();
  tokenRequest ??= fetchToken(config).finally(() => {
    tokenRequest = undefined;
  });
  return tokenRequest;
}

async function googleFetch<T>(
  url: string,
  init: RequestInit,
  options: { maxAttempts?: number } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 2;
  let refreshed = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const accessToken = await getAccessToken();
    let response: Response;

    try {
      response = await fetch(url, {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      if (attempt >= maxAttempts) throw new GoogleCalendarError("network");
      await delay(300 * attempt);
      continue;
    }

    if (response.status === 401 && !refreshed) {
      refreshed = true;
      tokenCache = undefined;
      await getAccessToken(true);
      // This attempt did not change server state, so retrying is safe.
      attempt -= 1;
      continue;
    }

    if (response.ok) {
      try {
        return (await response.json()) as T;
      } catch {
        throw new GoogleCalendarError("invalid_response");
      }
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < maxAttempts) {
      await delay(300 * attempt);
      continue;
    }

    throw new GoogleCalendarError(`http_${response.status}`);
  }

  throw new GoogleCalendarError("unknown");
}

function calendarUrl(config: GoogleBookingConfig, suffix: string): string {
  return `${CALENDAR_BASE}/calendars/${encodeURIComponent(config.calendarId)}${suffix}`;
}

function eventIdForRequestId(requestId: string): string {
  // Google event IDs allow base32hex characters. A UUID without hyphens is a
  // valid, unique client-supplied ID, so two concurrent retries cannot create
  // two events: the second insert gets a duplicate error and reads the first.
  return requestId.replaceAll("-", "").toLowerCase();
}

function extractMeetLink(event: GoogleEvent): string | undefined {
  const video = event.conferenceData?.entryPoints?.find(
    (entry) =>
      entry.entryPointType === "video" &&
      typeof entry.uri === "string" &&
      entry.uri.startsWith("https://meet.google.com/"),
  );
  if (video?.uri) return video.uri;

  if (event.hangoutLink?.startsWith("https://meet.google.com/")) return event.hangoutLink;
  return undefined;
}

function safeCalendarLink(event: GoogleEvent): string | undefined {
  if (typeof event.htmlLink !== "string") return undefined;
  if (!event.htmlLink.startsWith("https://")) return undefined;
  return event.htmlLink;
}

function toCalendarEvent(event: GoogleEvent): CalendarEvent | undefined {
  if (typeof event.id !== "string" || !event.id) return undefined;
  const meetLink = extractMeetLink(event);
  if (!meetLink) return undefined;

  return {
    id: event.id,
    meetLink,
    calendarLink: safeCalendarLink(event),
  };
}

async function getEvent(config: GoogleBookingConfig, eventId: string): Promise<GoogleEvent> {
  return googleFetch<GoogleEvent>(
    `${calendarUrl(config, `/events/${encodeURIComponent(eventId)}`)}?conferenceDataVersion=1`,
    { method: "GET" },
  );
}

async function waitForMeetLink(
  config: GoogleBookingConfig,
  event: GoogleEvent,
): Promise<CalendarEvent> {
  const immediate = toCalendarEvent(event);
  if (immediate) return immediate;
  if (typeof event.id !== "string" || !event.id) throw new GoogleCalendarError("event_missing_id");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await delay(400);
    const refreshed = await getEvent(config, event.id);
    const withLink = toCalendarEvent(refreshed);
    if (withLink) return withLink;
  }

  throw new GoogleCalendarError("meet_link_missing");
}

export function createGoogleCalendarProvider(): CalendarProvider {
  return {
    async getBusyIntervals(timeMin: Date, timeMax: Date): Promise<BusyInterval[]> {
      const config = getGoogleBookingConfig();
      const payload = await googleFetch<FreeBusyResponse>(`${CALENDAR_BASE}/freeBusy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          timeZone: "UTC",
          items: [{ id: config.calendarId }],
        }),
      });

      const calendar =
        payload.calendars?.[config.calendarId] ?? Object.values(payload.calendars ?? {})[0];
      if (!calendar) throw new GoogleCalendarError("freebusy_missing_calendar");
      if (calendar.errors && calendar.errors.length > 0) {
        throw new GoogleCalendarError("freebusy_error");
      }

      return (calendar.busy ?? []).map((interval) => {
        const start = new Date(interval.start ?? "");
        const end = new Date(interval.end ?? "");
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
          throw new GoogleCalendarError("freebusy_invalid_interval");
        }
        return { start, end };
      });
    },

    async findEventByRequestId(
      requestId: string,
      around: Date,
    ): Promise<CalendarEvent | undefined> {
      const config = getGoogleBookingConfig();
      const timeMin = new Date(around.getTime() - 2 * 24 * 60 * 60 * 1_000);
      const timeMax = new Date(around.getTime() + 2 * 24 * 60 * 60 * 1_000);
      const params = new URLSearchParams({
        privateExtendedProperty: `bookingRequestId=${requestId}`,
        singleEvents: "true",
        showDeleted: "false",
        maxResults: "5",
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
      });

      const payload = await googleFetch<{ items?: GoogleEvent[] }>(
        `${calendarUrl(config, "/events")}?${params.toString()}`,
        { method: "GET" },
      );

      const match = (payload.items ?? []).find(
        (event) => event.extendedProperties?.private?.bookingRequestId === requestId,
      );
      if (!match?.id) return undefined;
      return waitForMeetLink(config, match);
    },

    async createEvent(input: CreateCalendarEventInput): Promise<CalendarEvent> {
      const config = getGoogleBookingConfig();
      const params = new URLSearchParams({
        conferenceDataVersion: "1",
        sendUpdates: "all",
      });
      const description = [
        "A Clarteon discovery call about what is slowing the business down.",
        "",
        `Booked by: ${input.name}`,
        `Email: ${input.email}`,
        input.notes ? `\nNotes:\n${input.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 4_000);
      const eventId = eventIdForRequestId(input.requestId);

      let payload: GoogleEvent;
      try {
        payload = await googleFetch<GoogleEvent>(
          `${calendarUrl(config, "/events")}?${params.toString()}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: eventId,
              summary: "Clarteon discovery call",
              description,
              location: "Google Meet",
              start: {
                dateTime: input.start.toISOString(),
                timeZone: bookingRules.timezone,
              },
              end: {
                dateTime: input.end.toISOString(),
                timeZone: bookingRules.timezone,
              },
              attendees: [{ email: input.email, displayName: input.name }],
              conferenceData: {
                createRequest: {
                  requestId: input.requestId,
                  conferenceSolutionKey: { type: "hangoutsMeet" },
                },
              },
              extendedProperties: {
                private: { bookingRequestId: input.requestId },
              },
              reminders: { useDefault: true },
            }),
          },
          // Do not retry event creation automatically. The deterministic event
          // ID makes a retry safe at Google's boundary, but a transport retry
          // is still better handled by reading the existing event.
          { maxAttempts: 1 },
        );
      } catch (error) {
        if (error instanceof GoogleCalendarError && error.code === "http_409") {
          // Another request with the same idempotency key won the insert.
          const existing = await getEvent(config, eventId);
          return waitForMeetLink(config, existing);
        }
        throw error;
      }

      return waitForMeetLink(config, payload);
    },
  };
}

export function resetGoogleTokenForTests(): void {
  tokenCache = undefined;
  tokenRequest = undefined;
}
