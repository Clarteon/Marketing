import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookingFailedError, InvalidSlotError, SlotUnavailableError } from "@/lib/booking/errors";
import {
  bookDiscoveryCall,
  getAvailability,
  resetBookingLocksForTests,
} from "@/lib/booking/service";
import { generateSlots } from "@/lib/booking/slots";
import type { BookingStore } from "@/lib/booking/store";
import type {
  BookingRecord,
  CalendarEvent,
  CalendarProvider,
  NewBooking,
} from "@/lib/booking/types";

const NOW = new Date("2026-10-19T00:00:00.000Z");
const [VALID_SLOT] = generateSlots({ now: NOW, busy: [] });

function createFakeStore(initial?: BookingRecord) {
  let record = initial;

  const store = {
    createPending: vi.fn(async (input: NewBooking) => {
      if (record) return { booking: record, created: false };
      record = {
        ...input,
        status: "pending",
        createdAt: new Date("2026-10-19T00:00:00.000Z"),
      };
      return { booking: record, created: true };
    }),
    getByRequestId: vi.fn(async (requestId: string) =>
      record?.requestId === requestId ? record : undefined,
    ),
    getActiveBySlotStart: vi.fn(async () => record),
    markEventCreated: vi.fn(async (_requestId: string, event: CalendarEvent) => {
      if (record) {
        record = {
          ...record,
          googleEventId: event.id,
          meetLink: event.meetLink,
          calendarLink: event.calendarLink,
        };
      }
    }),
    confirm: vi.fn(async (_requestId: string, event: CalendarEvent) => {
      if (!record) throw new Error("No booking to confirm.");
      record = {
        ...record,
        status: "confirmed",
        googleEventId: event.id,
        meetLink: event.meetLink,
        calendarLink: event.calendarLink,
        confirmedAt: new Date("2026-10-19T00:00:00.000Z"),
      };
      return record;
    }),
    deletePending: vi.fn(async () => {
      if (record?.status === "pending") record = undefined;
    }),
  } as unknown as BookingStore;

  return { store, current: () => record };
}

function createFakeCalendar(overrides: Partial<CalendarProvider> = {}): CalendarProvider {
  return {
    getBusyIntervals: vi.fn(async () => []),
    findEventByRequestId: vi.fn(async () => undefined),
    createEvent: vi.fn(async () => ({
      id: "event-1",
      meetLink: "https://meet.google.com/abc-defg-hij",
      calendarLink: "https://calendar.google.com/event?eid=x",
    })),
    ...overrides,
  } as CalendarProvider;
}

function bookingInput(overrides: Record<string, unknown> = {}) {
  return {
    requestId: crypto.randomUUID(),
    slotId: VALID_SLOT.id,
    name: "Ada Lovelace",
    email: "ada@example.com",
    notes: "Manual reporting takes too long every week.",
    timezone: "Asia/Manila",
    ...overrides,
  };
}

describe("booking service", () => {
  beforeEach(() => {
    resetBookingLocksForTests();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates the calendar event, confirms the booking and sends the email", async () => {
    const { store, current } = createFakeStore();
    const calendar = createFakeCalendar();
    const emailSender = vi.fn(async () => ({ visitor: true, team: true }));
    const input = bookingInput();

    const result = await bookDiscoveryCall(input, {
      store,
      calendar,
      emailSender,
      now: NOW,
    });

    expect(result.booking.status).toBe("confirmed");
    expect(result.booking.meetLink).toBe("https://meet.google.com/abc-defg-hij");
    expect(result.confirmationEmailSent).toBe(true);
    expect(calendar.createEvent).toHaveBeenCalledOnce();
    expect(emailSender).toHaveBeenCalledOnce();
    expect(current()?.status).toBe("confirmed");
  });

  it("returns the confirmed booking on a retry without creating a second event", async () => {
    const { store } = createFakeStore();
    const calendar = createFakeCalendar();
    const emailSender = vi.fn(async () => ({ visitor: true, team: true }));
    const input = bookingInput();

    const first = await bookDiscoveryCall(input, { store, calendar, emailSender, now: NOW });
    const second = await bookDiscoveryCall(input, { store, calendar, emailSender, now: NOW });

    expect(second.booking.requestId).toBe(first.booking.requestId);
    expect(second.booking.meetLink).toBe(first.booking.meetLink);
    expect(calendar.createEvent).toHaveBeenCalledOnce();
  });

  it("rejects a slot that is busy on the recheck and keeps the hold for cleanup", async () => {
    const { store, current } = createFakeStore();
    const calendar = createFakeCalendar({
      getBusyIntervals: vi.fn(async () => [
        { start: new Date(VALID_SLOT.start), end: new Date(VALID_SLOT.end) },
      ]),
    });

    await expect(
      bookDiscoveryCall(bookingInput(), {
        store,
        calendar,
        emailSender: vi.fn(),
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);

    expect(calendar.createEvent).not.toHaveBeenCalled();
    expect(store.deletePending).not.toHaveBeenCalled();
    expect(current()?.status).toBe("pending");
  });

  it("keeps the hold when event creation fails so a retry can find the event", async () => {
    const { store, current } = createFakeStore();
    const calendar = createFakeCalendar({
      createEvent: vi.fn(async () => {
        throw new Error("network");
      }),
    });

    await expect(
      bookDiscoveryCall(bookingInput(), {
        store,
        calendar,
        emailSender: vi.fn(),
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(BookingFailedError);

    expect(current()?.status).toBe("pending");
  });

  it("returns the booking even when the confirmation email fails", async () => {
    const { store } = createFakeStore();
    const calendar = createFakeCalendar();
    const emailSender = vi.fn(async () => {
      throw new Error("email down");
    });

    const result = await bookDiscoveryCall(bookingInput(), {
      store,
      calendar,
      emailSender,
      now: NOW,
    });

    expect(result.booking.status).toBe("confirmed");
    expect(result.confirmationEmailSent).toBe(false);
  });

  it("confirms a pending booking when the event already exists", async () => {
    const input = bookingInput();
    const existing: BookingRecord = {
      requestId: input.requestId,
      slotStart: new Date(VALID_SLOT.start),
      slotEnd: new Date(VALID_SLOT.end),
      name: input.name,
      email: input.email,
      notes: input.notes,
      timezone: input.timezone,
      status: "pending",
      createdAt: NOW,
    };
    const { store } = createFakeStore(existing);
    const calendar = createFakeCalendar({
      findEventByRequestId: vi.fn(async () => ({
        id: "event-existing",
        meetLink: "https://meet.google.com/abc-defg-hij",
      })),
    });

    const result = await bookDiscoveryCall(input, {
      store,
      calendar,
      emailSender: vi.fn(async () => ({ visitor: true, team: true })),
      now: NOW,
    });

    expect(calendar.createEvent).not.toHaveBeenCalled();
    expect(result.booking.googleEventId).toBe("event-existing");
  });

  it("rejects an invalid slot id before touching the store", async () => {
    const { store } = createFakeStore();
    const calendar = createFakeCalendar();

    await expect(
      bookDiscoveryCall(bookingInput({ slotId: "not-valid" }), {
        store,
        calendar,
        emailSender: vi.fn(),
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(InvalidSlotError);

    expect(store.getByRequestId).not.toHaveBeenCalled();
  });

  it("builds availability in the visitor timezone", async () => {
    const calendar = createFakeCalendar();
    const availability = await getAvailability({
      calendar,
      now: NOW,
      timezone: "Asia/Manila",
    });

    expect(availability.timezone).toBe("Asia/Manila");
    expect(availability.slots.length).toBeGreaterThan(0);
    expect(availability.slots[0].start).toBe("2026-10-20T01:00:00.000Z");
  });
});
