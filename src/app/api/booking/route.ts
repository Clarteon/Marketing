import { alertTeam } from "@/lib/alerts";
import { getConfig } from "@/lib/config";
import {
  BOOKING_BODY_MAX_BYTES,
  BOOKING_EMAIL_RATE_LIMIT,
  BOOKING_FORM_MIN_SUBMIT_MS,
  BOOKING_TURNSTILE_ACTION,
} from "@/lib/booking/constants";
import {
  BookingFailedError,
  BookingNotConfiguredError,
  BookingTimeZoneError,
  InvalidSlotError,
  SlotUnavailableError,
} from "@/lib/booking/errors";
import { bookingInputSchema } from "@/lib/booking/schema";
import { bookDiscoveryCall } from "@/lib/booking/service";
import { BookingStoreNotConfiguredError, SlotTakenError } from "@/lib/booking/store";
import { isAllowedOrigin } from "@/lib/guardrails/origin";
import { checkRateLimit, hashRateLimitKey } from "@/lib/guardrails/rate-limit";
import { getClientIp, readJsonBody } from "@/lib/guardrails/request";
import { verifyTurnstile } from "@/lib/guardrails/turnstile";
import { logServerEvent } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  if (error && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && /^[A-Za-z0-9_]{1,40}$/.test(code)) return code;
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string" && /^[A-Za-z0-9_]{1,40}$/.test(name)) return name;
  }
  return "unknown";
}

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  const body = await readJsonBody(request, BOOKING_BODY_MAX_BYTES);
  if (!body.ok) return json({ ok: false, error: body.code }, body.status);

  const parsed = bookingInputSchema.safeParse(body.data);
  if (!parsed.success) return json({ ok: false, error: "invalid_input" }, 400);

  const input = parsed.data;
  if (input.website) return json({ ok: false, error: "invalid_input" }, 400);
  if (Date.now() - input.startedAt < BOOKING_FORM_MIN_SUBMIT_MS) {
    return json({ ok: false, error: "too_fast" }, 400);
  }

  let config;
  try {
    config = getConfig();
  } catch {
    logServerEvent("booking_config_invalid");
    return json({ ok: false, error: "service_unavailable" }, 503);
  }

  const ip = getClientIp(request);
  const windowMs = config.RATE_LIMIT_WINDOW_SECONDS * 1_000;

  const ipLimit = checkRateLimit(
    `booking:ip:${hashRateLimitKey(ip)}`,
    config.RATE_LIMIT_MAX_REQUESTS,
    windowMs,
  );
  if (!ipLimit.allowed) {
    return json({ ok: false, error: "rate_limited" }, 429, {
      "Retry-After": String(ipLimit.retryAfterSeconds),
    });
  }

  const emailLimit = checkRateLimit(
    `booking:email:${hashRateLimitKey(input.email)}`,
    BOOKING_EMAIL_RATE_LIMIT,
    windowMs,
  );
  if (!emailLimit.allowed) {
    return json({ ok: false, error: "rate_limited" }, 429, {
      "Retry-After": String(emailLimit.retryAfterSeconds),
    });
  }

  try {
    const verified = await verifyTurnstile(
      input.turnstileToken,
      ip,
      config.TURNSTILE_SECRET_KEY ?? "",
      BOOKING_TURNSTILE_ACTION,
    );
    if (!verified) return json({ ok: false, error: "verification_failed" }, 403);
  } catch {
    logServerEvent("booking_turnstile_unavailable");
    return json({ ok: false, error: "verification_unavailable" }, 503);
  }

  try {
    const result = await bookDiscoveryCall({
      requestId: input.requestId,
      slotId: input.slotId,
      name: input.name,
      email: input.email,
      notes: input.notes,
      timezone: input.timezone,
    });

    return json({
      ok: true,
      booking: {
        start: result.booking.slotStart.toISOString(),
        end: result.booking.slotEnd.toISOString(),
        timezone: result.booking.timezone,
        meetLink: result.booking.meetLink ?? null,
        calendarLink: result.booking.calendarLink ?? null,
      },
      confirmationEmailSent: result.confirmationEmailSent,
    });
  } catch (error) {
    if (error instanceof SlotTakenError || error instanceof SlotUnavailableError) {
      return json({ ok: false, error: "slot_unavailable" }, 409);
    }

    if (error instanceof InvalidSlotError) {
      return json({ ok: false, error: "invalid_slot" }, 400);
    }

    if (error instanceof BookingTimeZoneError) {
      return json({ ok: false, error: "invalid_timezone" }, 400);
    }

    if (
      error instanceof BookingNotConfiguredError ||
      error instanceof BookingStoreNotConfiguredError
    ) {
      logServerEvent("booking_not_configured");
      await alertTeam("booking_failed", { code: "not_configured" });
      return json({ ok: false, error: "booking_unavailable" }, 503);
    }

    if (error instanceof BookingFailedError) {
      logServerEvent("booking_failed", { code: error.code });
      await alertTeam("booking_failed", { code: error.code });
      return json({ ok: false, error: "booking_failed" }, 503);
    }

    logServerEvent("booking_unexpected_failure", { code: errorCode(error) });
    await alertTeam("booking_failed", { code: errorCode(error) });
    return json({ ok: false, error: "service_unavailable" }, 503);
  }
}
