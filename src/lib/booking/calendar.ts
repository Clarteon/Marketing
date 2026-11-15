import { addDaysToDateKey, parseDateKey, weekdayForDateKey } from "./time";

export function calendarMonthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function calendarMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

export function calendarDays(monthKey: string): (string | null)[] {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = `${monthKey}-01`;
  const offset = (weekdayForDateKey(firstDay) + 6) % 7;
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => addDaysToDateKey(firstDay, index)),
  ];
  // Six weeks keep the calendar height stable for every month.
  while (days.length < 42) days.push(null);
  return days;
}

export function calendarDayNumber(dateKey: string): string {
  return String(parseDateKey(dateKey).day);
}
