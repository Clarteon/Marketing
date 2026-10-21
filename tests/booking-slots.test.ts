import { describe, expect, it } from "vitest";
import { bookingRules } from "@/lib/booking/config";
import { InvalidSlotError } from "@/lib/booking/errors";
import {
  decodeSlotId,
  encodeSlotId,
  generateSlots,
  slotOverlapsBusy,
  validateSlot,
} from "@/lib/booking/slots";
import { getZonedParts } from "@/lib/booking/time";

const NOW = new Date("2026-10-19T00:00:00.000Z"); // Monday, 08:00 in Manila

describe("booking slot generation", () => {
  it("starts after the 24-hour notice and uses 30-minute Manila working slots", () => {
    const slots = generateSlots({ now: NOW, busy: [] });

    expect(slots.length).toBeGreaterThan(80); // More than one working week of times.
    expect(slots.length).toBeLessThanOrEqual(bookingRules.maxSlots);
    expect(slots[0].start).toBe("2026-10-20T01:00:00.000Z"); // Tuesday 09:00 Manila
    expect(slots[0].end).toBe("2026-10-20T01:30:00.000Z");
    expect(new Date(slots[slots.length - 1].start).getTime()).toBeLessThanOrEqual(
      NOW.getTime() + bookingRules.horizonDays * 24 * 60 * 60 * 1_000,
    );

    for (const slot of slots) {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      expect(end.getTime() - start.getTime()).toBe(30 * 60 * 1_000);
      expect(start.getTime()).toBeGreaterThanOrEqual(NOW.getTime() + 24 * 60 * 60 * 1_000);

      const parts = getZonedParts(start, bookingRules.timezone);
      const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
      expect(bookingRules.workingDays).toContain(weekday);
      expect(parts.hour * 60 + parts.minute).toBeGreaterThanOrEqual(bookingRules.startMinutes);
      expect(parts.hour * 60 + parts.minute + bookingRules.slotMinutes).toBeLessThanOrEqual(
        bookingRules.endMinutes,
      );
      expect(parts.minute % 30).toBe(0);
    }
  });

  it("leaves a buffer around busy events and never overlaps them", () => {
    const busy = [
      {
        start: new Date("2026-10-20T02:00:00.000Z"), // Tuesday 10:00 Manila
        end: new Date("2026-10-20T03:00:00.000Z"), // Tuesday 11:00 Manila
      },
    ];
    const slots = generateSlots({ now: NOW, busy });
    const starts = slots.map((slot) => slot.start);

    expect(starts).toContain("2026-10-20T01:00:00.000Z"); // 09:00-09:30
    expect(starts).not.toContain("2026-10-20T01:30:00.000Z"); // ends inside the buffer
    expect(starts).not.toContain("2026-10-20T02:00:00.000Z");
    expect(starts).not.toContain("2026-10-20T02:30:00.000Z");
    expect(starts).not.toContain("2026-10-20T03:00:00.000Z"); // starts inside the buffer
    expect(starts).toContain("2026-10-20T03:30:00.000Z"); // 11:30-12:00

    for (const slot of slots) {
      expect(
        slotOverlapsBusy(
          new Date(slot.start),
          new Date(slot.end),
          busy,
          bookingRules.bufferMinutes,
        ),
      ).toBe(false);
    }
  });

  it("skips weekends", () => {
    const slots = generateSlots({ now: NOW, busy: [] });
    const weekendSlots = slots.filter((slot) => {
      const parts = getZonedParts(new Date(slot.start), bookingRules.timezone);
      const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
      return weekday === 0 || weekday === 6;
    });

    expect(weekendSlots).toHaveLength(0);
  });

  it("round-trips slot ids and rejects tampered ids", () => {
    const [slot] = generateSlots({ now: NOW, busy: [] });
    const decoded = decodeSlotId(slot.id);

    expect(decoded.start.toISOString()).toBe(slot.start);
    expect(decoded.end.toISOString()).toBe(slot.end);
    expect(() => decodeSlotId("not-a-valid-slot")).toThrow(InvalidSlotError);
    expect(() => decodeSlotId(`${slot.id}!`)).toThrow(InvalidSlotError);
  });

  it("validates a generated slot and rejects off-grid or weekend slots", () => {
    const [slot] = generateSlots({ now: NOW, busy: [] });
    expect(() => validateSlot(decodeSlotId(slot.id), NOW)).not.toThrow();

    const sunday = {
      start: new Date("2026-10-25T01:00:00.000Z"),
      end: new Date("2026-10-25T01:30:00.000Z"),
    };
    expect(() => validateSlot(sunday, NOW)).toThrow(InvalidSlotError);

    const offGrid = {
      start: new Date("2026-10-20T01:15:00.000Z"),
      end: new Date("2026-10-20T01:45:00.000Z"),
    };
    expect(() => validateSlot(offGrid, NOW)).toThrow(InvalidSlotError);

    const tooSoon = {
      start: new Date("2026-10-19T01:00:00.000Z"),
      end: new Date("2026-10-19T01:30:00.000Z"),
    };
    expect(() => validateSlot(tooSoon, NOW)).toThrow(InvalidSlotError);
  });

  it("returns no slots when the horizon is already closed", () => {
    expect(generateSlots({ now: NOW, busy: [], to: new Date(NOW.getTime() + 60_000) })).toEqual([]);
  });

  it("encodes the same interval to the same id", () => {
    const start = new Date("2026-10-20T01:00:00.000Z");
    const end = new Date("2026-10-20T01:30:00.000Z");
    expect(encodeSlotId(start, end)).toBe(encodeSlotId(new Date(start), new Date(end)));
  });
});
