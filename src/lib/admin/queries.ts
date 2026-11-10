import "server-only";
import { neon } from "@neondatabase/serverless";
import { BookingStoreNotConfiguredError } from "@/lib/booking/store";
import { getConfig } from "@/lib/config";
import type { BookingsListQuery } from "./schema";

export type { BookingsListQuery } from "./schema";
export const BOOKINGS_PAGE_SIZE = 50;

export interface AdminBookingRow {
  requestId: string;
  slotStart: Date;
  slotEnd: Date;
  name: string;
  email: string;
  notes?: string;
  timezone: string;
  status: "pending" | "confirmed";
  meetLink?: string;
  calendarLink?: string;
  createdAt: Date;
  confirmedAt?: Date;
}

export interface BookingsListResult {
  rows: AdminBookingRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BookingStats {
  pending: number;
  confirmed: number;
  upcoming: number;
}

interface BookingListRow {
  request_id: string;
  slot_start: string | Date;
  slot_end: string | Date;
  name: string;
  email: string;
  notes: string | null;
  timezone: string;
  status: string;
  meet_link: string | null;
  calendar_link: string | null;
  created_at: string | Date;
  confirmed_at: string | Date | null;
}

interface BookingStatsRow {
  pending: number | string;
  confirmed: number | string;
  upcoming: number | string;
}

function getSql() {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) throw new BookingStoreNotConfiguredError();
  return neon(DATABASE_URL);
}

function mapRow(row: BookingListRow): AdminBookingRow {
  return {
    requestId: row.request_id,
    slotStart: new Date(row.slot_start),
    slotEnd: new Date(row.slot_end),
    name: row.name,
    email: row.email,
    notes: row.notes ?? undefined,
    timezone: row.timezone,
    status: row.status === "confirmed" ? "confirmed" : "pending",
    meetLink: row.meet_link ?? undefined,
    calendarLink: row.calendar_link ?? undefined,
    createdAt: new Date(row.created_at),
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
  };
}

export async function listBookings(query: BookingsListQuery): Promise<BookingsListResult> {
  const sql = getSql();
  const { status, timing, page } = query;
  const direction = timing === "upcoming" ? "ASC" : "DESC";
  const offset = (page - 1) * BOOKINGS_PAGE_SIZE;

  const rows = (await sql`
    SELECT
      request_id, slot_start, slot_end, name, email, notes, timezone, status,
      meet_link, calendar_link, created_at, confirmed_at
    FROM bookings
    WHERE (${status} = 'all' OR status = ${status})
      AND (
        ${timing} = 'all'
        OR (${timing} = 'upcoming' AND slot_start > now())
        OR (${timing} = 'past' AND slot_start <= now())
      )
    ORDER BY slot_start ${sql.unsafe(direction)}
    LIMIT ${BOOKINGS_PAGE_SIZE}
    OFFSET ${offset}
  `) as unknown as BookingListRow[];

  const countRows = (await sql`
    SELECT count(*)::int AS total
    FROM bookings
    WHERE (${status} = 'all' OR status = ${status})
      AND (
        ${timing} = 'all'
        OR (${timing} = 'upcoming' AND slot_start > now())
        OR (${timing} = 'past' AND slot_start <= now())
      )
  `) as unknown as { total: number | string }[];

  return {
    rows: rows.map(mapRow),
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize: BOOKINGS_PAGE_SIZE,
  };
}

export async function getBookingStats(): Promise<BookingStats> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      (count(*) FILTER (WHERE status = 'pending'))::int AS pending,
      (count(*) FILTER (WHERE status = 'confirmed'))::int AS confirmed,
      (count(*) FILTER (WHERE status IN ('pending', 'confirmed') AND slot_start > now()))::int
        AS upcoming
    FROM bookings
  `) as unknown as BookingStatsRow[];

  const row = rows[0];
  return {
    pending: Number(row?.pending ?? 0),
    confirmed: Number(row?.confirmed ?? 0),
    upcoming: Number(row?.upcoming ?? 0),
  };
}
