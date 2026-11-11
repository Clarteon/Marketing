import { alertTeam } from "@/lib/alerts";
import {
  cancelBooking,
  rescheduleBooking,
  updateBookingDetails,
} from "@/lib/booking/admin-service";
import { BookingFailedError, InvalidSlotError, SlotUnavailableError } from "@/lib/booking/errors";
import {
  BookingNotCancellableError,
  BookingNotFoundError,
  BookingStoreNotConfiguredError,
  SlotTakenError,
} from "@/lib/booking/store";
import type { BookingDetailsPatch, BookingRecord } from "@/lib/booking/types";
import { ADMIN_ACTOR, isAdminRequest } from "@/lib/admin/auth";
import { adminBookingUpdateSchema } from "@/lib/admin/schema";
import { isAllowedOrigin } from "@/lib/guardrails/origin";
import { checkRateLimit, hashRateLimitKey } from "@/lib/guardrails/rate-limit";
import { getClientIp, readJsonBody } from "@/lib/guardrails/request";
import { logServerEvent } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 30;

const EDIT_BODY_MAX_BYTES = 8 * 1_024;
const EDIT_REQUESTS = 30;
const EDIT_WINDOW_MS = 60_000;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function serialize(booking: BookingRecord) {
  return {
    requestId: booking.requestId,
    slotStart: booking.slotStart.toISOString(),
    slotEnd: booking.slotEnd.toISOString(),
    name: booking.name,
    email: booking.email,
    notes: booking.notes ?? null,
    timezone: booking.timezone,
    status: booking.status,
    meetLink: booking.meetLink ?? null,
    calendarLink: booking.calendarLink ?? null,
    createdAt: booking.createdAt.toISOString(),
    confirmedAt: booking.confirmedAt?.toISOString() ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return json({ ok: false, error: "origin_not_allowed" }, 403);
  }
  if (!isAdminRequest(request)) {
    return json({ ok: false, error: "not_signed_in" }, 401);
  }

  const rate = checkRateLimit(
    `admin-booking-edit:${hashRateLimitKey(getClientIp(request))}`,
    EDIT_REQUESTS,
    EDIT_WINDOW_MS,
  );
  if (!rate.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rate.retryAfterSeconds),
        },
      },
    );
  }

  const body = await readJsonBody(request, EDIT_BODY_MAX_BYTES);
  if (!body.ok) return json({ ok: false, error: body.code }, body.status);

  const parsed = adminBookingUpdateSchema.safeParse(body.data);
  if (!parsed.success) return json({ ok: false, error: "invalid_request" }, 400);

  const { requestId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    return json({ ok: false, error: "invalid_request" }, 400);
  }

  try {
    if (parsed.data.cancel) {
      const booking = await cancelBooking(requestId);
      logServerEvent("admin_booking_cancelled", { actor: ADMIN_ACTOR, bookingId: requestId });
      return json({ ok: true, booking: serialize(booking) });
    }

    if (parsed.data.slotId) {
      const booking = await rescheduleBooking(requestId, parsed.data.slotId);
      logServerEvent("admin_booking_rescheduled", { actor: ADMIN_ACTOR, bookingId: requestId });
      return json({ ok: true, booking: serialize(booking) });
    }

    const patch: BookingDetailsPatch = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.email !== undefined) patch.email = parsed.data.email;
    if (parsed.data.timezone !== undefined) patch.timezone = parsed.data.timezone;
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;

    const booking = await updateBookingDetails(requestId, patch);
    logServerEvent("admin_booking_details_updated", { actor: ADMIN_ACTOR, bookingId: requestId });
    return json({ ok: true, booking: serialize(booking) });
  } catch (error) {
    if (error instanceof BookingNotFoundError) {
      return json({ ok: false, error: "booking_not_found" }, 404);
    }
    if (error instanceof BookingStoreNotConfiguredError) {
      return json({ ok: false, error: "booking_store_unavailable" }, 503);
    }
    if (error instanceof BookingNotCancellableError) {
      return json({ ok: false, error: "booking_not_cancellable" }, 409);
    }
    if (error instanceof InvalidSlotError) {
      return json({ ok: false, error: "invalid_slot" }, 400);
    }
    if (error instanceof SlotTakenError || error instanceof SlotUnavailableError) {
      return json({ ok: false, error: "slot_unavailable" }, 409);
    }

    if (error instanceof BookingFailedError) {
      logServerEvent("admin_booking_edit_failed", { code: error.code });
      await alertTeam("booking_failed", { code: error.code });
      return json({ ok: false, error: "booking_edit_failed" }, 503);
    }

    logServerEvent("admin_booking_edit_failed", {
      code: error instanceof Error ? error.name : "unknown",
    });
    await alertTeam("booking_failed", { code: "admin_edit" });
    return json({ ok: false, error: "booking_edit_failed" }, 500);
  }
}
