import "server-only";
import { alertTeam } from "@/lib/alerts";
import { logServerEvent } from "@/lib/log";
import { bookingRules } from "./config";
import { BookingFailedError, InvalidSlotError, SlotUnavailableError } from "./errors";
import { createGoogleCalendarProvider } from "./google";
import { decodeSlotId, slotOverlapsBusy, validateSlot } from "./slots";
import { BookingNotFoundError, SlotTakenError, getBookingStore, type BookingStore } from "./store";
import type { BookingDetailsPatch, BookingRecord, CalendarProvider } from "./types";

export interface AdminBookingDependencies {
  store?: Pick<
    BookingStore,
    "getByRequestId" | "getActiveBySlotStart" | "updateBookingDetails" | "rescheduleBooking"
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
