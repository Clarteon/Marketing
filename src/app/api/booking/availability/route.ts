import { getConfig } from "@/lib/config";
import { bookingRules } from "@/lib/booking/config";
import { BOOKING_AVAILABILITY_RATE_LIMIT } from "@/lib/booking/constants";
import {
  BookingFailedError,
  BookingNotConfiguredError,
  BookingTimeZoneError,
  GoogleCalendarError,
} from "@/lib/booking/errors";
import { availabilityQuerySchema } from "@/lib/booking/schema";
import { getAvailabilityForVisitor } from "@/lib/booking/service";
import { checkRateLimit, hashRateLimitKey } from "@/lib/guardrails/rate-limit";
import { getClientIp } from "@/lib/guardrails/request";
import { logServerEvent } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 30;

function json(
  body: Record<string, unknown>,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function errorCode(error: unknown): string {
  if (error instanceof GoogleCalendarError) return error.code;
  if (error instanceof BookingFailedError) return error.code;
  if (error && typeof error === "object") {
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string" && /^[A-Za-z0-9_]{1,40}$/.test(name)) return name;
  }
  return "unknown";
}

export async function GET(request: Request): Promise<Response> {
  let config;
  try {
    config = getConfig();
  } catch {
    logServerEvent("booking_config_invalid");
    return json({ ok: false, error: "service_unavailable" }, 503);
  }

  const ip = getClientIp(request);
  const limit = checkRateLimit(
    `booking:availability:ip:${hashRateLimitKey(ip)}`,
    Math.max(config.RATE_LIMIT_MAX_REQUESTS, BOOKING_AVAILABILITY_RATE_LIMIT),
    config.RATE_LIMIT_WINDOW_SECONDS * 1_000,
  );
  if (!limit.allowed) {
    return json({ ok: false, error: "rate_limited" }, 429, {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  const url = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    timezone: url.searchParams.get("timezone") ?? undefined,
  });
  if (!parsed.success) return json({ ok: false, error: "invalid_timezone" }, 400);

  try {
    const availability = await getAvailabilityForVisitor(
      parsed.data.timezone ?? bookingRules.timezone,
    );
    return json({ ok: true, ...availability });
  } catch (error) {
    if (error instanceof BookingTimeZoneError) {
      return json({ ok: false, error: "invalid_timezone" }, 400);
    }

    if (error instanceof BookingNotConfiguredError) {
      logServerEvent("booking_not_configured");
      return json({ ok: false, error: "booking_unavailable" }, 503);
    }

    logServerEvent("booking_availability_failed", { code: errorCode(error) });
    return json({ ok: false, error: "booking_unavailable" }, 503);
  }
}
