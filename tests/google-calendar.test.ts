import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetConfigForTests } from "@/lib/config";
import { createGoogleCalendarProvider, resetGoogleTokenForTests } from "@/lib/booking/google";

const requestId = "550e8400-e29b-41d4-a716-446655440000";
const eventId = requestId.replaceAll("-", "");

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("Google Calendar event creation", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_REFRESH_TOKEN = "refresh-token";
    process.env.GOOGLE_CALENDAR_ID = "team@example.com";
    resetConfigForTests();
    resetGoogleTokenForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses a deterministic event id and reads the event after a duplicate", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return response({ access_token: "access-token", expires_in: 3_600 });
      }

      if (init?.method === "POST") {
        expect(url).toContain("conferenceDataVersion=1");
        const body = JSON.parse(String(init.body));
        expect(body.id).toBe(eventId);
        expect(body.extendedProperties.private.bookingRequestId).toBe(requestId);
        return response({ error: { message: "duplicate" } }, 409);
      }

      if (init?.method === "GET") {
        expect(url).toContain(`/events/${eventId}`);
        return response({
          id: eventId,
          htmlLink: "https://calendar.google.com/event?eid=x",
          conferenceData: {
            entryPoints: [
              {
                entryPointType: "video",
                uri: "https://meet.google.com/abc-defg-hij",
              },
            ],
          },
          extendedProperties: { private: { bookingRequestId: requestId } },
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const event = await createGoogleCalendarProvider().createEvent({
      requestId,
      start: new Date("2026-10-20T01:00:00.000Z"),
      end: new Date("2026-10-20T01:30:00.000Z"),
      name: "Ada Lovelace",
      email: "ada@example.com",
    });

    expect(event).toEqual({
      id: eventId,
      meetLink: "https://meet.google.com/abc-defg-hij",
      calendarLink: "https://calendar.google.com/event?eid=x",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("Google Calendar event deletion", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_REFRESH_TOKEN = "refresh-token";
    process.env.GOOGLE_CALENDAR_ID = "team@example.com";
    resetConfigForTests();
    resetGoogleTokenForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("removes the event, tolerates an empty body and an already deleted event", async () => {
    const calls: string[] = [];
    let deletes = 0;

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return response({ access_token: "access-token", expires_in: 3_600 });
      }

      deletes += 1;
      calls.push(`${init?.method} ${url}`);

      if (deletes === 1) {
        return {
          ok: true,
          status: 204,
          json: async () => {
            throw new Error("204 has no body");
          },
        } as unknown as Response;
      }

      return response({ error: { message: "not found" } }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const calendar = createGoogleCalendarProvider();

    await expect(calendar.deleteEvent(requestId)).resolves.toBeUndefined();
    await expect(calendar.deleteEvent(requestId)).resolves.toBeUndefined();

    expect(calls[0]).toBe(
      `DELETE https://www.googleapis.com/calendar/v3/calendars/team%40example.com/events/${eventId}?sendUpdates=all`,
    );
  });

  it("fails when Google refuses the delete", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "https://oauth2.googleapis.com/token") {
          return response({ access_token: "access-token", expires_in: 3_600 });
        }
        return response({ error: { message: "forbidden" } }, 403);
      }),
    );

    await expect(createGoogleCalendarProvider().deleteEvent(requestId)).rejects.toMatchObject({
      name: "GoogleCalendarError",
      code: "http_403",
    });
  });
});
