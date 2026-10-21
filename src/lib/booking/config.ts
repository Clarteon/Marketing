import { BOOKING_DEFAULT_TIMEZONE } from "./constants";

export interface BookingRules {
  timezone: string;
  workingDays: readonly number[];
  startMinutes: number;
  endMinutes: number;
  slotMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  horizonDays: number;
  maxSlots: number;
  title: string;
  description: string;
}

/**
 * All booking rules live here. Change these values in one place rather than
 * scattering scheduling assumptions through the UI, API and calendar client.
 *
 * The human decisions recorded for P3: Asia/Manila, Monday to Friday,
 * 09:00-17:00, 30-minute calls, 10-minute buffer, 24 hours notice and a
 * 30-day booking horizon.
 */
export const bookingRules: BookingRules = {
  timezone: BOOKING_DEFAULT_TIMEZONE,
  workingDays: [1, 2, 3, 4, 5],
  startMinutes: 9 * 60,
  endMinutes: 17 * 60,
  slotMinutes: 30,
  bufferMinutes: 10,
  minNoticeHours: 24,
  horizonDays: 30,
  // Enough for the full 30-day horizon at 16 slots per weekday. The client
  // groups the list by day and scrolls, so this is not a single long wall.
  maxSlots: 400,
  title: "Clarteon discovery call",
  description:
    "A short conversation about what is slowing your business down and what a good outcome looks like.",
};
