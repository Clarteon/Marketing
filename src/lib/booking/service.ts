import "server-only";
import { logServerEvent } from "@/lib/log";
import { bookingRules } from "./config";
import {
  BookingFailedError,
  BookingTimeZoneError,
  GoogleCalendarError,
  SlotUnavailableError,
} from "./errors";
import { createGoogleCalendarProvider } from "./google";
import { decodeSlotId, generateSlots, slotOverlapsBusy, validateSlot } from "./slots";
import { sendBookingEmails } from "./send-booking-emails";
import { getBookingStore, type BookingStore } from "./store";
import { isValidTimeZone } from "./time";
import type {
  Availability,
  BookingEmailResult,
  BookingRecord,
  BusyInterval,
  CalendarEvent,
  CalendarProvider,
} from "./types";

export interface BookingServiceDependencies {
  calendar?: CalendarProvider;
  store?: BookingStore;
  emailSender?: (booking: BookingRecord) => Promise<BookingEmailResult>;
  now?: Date;
}

export interface BookingResult {
  booking: BookingRecord;
  confirmationEmailSent: boolean;
  teamEmailSent: boolean;
}

const inFlight = new Map<string, Promise<BookingResult>>();

function providerErrorCode(error: unknown): string {
  if (error instanceof GoogleCalendarError) return error.code;
  if (error instanceof BookingFailedError) return error.code;
  return "unknown";
}

async function findExistingEvent(
  calendar: CalendarProvider,
  requestId: string,
  around: Date,
): Promise<CalendarEvent | undefined> {
  return calendar.findEventByRequestId(requestId, around);
}

function storedEvent(booking: BookingRecord): CalendarEvent | undefined {
  if (!booking.googleEventId || !booking.meetLink) return undefined;
  return {
    id: booking.googleEventId,
    meetLink: booking.meetLink,
    calendarLink: booking.calendarLink,
  };
}

async function sendConfirmation(
  booking: BookingRecord,
  dependencies: BookingServiceDependencies,
): Promise<{ confirmationEmailSent: boolean; teamEmailSent: boolean }> {
  try {
    const emailSender = dependencies.emailSender ?? sendBookingEmails;
    const result = await emailSender(booking);
    return { confirmationEmailSent: result.visitor, teamEmailSent: result.team };
  } catch (error) {
    logServerEvent("booking_email_send_failed", {
      bookingId: booking.requestId,
      code: providerErrorCode(error),
    });
    return { confirmationEmailSent: false, teamEmailSent: false };
  }
}

async function confirmAndSend(
  store: BookingStore,
  booking: BookingRecord,
  event: CalendarEvent,
  dependencies: BookingServiceDependencies,
): Promise<BookingResult> {
  const confirmed = await store.confirm(booking.requestId, event);
  const email = await sendConfirmation(confirmed, dependencies);
  return { booking: confirmed, ...email };
}

async function performBooking(
  input: {
    requestId: string;
    slotId: string;
    name: string;
    email: string;
    notes?: string;
    timezone: string;
  },
  dependencies: BookingServiceDependencies,
): Promise<BookingResult> {
  if (!isValidTimeZone(input.timezone)) throw new BookingTimeZoneError();
  const now = dependencies.now ?? new Date();
  const slot = decodeSlotId(input.slotId);
  validateSlot(slot, now);

  const store = dependencies.store ?? getBookingStore();
  const calendar = dependencies.calendar ?? createGoogleCalendarProvider();

  let existing: BookingRecord | undefined;
  try {
    existing = await store.getByRequestId(input.requestId);
  } catch (error) {
    throw new BookingFailedError(`store_get_${providerErrorCode(error)}`);
  }

  if (existing?.status === "confirmed") {
    const email = await sendConfirmation(existing, dependencies);
    return { booking: existing, ...email };
  }

  if (existing) {
    const alreadyStored = storedEvent(existing);
    if (alreadyStored) return confirmAndSend(store, existing, alreadyStored, dependencies);

    // Search even when the request asks for a different slot. An event may
    // already exist from an attempt whose response was lost; confirming it is
    // safer than deleting the hold and inviting the visitor twice.
    let found: CalendarEvent | undefined;
    try {
      found = await findExistingEvent(calendar, input.requestId, existing.slotStart);
    } catch (error) {
      // Keep the pending hold. A retry can find an event that was created
      // before a lost response; deleting the hold here risks a duplicate.
      logServerEvent("booking_event_lookup_failed", {
        bookingId: input.requestId,
        code: providerErrorCode(error),
      });
      throw new BookingFailedError("calendar_lookup");
    }

    if (found) return confirmAndSend(store, existing, found, dependencies);

    // A request ID belongs to one slot. The browser resets it when the visitor
    // chooses another time, so a mismatch is a stale or replayed request. Do
    // not release and reuse the hold: that could create a second event while
    // another server instance is still working on the first one.
    if (existing.slotStart.getTime() !== slot.start.getTime()) {
      throw new SlotUnavailableError();
    }
  }

  if (!existing) {
    const saved = await store.createPending({
      requestId: input.requestId,
      slotStart: slot.start,
      slotEnd: slot.end,
      name: input.name,
      email: input.email,
      notes: input.notes,
      timezone: input.timezone,
    });

    existing = saved.booking;
    if (!saved.created) {
      if (existing.status === "confirmed") {
        const email = await sendConfirmation(existing, dependencies);
        return { booking: existing, ...email };
      }

      const alreadyStored = storedEvent(existing);
      if (alreadyStored) return confirmAndSend(store, existing, alreadyStored, dependencies);

      let found: CalendarEvent | undefined;
      try {
        found = await findExistingEvent(calendar, input.requestId, existing.slotStart);
      } catch (error) {
        logServerEvent("booking_event_lookup_failed", {
          bookingId: input.requestId,
          code: providerErrorCode(error),
        });
        throw new BookingFailedError("calendar_lookup");
      }
      if (found) return confirmAndSend(store, existing, found, dependencies);

      // The insert lost a race, and the row that won belongs to another slot.
      // Never release another instance's hold or reuse its request ID.
      if (existing.slotStart.getTime() !== slot.start.getTime()) {
        throw new SlotUnavailableError();
      }
    }
  }

  // Recheck free and busy immediately before creating the event. This catches
  // a meeting added to the calendar after the visitor loaded the slots.
  let busy: BusyInterval[];
  try {
    const bufferMs = bookingRules.bufferMinutes * 60 * 1_000;
    busy = await calendar.getBusyIntervals(
      new Date(slot.start.getTime() - bufferMs),
      new Date(slot.end.getTime() + bufferMs),
    );
  } catch (error) {
    // Keep the hold. Another instance may already be creating an event for
    // this request, and deleting the row could orphan that event.
    logServerEvent("booking_recheck_failed", {
      bookingId: input.requestId,
      code: providerErrorCode(error),
    });
    throw new BookingFailedError("calendar_recheck");
  }

  if (slotOverlapsBusy(slot.start, slot.end, busy, bookingRules.bufferMinutes)) {
    // Keep the hold too. It expires with the stale-hold cleanup, and deleting
    // it here could erase a row another instance is about to confirm.
    throw new SlotUnavailableError();
  }

  let event: CalendarEvent;
  try {
    event = await calendar.createEvent({
      requestId: input.requestId,
      start: slot.start,
      end: slot.end,
      name: input.name,
      email: input.email,
      notes: input.notes,
    });
  } catch (error) {
    // Leave the hold in place. A network or 5xx failure may have created the
    // event even though we did not receive the response. A retry searches by
    // the private request ID before creating anything else.
    logServerEvent("booking_event_create_failed", {
      bookingId: input.requestId,
      code: providerErrorCode(error),
    });
    throw new BookingFailedError("calendar_create");
  }

  try {
    await store.markEventCreated(input.requestId, event);
  } catch (error) {
    // The event exists. Continue to confirmation; if that also fails, the
    // retry path searches Google by the private request ID.
    logServerEvent("booking_event_store_failed", {
      bookingId: input.requestId,
      code: providerErrorCode(error),
    });
  }

  let confirmed: BookingRecord;
  try {
    confirmed = await store.confirm(input.requestId, event);
  } catch (error) {
    // The event exists. Keep the pending record so a retry finds it and tries
    // the confirmation again.
    logServerEvent("booking_confirm_failed", {
      bookingId: input.requestId,
      code: providerErrorCode(error),
    });
    throw new BookingFailedError("store_confirm");
  }

  const email = await sendConfirmation(confirmed, dependencies);
  return { booking: confirmed, ...email };
}

export function bookDiscoveryCall(
  input: {
    requestId: string;
    slotId: string;
    name: string;
    email: string;
    notes?: string;
    timezone: string;
  },
  dependencies: BookingServiceDependencies = {},
): Promise<BookingResult> {
  const pending = inFlight.get(input.requestId);
  if (pending) return pending;

  const operation = performBooking(input, dependencies).finally(() => {
    inFlight.delete(input.requestId);
  });
  inFlight.set(input.requestId, operation);
  return operation;
}

export async function getAvailability(
  options: {
    timezone?: string;
    calendar?: CalendarProvider;
    now?: Date;
  } = {},
): Promise<Availability> {
  const timezone = options.timezone ?? bookingRules.timezone;
  if (!isValidTimeZone(timezone)) throw new BookingTimeZoneError();

  const calendar = options.calendar ?? createGoogleCalendarProvider();
  const now = options.now ?? new Date();
  const bufferMs = bookingRules.bufferMinutes * 60 * 1_000;
  const earliest = new Date(now.getTime() + bookingRules.minNoticeHours * 60 * 60 * 1_000);
  const latest = new Date(now.getTime() + bookingRules.horizonDays * 24 * 60 * 60 * 1_000);

  const busy = await calendar.getBusyIntervals(
    new Date(earliest.getTime() - bufferMs),
    new Date(latest.getTime() + bufferMs),
  );
  const slots = generateSlots({ busy, now });

  return { timezone, slots };
}

export async function getAvailabilityForVisitor(timezone: string): Promise<Availability> {
  return getAvailability({ timezone });
}

export function resetBookingLocksForTests(): void {
  inFlight.clear();
}
