import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingStoreNotConfiguredError } from "@/lib/booking/store";

const mocks = vi.hoisted(() => ({
  config: { DATABASE_URL: "postgresql://user:pass@example.com/db" } as { DATABASE_URL?: string },
  query: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  getConfig: () => mocks.config,
}));

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() => {
    const client = (strings: TemplateStringsArray, ...values: unknown[]) =>
      mocks.query(strings, ...values);
    client.unsafe = (raw: string) => ({ raw });
    return client;
  }),
}));

import { BOOKINGS_PAGE_SIZE, getBookingStats, listBookings } from "@/lib/admin/queries";
import { bookingsListSchema } from "@/lib/admin/schema";

function listRow(overrides: Record<string, unknown> = {}) {
  return {
    request_id: "request-1",
    slot_start: "2026-11-20T06:00:00.000Z",
    slot_end: "2026-11-20T07:00:00.000Z",
    name: "Juan Dela Cruz",
    email: "juan@example.com",
    notes: null,
    timezone: "Asia/Manila",
    status: "confirmed",
    meet_link: "https://meet.google.com/abc-defg-hij",
    calendar_link: null,
    created_at: "2026-11-10T02:30:00.000Z",
    confirmed_at: "2026-11-10T02:31:00.000Z",
    cancelled_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.query.mockReset();
  mocks.config.DATABASE_URL = "postgresql://user:pass@example.com/db";
});

describe("admin booking queries", () => {
  it("throws the not-configured error without a database URL", async () => {
    mocks.config.DATABASE_URL = undefined;

    await expect(listBookings(bookingsListSchema.parse({}))).rejects.toBeInstanceOf(
      BookingStoreNotConfiguredError,
    );
    await expect(getBookingStats()).rejects.toBeInstanceOf(BookingStoreNotConfiguredError);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("lists bookings with filters, ordering and paging", async () => {
    mocks.query.mockResolvedValueOnce([listRow()]).mockResolvedValueOnce([{ total: "3" }]);

    const result = await listBookings(bookingsListSchema.parse({ status: "pending" }));

    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(BOOKINGS_PAGE_SIZE);
    expect(result.rows).toHaveLength(1);

    const [row] = result.rows;
    expect(row.status).toBe("confirmed");
    expect(row.slotStart).toBeInstanceOf(Date);
    expect(row.confirmedAt).toBeInstanceOf(Date);
    expect(row.notes).toBeUndefined();
    expect(row.meetLink).toBe("https://meet.google.com/abc-defg-hij");

    const listCall = mocks.query.mock.calls[0];
    const listSql = (listCall[0] as TemplateStringsArray).join(" ");
    expect(listSql).toContain("FROM bookings");
    expect(listSql).toContain("ORDER BY slot_start");
    expect(listCall).toContain(BOOKINGS_PAGE_SIZE);
    expect(listCall).toContain(0);

    const countCall = mocks.query.mock.calls[1];
    const countSql = (countCall[0] as TemplateStringsArray).join(" ");
    expect(countSql).toContain("count(*)::int AS total");
  });

  it("orders upcoming slots soonest first and offsets the page", async () => {
    mocks.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

    await listBookings(bookingsListSchema.parse({ timing: "upcoming", page: 3 }));

    const listCall = mocks.query.mock.calls[0];
    const direction = listCall
      .slice(1)
      .find((value) => typeof value === "object" && value !== null && "raw" in value);
    expect(direction).toEqual({ raw: "ASC" });
    expect(listCall).toContain((3 - 1) * BOOKINGS_PAGE_SIZE);
    const countSql = (mocks.query.mock.calls[1][0] as TemplateStringsArray).join(" ");
    expect(countSql).not.toContain("ORDER BY");
  });

  it("summarises booking counts as numbers", async () => {
    mocks.query.mockResolvedValueOnce([{ pending: 1, confirmed: "2", cancelled: 0, upcoming: 0 }]);

    const stats = await getBookingStats();

    expect(stats).toEqual({ pending: 1, confirmed: 2, cancelled: 0, upcoming: 0 });
    const sql = (mocks.query.mock.calls[0][0] as TemplateStringsArray).join(" ");
    expect(sql).toContain("FILTER (WHERE status = 'pending')");
    expect(sql).toContain("FILTER (WHERE status = 'cancelled')");
    expect(sql).toContain("slot_start > now()");
  });

  it("keeps a cancelled row's status and cancellation time", async () => {
    mocks.query.mockResolvedValueOnce([
      listRow({ status: "cancelled", cancelled_at: "2026-11-10T05:00:00.000Z" }),
    ]);
    mocks.query.mockResolvedValueOnce([{ total: 1 }]);

    const result = await listBookings(bookingsListSchema.parse({ status: "cancelled" }));

    expect(result.rows[0].status).toBe("cancelled");
    expect(result.rows[0].cancelledAt).toBeInstanceOf(Date);
  });
});
