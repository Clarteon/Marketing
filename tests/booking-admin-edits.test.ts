import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelBooking,
  rescheduleBooking,
  updateBookingDetails,
} from "@/lib/booking/admin-service";
import { BookingFailedError, InvalidSlotError, SlotUnavailableError } from "@/lib/booking/errors";
import { generateSlots } from "@/lib/booking/slots";
import {
  BookingNotCancellableError,
  BookingNotFoundError,
  SlotTakenError,
} from "@/lib/booking/store";
import type { BookingRecord, CalendarProvider } from "@/lib/booking/types";

const NOW = new Date("2026-10-19T00:00:00.000Z");
const [FIRST_SLOT, SECOND_SLOT] = generateSlots({ now: NOW, busy: [] });

const REQUEST_ID = "00000000-0000-4000-8000-000000000001";

const alertTeam = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/alerts", () => ({ alertTeam }));

function confirmedBooking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    requestId: REQUEST_ID,
    slotStart: new Date(FIRST_SLOT.start),
    slotEnd: new Date(FIRST_SLOT.end),
    name: "Ada Lovelace",
    email: "ada@example.com",
    notes: "Reporting takes too long.",
    timezone: "Asia/Manila",
    status: "confirmed",
    googleEventId: "event-1",
    meetLink: "https://meet.google.com/abc-defg-hij",
    createdAt: new Date("2026-10-18T02:00:00.000Z"),
    confirmedAt: new Date("2026-10-18T02:01:00.000Z"),
    ...overrides,
  };
}

function createFakeStore(record: BookingRecord | undefined) {
  let current = record;
  return {
    getByRequestId: vi.fn(async (requestId: string) =>
      current?.requestId === requestId ? current : undefined,
    ),
    getActiveBySlotStart: vi.fn(async () => current),
    updateBookingDetails: vi.fn(async (_requestId: string, patch: Record<string, unknown>) => {
      if (!current) throw new BookingNotFoundError();
      current = { ...current, ...patch } as BookingRecord;
      return current;
    }),
    rescheduleBooking: vi.fn(async (_requestId: string, start: Date, end: Date) => {
      if (!current) throw new BookingNotFoundError();
      current = { ...current, slotStart: start, slotEnd: end };
      return current;
    }),
    cancelBooking: vi.fn(async () => {
      if (!current) throw new BookingNotFoundError();
      if (current.status !== "confirmed") throw new BookingNotCancellableError(current.status);
      current = { ...current, status: "cancelled", cancelledAt: new Date() };
      return current;
    }),
    restoreConfirmed: vi.fn(async () => {
      if (!current) throw new BookingNotFoundError();
      current = { ...current, status: "confirmed", cancelledAt: undefined };
      return current;
    }),
    current: () => current,
  };
}

function createFakeCalendar(overrides: Partial<CalendarProvider> = {}) {
  return {
    getBusyIntervals: vi.fn(async () => []),
    findEventByRequestId: vi.fn(async () => undefined),
    createEvent: vi.fn(async () => ({
      id: "event-1",
      meetLink: "https://meet.google.com/abc-defg-hij",
    })),
    updateEvent: vi.fn(async () => {}),
    deleteEvent: vi.fn(async () => {}),
    ...overrides,
  } as CalendarProvider;
}

beforeEach(() => {
  alertTeam.mockClear();
});

describe("updateBookingDetails", () => {
  it("saves the patch through the store", async () => {
    const store = createFakeStore(confirmedBooking());

    const updated = await updateBookingDetails(
      REQUEST_ID,
      { name: "Grace Hopper", notes: null },
      { store },
    );

    expect(store.updateBookingDetails).toHaveBeenCalledWith(REQUEST_ID, {
      name: "Grace Hopper",
      notes: null,
    });
    expect(updated.name).toBe("Grace Hopper");
    expect(updated.notes).toBeNull();
  });

  it("fails when the booking does not exist", async () => {
    const store = createFakeStore(undefined);

    await expect(
      updateBookingDetails(REQUEST_ID, { name: "Grace Hopper" }, { store }),
    ).rejects.toBeInstanceOf(BookingNotFoundError);
  });
});

describe("rescheduleBooking", () => {
  it("moves the row and the Google event to the new time", async () => {
    const store = createFakeStore(confirmedBooking());
    const calendar = createFakeCalendar();

    const moved = await rescheduleBooking(REQUEST_ID, SECOND_SLOT.id, {
      store,
      calendar,
      now: NOW,
    });

    expect(moved.slotStart.toISOString()).toBe(new Date(SECOND_SLOT.start).toISOString());
    expect(store.rescheduleBooking).toHaveBeenCalledOnce();
    expect(calendar.updateEvent).toHaveBeenCalledWith({
      requestId: REQUEST_ID,
      start: new Date(SECOND_SLOT.start),
      end: new Date(SECOND_SLOT.end),
    });
  });

  it("leaves the calendar alone for a booking without an event", async () => {
    const store = createFakeStore(
      confirmedBooking({ googleEventId: undefined, status: "pending" }),
    );
    const calendar = createFakeCalendar();

    await rescheduleBooking(REQUEST_ID, SECOND_SLOT.id, { store, calendar, now: NOW });

    expect(calendar.updateEvent).not.toHaveBeenCalled();
    expect(store.rescheduleBooking).toHaveBeenCalledOnce();
  });

  it("refuses a slot another booking already holds", async () => {
    const store = createFakeStore(confirmedBooking());
    store.getActiveBySlotStart.mockResolvedValueOnce(
      confirmedBooking({ requestId: "00000000-0000-4000-8000-000000000002" }),
    );
    const calendar = createFakeCalendar();

    await expect(
      rescheduleBooking(REQUEST_ID, SECOND_SLOT.id, { store, calendar, now: NOW }),
    ).rejects.toBeInstanceOf(SlotTakenError);
    expect(calendar.updateEvent).not.toHaveBeenCalled();
    expect(store.rescheduleBooking).not.toHaveBeenCalled();
  });

  it("refuses a slot that overlaps a busy interval", async () => {
    const store = createFakeStore(confirmedBooking());
    const calendar = createFakeCalendar({
      getBusyIntervals: vi.fn(async () => [
        { start: new Date(SECOND_SLOT.start), end: new Date(SECOND_SLOT.end) },
      ]),
    });

    await expect(
      rescheduleBooking(REQUEST_ID, SECOND_SLOT.id, { store, calendar, now: NOW }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
    expect(store.rescheduleBooking).not.toHaveBeenCalled();
  });

  it("refuses a malformed slot id", async () => {
    const store = createFakeStore(confirmedBooking());
    const calendar = createFakeCalendar();

    await expect(
      rescheduleBooking(REQUEST_ID, "not-a-slot", { store, calendar, now: NOW }),
    ).rejects.toBeInstanceOf(InvalidSlotError);
    expect(store.rescheduleBooking).not.toHaveBeenCalled();
  });

  it("fails before touching the row when the free/busy check errors", async () => {
    const store = createFakeStore(confirmedBooking());
    const calendar = createFakeCalendar({
      getBusyIntervals: vi.fn(async () => {
        throw new Error("calendar down");
      }),
    });

    await expect(
      rescheduleBooking(REQUEST_ID, SECOND_SLOT.id, { store, calendar, now: NOW }),
    ).rejects.toMatchObject({ name: "BookingFailedError", code: "calendar_recheck" });
    expect(store.rescheduleBooking).not.toHaveBeenCalled();
  });

  it("rolls the row back when the Google event cannot move", async () => {
    const original = confirmedBooking();
    const store = createFakeStore(original);
    const calendar = createFakeCalendar({
      updateEvent: vi.fn(async () => {
        throw new Error("google down");
      }),
    });

    await expect(
      rescheduleBooking(REQUEST_ID, SECOND_SLOT.id, { store, calendar, now: NOW }),
    ).rejects.toMatchObject({ name: "BookingFailedError", code: "calendar_update" });

    expect(store.rescheduleBooking).toHaveBeenCalledTimes(2);
    const [firstId, rollbackStart] = store.rescheduleBooking.mock.calls[1];
    expect(firstId).toBe(REQUEST_ID);
    expect(rollbackStart.toISOString()).toBe(original.slotStart.toISOString());
    expect(store.current()?.slotStart.toISOString()).toBe(original.slotStart.toISOString());
  });

  it("alerts the team when even the rollback fails", async () => {
    const store = createFakeStore(confirmedBooking());
    store.rescheduleBooking
      .mockResolvedValueOnce(confirmedBooking())
      .mockRejectedValueOnce(new Error("db down"));
    const calendar = createFakeCalendar({
      updateEvent: vi.fn(async () => {
        throw new Error("google down");
      }),
    });

    await expect(
      rescheduleBooking(REQUEST_ID, SECOND_SLOT.id, { store, calendar, now: NOW }),
    ).rejects.toBeInstanceOf(BookingFailedError);
    expect(alertTeam).toHaveBeenCalledWith("booking_failed", { code: "reschedule_drift" });
  });

  it("fails when the booking does not exist", async () => {
    const store = createFakeStore(undefined);
    const calendar = createFakeCalendar();

    await expect(
      rescheduleBooking(REQUEST_ID, SECOND_SLOT.id, { store, calendar, now: NOW }),
    ).rejects.toBeInstanceOf(BookingNotFoundError);
  });
});

describe("cancelBooking", () => {
  it("marks the row cancelled and removes the calendar invite", async () => {
    const store = createFakeStore(confirmedBooking());
    const calendar = createFakeCalendar();

    const cancelled = await cancelBooking(REQUEST_ID, { store, calendar });

    expect(cancelled.status).toBe("cancelled");
    expect(store.cancelBooking).toHaveBeenCalledWith(REQUEST_ID);
    expect(calendar.deleteEvent).toHaveBeenCalledWith(REQUEST_ID);
  });

  it("frees the slot without calling Google when the booking has no event", async () => {
    const store = createFakeStore(confirmedBooking({ googleEventId: undefined }));
    const calendar = createFakeCalendar();

    const cancelled = await cancelBooking(REQUEST_ID, { store, calendar });

    expect(cancelled.status).toBe("cancelled");
    expect(calendar.deleteEvent).not.toHaveBeenCalled();
  });

  it("refuses a booking that is already cancelled", async () => {
    const store = createFakeStore(confirmedBooking({ status: "cancelled" }));
    const calendar = createFakeCalendar();

    await expect(cancelBooking(REQUEST_ID, { store, calendar })).rejects.toBeInstanceOf(
      BookingNotCancellableError,
    );
    expect(store.cancelBooking).not.toHaveBeenCalled();
    expect(calendar.deleteEvent).not.toHaveBeenCalled();
  });

  it("refuses a pending hold", async () => {
    const store = createFakeStore(
      confirmedBooking({ status: "pending", googleEventId: undefined }),
    );
    const calendar = createFakeCalendar();

    await expect(cancelBooking(REQUEST_ID, { store, calendar })).rejects.toBeInstanceOf(
      BookingNotCancellableError,
    );
    expect(store.cancelBooking).not.toHaveBeenCalled();
  });

  it("fails when the booking does not exist", async () => {
    const store = createFakeStore(undefined);
    const calendar = createFakeCalendar();

    await expect(cancelBooking(REQUEST_ID, { store, calendar })).rejects.toBeInstanceOf(
      BookingNotFoundError,
    );
  });

  it("puts the row back when the invitation cannot be removed", async () => {
    const store = createFakeStore(confirmedBooking());
    const calendar = createFakeCalendar({
      deleteEvent: vi.fn(async () => {
        throw new Error("google down");
      }),
    });

    await expect(cancelBooking(REQUEST_ID, { store, calendar })).rejects.toMatchObject({
      name: "BookingFailedError",
      code: "calendar_delete",
    });

    expect(store.restoreConfirmed).toHaveBeenCalledWith(REQUEST_ID);
    expect(store.current()?.status).toBe("confirmed");
    expect(alertTeam).not.toHaveBeenCalled();
  });

  it("alerts the team when even the row cannot be put back", async () => {
    const store = createFakeStore(confirmedBooking());
    store.restoreConfirmed.mockRejectedValueOnce(new Error("db down"));
    const calendar = createFakeCalendar({
      deleteEvent: vi.fn(async () => {
        throw new Error("google down");
      }),
    });

    await expect(cancelBooking(REQUEST_ID, { store, calendar })).rejects.toMatchObject({
      name: "BookingFailedError",
      code: "calendar_delete",
    });
    expect(alertTeam).toHaveBeenCalledWith("booking_failed", { code: "cancel_drift" });
  });
});

describe("a cancelled booking is read-only", () => {
  it("refuses guest detail edits", async () => {
    const store = createFakeStore(confirmedBooking({ status: "cancelled" }));

    await expect(
      updateBookingDetails(REQUEST_ID, { name: "Grace Hopper" }, { store }),
    ).rejects.toBeInstanceOf(BookingNotCancellableError);
    expect(store.updateBookingDetails).not.toHaveBeenCalled();
  });

  it("refuses a reschedule", async () => {
    const store = createFakeStore(confirmedBooking({ status: "cancelled" }));
    const calendar = createFakeCalendar();

    await expect(
      rescheduleBooking(REQUEST_ID, SECOND_SLOT.id, { store, calendar, now: NOW }),
    ).rejects.toBeInstanceOf(BookingNotCancellableError);
    expect(store.rescheduleBooking).not.toHaveBeenCalled();
    expect(calendar.updateEvent).not.toHaveBeenCalled();
  });
});
