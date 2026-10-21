import "server-only";
import { neon } from "@neondatabase/serverless";
import { SlotTakenError, type BookingStore, type SaveBookingResult } from "./store";
import type { BookingRecord, CalendarEvent, NewBooking } from "./types";

interface BookingRow {
  request_id: string;
  slot_start: string | Date;
  slot_end: string | Date;
  name: string;
  email: string;
  notes: string | null;
  timezone: string;
  status: string;
  google_event_id: string | null;
  meet_link: string | null;
  calendar_link: string | null;
  created_at: string | Date;
  confirmed_at: string | Date | null;
}

type Sql = ReturnType<typeof neon>;

function mapRow(row: BookingRow): BookingRecord {
  return {
    requestId: row.request_id,
    slotStart: new Date(row.slot_start),
    slotEnd: new Date(row.slot_end),
    name: row.name,
    email: row.email,
    notes: row.notes ?? undefined,
    timezone: row.timezone,
    status: row.status as BookingRecord["status"],
    googleEventId: row.google_event_id ?? undefined,
    meetLink: row.meet_link ?? undefined,
    calendarLink: row.calendar_link ?? undefined,
    createdAt: new Date(row.created_at),
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const direct = (error as { code?: unknown }).code;
  if (direct === "23505") return true;

  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === "object") {
    const causeCode = (cause as { code?: unknown }).code;
    if (causeCode === "23505") return true;
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.includes("duplicate key value");
}

export class NeonBookingStore implements BookingStore {
  private readonly sql: Sql;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  async createPending(input: NewBooking): Promise<SaveBookingResult> {
    // A serverless function can disappear between reserving a slot and creating
    // the calendar event. Release very old pending holds so one crash cannot
    // block a time forever. The normal path deletes its hold on failure.
    await this.sql`
      DELETE FROM bookings
      WHERE status = 'pending'
        AND google_event_id IS NULL
        AND created_at < now() - interval '15 minutes'
    `;

    let rows: BookingRow[];
    try {
      rows = (await this.sql`
        INSERT INTO bookings (
          request_id, slot_start, slot_end, name, email, notes, timezone, status
        ) VALUES (
          ${input.requestId}, ${input.slotStart.toISOString()}, ${input.slotEnd.toISOString()},
          ${input.name}, ${input.email}, ${input.notes ?? null}, ${input.timezone}, 'pending'
        )
        ON CONFLICT (request_id) DO NOTHING
        RETURNING
          request_id, slot_start, slot_end, name, email, notes, timezone, status,
          google_event_id, meet_link, calendar_link, created_at, confirmed_at
      `) as unknown as BookingRow[];
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;

      const existing = await this.getByRequestId(input.requestId);
      if (existing) return { booking: existing, created: false };

      const held = await this.getActiveBySlotStart(input.slotStart);
      if (held) throw new SlotTakenError(held);
      throw error;
    }

    if (rows.length > 0) {
      return { booking: mapRow(rows[0]), created: true };
    }

    const existing = await this.getByRequestId(input.requestId);
    if (!existing) throw new Error("Booking insert conflicted but no saved booking was found.");
    return { booking: existing, created: false };
  }

  async getByRequestId(requestId: string): Promise<BookingRecord | undefined> {
    const rows = (await this.sql`
      SELECT
        request_id, slot_start, slot_end, name, email, notes, timezone, status,
        google_event_id, meet_link, calendar_link, created_at, confirmed_at
      FROM bookings
      WHERE request_id = ${requestId}
      LIMIT 1
    `) as unknown as BookingRow[];

    return rows.length > 0 ? mapRow(rows[0]) : undefined;
  }

  async getActiveBySlotStart(slotStart: Date): Promise<BookingRecord | undefined> {
    const rows = (await this.sql`
      SELECT
        request_id, slot_start, slot_end, name, email, notes, timezone, status,
        google_event_id, meet_link, calendar_link, created_at, confirmed_at
      FROM bookings
      WHERE slot_start = ${slotStart.toISOString()}
        AND status IN ('pending', 'confirmed')
      LIMIT 1
    `) as unknown as BookingRow[];

    return rows.length > 0 ? mapRow(rows[0]) : undefined;
  }

  async markEventCreated(requestId: string, event: CalendarEvent): Promise<void> {
    await this.sql`
      UPDATE bookings
      SET
        google_event_id = ${event.id},
        meet_link = ${event.meetLink},
        calendar_link = ${event.calendarLink ?? null}
      WHERE request_id = ${requestId} AND status = 'pending'
    `;
  }

  async confirm(requestId: string, event: CalendarEvent): Promise<BookingRecord> {
    const rows = (await this.sql`
      UPDATE bookings
      SET
        status = 'confirmed',
        google_event_id = ${event.id},
        meet_link = ${event.meetLink},
        calendar_link = ${event.calendarLink ?? null},
        confirmed_at = now()
      WHERE request_id = ${requestId} AND status = 'pending'
      RETURNING
        request_id, slot_start, slot_end, name, email, notes, timezone, status,
        google_event_id, meet_link, calendar_link, created_at, confirmed_at
    `) as unknown as BookingRow[];

    if (rows.length > 0) return mapRow(rows[0]);

    const existing = await this.getByRequestId(requestId);
    if (existing?.status === "confirmed") return existing;
    throw new Error("The booking hold could not be confirmed.");
  }

  async deletePending(requestId: string): Promise<void> {
    await this.sql`
      DELETE FROM bookings
      WHERE request_id = ${requestId} AND status = 'pending'
    `;
  }
}
