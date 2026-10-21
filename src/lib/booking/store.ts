import "server-only";
import { getConfig } from "@/lib/config";
import { NeonBookingStore } from "./neon-store";
import type { BookingRecord, CalendarEvent, NewBooking } from "./types";

export interface SaveBookingResult {
  booking: BookingRecord;
  created: boolean;
}

export interface BookingStore {
  createPending(input: NewBooking): Promise<SaveBookingResult>;
  getByRequestId(requestId: string): Promise<BookingRecord | undefined>;
  getActiveBySlotStart(slotStart: Date): Promise<BookingRecord | undefined>;
  markEventCreated(requestId: string, event: CalendarEvent): Promise<void>;
  confirm(requestId: string, event: CalendarEvent): Promise<BookingRecord>;
  deletePending(requestId: string): Promise<void>;
}

export class BookingStoreNotConfiguredError extends Error {
  constructor() {
    super("Booking storage is not configured.");
    this.name = "BookingStoreNotConfiguredError";
  }
}

export class SlotTakenError extends Error {
  readonly existing: BookingRecord;

  constructor(existing: BookingRecord) {
    super("The selected booking slot is already held.");
    this.name = "SlotTakenError";
    this.existing = existing;
  }
}

let store: BookingStore | undefined;

export function getBookingStore(): BookingStore {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) throw new BookingStoreNotConfiguredError();

  store ??= new NeonBookingStore(DATABASE_URL);
  return store;
}

export function resetBookingStoreForTests(): void {
  store = undefined;
}
