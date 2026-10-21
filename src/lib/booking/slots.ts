import { bookingRules, type BookingRules } from "./config";
import { InvalidSlotError } from "./errors";
import {
  dateKeyInTimeZone,
  getZonedParts,
  parseDateKey,
  weekdayForDateKey,
  zonedDateTimeToUtc,
} from "./time";
import type { BookingSlot, BusyInterval } from "./types";

export interface SlotBounds {
  start: Date;
  end: Date;
}

export interface GenerateSlotsOptions {
  busy: readonly BusyInterval[];
  now: Date;
  from?: Date;
  to?: Date;
  rules?: BookingRules;
}

const MINUTE_MS = 60 * 1_000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function encodeSlotId(start: Date, end: Date): string {
  return Buffer.from(`${start.toISOString()}|${end.toISOString()}`, "utf8").toString("base64url");
}

export function decodeSlotId(slotId: string): SlotBounds {
  if (!/^[A-Za-z0-9_-]{1,240}$/.test(slotId)) throw new InvalidSlotError();

  let raw: string;
  try {
    raw = Buffer.from(slotId, "base64url").toString("utf8");
  } catch {
    throw new InvalidSlotError();
  }

  const parts = raw.split("|");
  if (parts.length !== 2) throw new InvalidSlotError();

  const start = new Date(parts[0]);
  const end = new Date(parts[1]);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new InvalidSlotError();
  if (start.toISOString() !== parts[0] || end.toISOString() !== parts[1])
    throw new InvalidSlotError();
  if (start.getTime() >= end.getTime()) throw new InvalidSlotError();

  return { start, end };
}

export function slotOverlapsBusy(
  start: Date,
  end: Date,
  busy: readonly BusyInterval[],
  bufferMinutes: number,
): boolean {
  const bufferMs = bufferMinutes * MINUTE_MS;
  return busy.some((interval) => {
    const busyStart = interval.start.getTime();
    const busyEnd = interval.end.getTime();
    if (!Number.isFinite(busyStart) || !Number.isFinite(busyEnd)) return true;
    return start.getTime() < busyEnd + bufferMs && end.getTime() > busyStart - bufferMs;
  });
}

/**
 * Generate bookable slots on the configured working grid. The slot ID is a
 * signed-free, opaque encoding of the exact UTC interval. The server always
 * re-validates a returned slot before creating a calendar event.
 */
export function generateSlots(options: GenerateSlotsOptions): BookingSlot[] {
  const rules = options.rules ?? bookingRules;
  const noticeMs = rules.minNoticeHours * 60 * 60 * 1_000;
  const horizonMs = rules.horizonDays * 24 * 60 * 60 * 1_000;
  const earliest = Math.max(options.now.getTime() + noticeMs, options.from?.getTime() ?? 0);
  const latest = Math.min(options.now.getTime() + horizonMs, options.to?.getTime() ?? Infinity);

  if (!Number.isFinite(earliest) || !Number.isFinite(latest) || latest <= earliest) return [];

  const windowStart = new Date(earliest);
  const windowEnd = new Date(latest);
  const firstDateKey = dateKeyInTimeZone(windowStart, rules.timezone);
  const lastDateKey = dateKeyInTimeZone(windowEnd, rules.timezone);
  const slots: BookingSlot[] = [];
  const slotMs = rules.slotMinutes * MINUTE_MS;

  let dateKey = firstDateKey;
  while (dateKey <= lastDateKey && slots.length < rules.maxSlots) {
    const weekday = weekdayForDateKey(dateKey);
    if (rules.workingDays.includes(weekday)) {
      const date = parseDateKey(dateKey);

      for (
        let minute = rules.startMinutes;
        minute + rules.slotMinutes <= rules.endMinutes;
        minute += rules.slotMinutes
      ) {
        const startParts = {
          year: date.year,
          month: date.month,
          day: date.day,
          hour: Math.floor(minute / 60),
          minute: minute % 60,
        };
        const startInZone = zonedDateTimeToUtc(startParts, rules.timezone);
        const endInZone = new Date(startInZone.getTime() + slotMs);

        if (startInZone.getTime() < windowStart.getTime()) continue;
        if (endInZone.getTime() > windowEnd.getTime()) continue;
        if (slotOverlapsBusy(startInZone, endInZone, options.busy, rules.bufferMinutes)) continue;

        slots.push({
          id: encodeSlotId(startInZone, endInZone),
          start: startInZone.toISOString(),
          end: endInZone.toISOString(),
        });
        if (slots.length >= rules.maxSlots) break;
      }
    }

    dateKey = nextDateKey(dateKey);
  }

  return slots;
}

function nextDateKey(dateKey: string): string {
  const parts = parseDateKey(dateKey);
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() + 1);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function validateSlot(
  slot: SlotBounds,
  now: Date,
  rules: BookingRules = bookingRules,
): void {
  const startMs = slot.start.getTime();
  const endMs = slot.end.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) throw new InvalidSlotError();
  if (startMs >= endMs) throw new InvalidSlotError();
  if (startMs % MINUTE_MS !== 0 || endMs % MINUTE_MS !== 0) throw new InvalidSlotError();
  if (endMs - startMs !== rules.slotMinutes * MINUTE_MS) throw new InvalidSlotError();

  const earliest = now.getTime() + rules.minNoticeHours * 60 * 60 * 1_000;
  const latest = now.getTime() + rules.horizonDays * 24 * 60 * 60 * 1_000;
  if (startMs < earliest || endMs > latest) throw new InvalidSlotError();

  const startParts = getZonedParts(slot.start, rules.timezone);
  const endParts = getZonedParts(slot.end, rules.timezone);
  if (startParts.second !== 0 || endParts.second !== 0) throw new InvalidSlotError();

  const weekday = weekdayForDateKey(
    `${startParts.year}-${pad(startParts.month)}-${pad(startParts.day)}`,
  );
  const startMinutes = startParts.hour * 60 + startParts.minute;
  const endMinutes = endParts.hour * 60 + endParts.minute;

  if (!rules.workingDays.includes(weekday)) throw new InvalidSlotError();
  if (startMinutes < rules.startMinutes) throw new InvalidSlotError();
  if (startMinutes + rules.slotMinutes > rules.endMinutes) throw new InvalidSlotError();
  if ((startMinutes - rules.startMinutes) % rules.slotMinutes !== 0) throw new InvalidSlotError();
  if (endMinutes !== startMinutes + rules.slotMinutes) throw new InvalidSlotError();
  if (
    startParts.year !== endParts.year ||
    startParts.month !== endParts.month ||
    startParts.day !== endParts.day
  ) {
    throw new InvalidSlotError();
  }
}
