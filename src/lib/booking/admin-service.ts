import "server-only";
import { alertTeam } from "@/lib/alerts";
import { logServerEvent } from "@/lib/log";
import { bookingRules } from "./config";
import { BookingFailedError, InvalidSlotError, SlotUnavailableError } from "./errors";
import { createGoogleCalendarProvider } from "./google";
import { decodeSlotId, slotOverlapsBusy, validateSlot } from "./slots";
import {
  BookingNotCancellableError,
  BookingNotFoundError,
  SlotTakenError,
  getBookingStore,
  type BookingStore,
} from "./store";
import type { BookingDetailsPatch, BookingRecord, CalendarProvider } from "./types";

export interface AdminBookingDependencies {
  store?: Pick<
    BookingStore,
    | "getByRequestId"
    | "getActiveBySlotStart"
    | "updateBookingDetails"
    | "rescheduleBooking"
    | "cancelBooking"
    | "restoreConfirmed"
  >;
  calendar?: CalendarProvider;
  now?: Date;
}

type BookingStoreLike = NonNullable<AdminBookingDependencies["store"]>;

function getStore(dependencies: AdminBookingDependencies): BookingStoreLike {
  return dependencies.store ?? getBookingStore();
}

function getCalendar(dependencies: AdminBookingDependencies): CalendarProvider {
  return dependencies.calendar ?? createGoogleCalendarProvider();
}

export async function updateBookingDetails(
  requestId: string,
  patch: BookingDetailsPatch,
  dependencies: AdminBookingDependencies = {},
): Promise<BookingRecord> {
  const store = getStore(dependencies);

  const booking = await store.getByRequestId(requestId);
  if (!booking) throw new BookingNotFoundError();
  if (booking.status === "cancelled") throw new BookingNotCancellableError(booking.status);

  return store.updateBookingDetails(requestId, patch);
}

export async function rescheduleBooking(
  requestId: string,
  slotId: string,
  dependencies: AdminBookingDependencies = {},
): Promise<BookingRecord> {
  const store = getStore(dependencies);
  const calendar = getCalendar(dependencies);
  const now = dependencies.now ?? new Date();

  const booking = await store.getByRequestId(requestId);
  if (!booking) throw new BookingNotFoundError();
  if (booking.status === "cancelled") throw new BookingNotCancellableError(booking.status);

  const slot = decodeSlotId(slotId);
  try {
    validateSlot(slot, now);
  } catch {
    throw new InvalidSlotError();
  }

  const held = await store.getActiveBySlotStart(slot.start);
  if (held && held.requestId !== requestId) throw new SlotTakenError(held);

  let busy;
  try {
    const bufferMs = bookingRules.bufferMinutes * 60 * 1_000;
    busy = await calendar.getBusyIntervals(
      new Date(slot.start.getTime() - bufferMs),
      new Date(slot.end.getTime() + bufferMs),
    );
  } catch (error) {
    logServerEvent("admin_reschedule_recheck_failed", {
      bookingId: requestId,
      code: error instanceof Error ? error.name : "unknown",
    });
    throw new BookingFailedError("calendar_recheck");
  }

  if (slotOverlapsBusy(slot.start, slot.end, busy, bookingRules.bufferMinutes)) {
    throw new SlotUnavailableError();
  }

  const updated = await store.rescheduleBooking(requestId, slot.start, slot.end);

  // The row now holds the new time. Move the Google event to match; if that
  // fails, put the row back so the two never drift apart silently.
  if (booking.googleEventId) {
    try {
      await calendar.updateEvent({ requestId, start: slot.start, end: slot.end });
    } catch (error) {
      logServerEvent("admin_reschedule_event_update_failed", {
        bookingId: requestId,
        code: error instanceof Error ? error.name : "unknown",
      });

      try {
        await store.rescheduleBooking(requestId, booking.slotStart, booking.slotEnd);
      } catch (rollbackError) {
        logServerEvent("admin_reschedule_rollback_failed", {
          bookingId: requestId,
          code: rollbackError instanceof Error ? rollbackError.name : "unknown",
        });
        await alertTeam("booking_failed", { code: "reschedule_drift" });
      }

      throw new BookingFailedError("calendar_update");
    }
  }

  return updated;
}

export async function cancelBooking(
  requestId: string,
  dependencies: AdminBookingDependencies = {},
): Promise<BookingRecord> {
  const store = getStore(dependencies);
  const calendar = getCalendar(dependencies);

  const booking = await store.getByRequestId(requestId);
  if (!booking) throw new BookingNotFoundError();
  if (booking.status !== "confirmed") throw new BookingNotCancellableError(booking.status);

  const cancelled = await store.cancelBooking(requestId);

  // Free the record first: the partial unique index only covers live rows, so
  // the slot is bookable again the moment the status changes. Then remove the
  // invitation and let Google tell the guest.
  if (!booking.googleEventId) return cancelled;

  try {
    await calendar.deleteEvent(requestId);
  } catch (error) {
    logServerEvent("admin_cancel_event_delete_failed", {
      bookingId: requestId,
      code: error instanceof Error ? error.name : "unknown",
    });

    // The invite is still on the guest's calendar, so put the record back and
    // let the team try again rather than leaving the two states apart.
    try {
      await store.restoreConfirmed(requestId);
    } catch (rollbackError) {
      logServerEvent("admin_cancel_rollback_failed", {
        bookingId: requestId,
        code: rollbackError instanceof Error ? rollbackError.name : "unknown",
      });
      await alertTeam("booking_failed", { code: "cancel_drift" });
    }

    throw new BookingFailedError("calendar_delete");
  }

  return cancelled;
}
