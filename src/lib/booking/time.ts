import { InvalidSlotError } from "./errors";

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const values: Record<string, string> = {};
  for (const part of formatterFor(timeZone).formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  const hour = Number(values.hour);
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: hour === 24 ? 0 : hour,
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - date.getTime();
}

/**
 * Convert a wall-clock date and time in a named timezone to an instant.
 * Asia/Manila has no daylight-saving transition, but the two-pass offset
 * calculation keeps this correct for other configured timezones too.
 */
export function zonedDateTimeToUtc(
  parts: Pick<ZonedParts, "year" | "month" | "day" | "hour" | "minute">,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);

  const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  let candidate = utcGuess - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(new Date(candidate), timeZone);
  if (secondOffset !== firstOffset) candidate = utcGuess - secondOffset;

  return new Date(candidate);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export interface DateKeyParts {
  year: number;
  month: number;
  day: number;
}

export function parseDateKey(dateKey: string): DateKeyParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new InvalidSlotError();

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new InvalidSlotError();
  }

  return { year, month, day };
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = getZonedParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const parts = parseDateKey(dateKey);
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function weekdayForDateKey(dateKey: string): number {
  const parts = parseDateKey(dateKey);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}
