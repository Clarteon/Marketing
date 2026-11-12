import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadStoreNotConfiguredError } from "@/lib/leads/store";

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

import {
  getLead,
  getLeadStats,
  LEADS_PAGE_SIZE,
  LeadNotFoundError,
  listLeads,
  updateLead,
} from "@/lib/admin/lead-queries";
import { leadsListSchema } from "@/lib/admin/schema";

function leadRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Juan Dela Cruz",
    email: "juan@example.com",
    company: null,
    need: "Our weekly report takes a whole day to put together.",
    team_size: "11-50",
    source: "website-form",
    status: "new",
    created_at: "2026-11-10T02:30:00.000Z",
    updated_at: "2026-11-10T02:30:00.000Z",
    team_email_sent_at: "2026-11-10T02:30:05.000Z",
    receipt_email_sent_at: "2026-11-10T02:30:06.000Z",
    last_error: null,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.query.mockReset();
  mocks.config.DATABASE_URL = "postgresql://user:pass@example.com/db";
});

describe("admin lead queries", () => {
  it("throws the not-configured error without a database URL", async () => {
    mocks.config.DATABASE_URL = undefined;

    await expect(listLeads(leadsListSchema.parse({}))).rejects.toBeInstanceOf(
      LeadStoreNotConfiguredError,
    );
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("lists leads newest first with paging and the email markers", async () => {
    mocks.query.mockResolvedValueOnce([leadRow()]).mockResolvedValueOnce([{ total: "7" }]);

    const result = await listLeads(leadsListSchema.parse({}));

    expect(result.total).toBe(7);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(LEADS_PAGE_SIZE);

    const [row] = result.rows;
    expect(row.name).toBe("Juan Dela Cruz");
    expect(row.company).toBeUndefined();
    expect(row.teamSize).toBe("11-50");
    expect(row.source).toBe("website-form");
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.teamEmailSentAt).toBeInstanceOf(Date);
    expect(row.receiptEmailSentAt).toBeInstanceOf(Date);
    expect(row.lastError).toBeUndefined();

    const listCall = mocks.query.mock.calls[0];
    const listSql = (listCall[0] as TemplateStringsArray).join(" ");
    expect(listSql).toContain("FROM leads");
    expect(listSql).toContain("ORDER BY created_at DESC");
    expect(listCall).toContain(LEADS_PAGE_SIZE);
    expect(listCall).toContain(0);

    const countSql = (mocks.query.mock.calls[1][0] as TemplateStringsArray).join(" ");
    expect(countSql).toContain("count(*)::int AS total");
    expect(countSql).not.toContain("ORDER BY");
  });

  it("filters by source and offsets later pages", async () => {
    mocks.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

    await listLeads(leadsListSchema.parse({ source: "clara-chat", page: 2 }));

    const listCall = mocks.query.mock.calls[0];
    const listSql = (listCall[0] as TemplateStringsArray).join(" ");
    expect(listSql).toContain("source =");
    expect(listCall).toContain("clara-chat");
    expect(listCall).toContain(LEADS_PAGE_SIZE);
  });

  it("keeps a recorded email failure and a missing company", async () => {
    mocks.query.mockResolvedValueOnce([
      leadRow({
        company: null,
        team_email_sent_at: null,
        receipt_email_sent_at: null,
        last_error: "team_timeout",
      }),
    ]);
    mocks.query.mockResolvedValueOnce([{ total: "1" }]);

    const result = await listLeads(leadsListSchema.parse({}));

    expect(result.rows[0].lastError).toBe("team_timeout");
    expect(result.rows[0].teamEmailSentAt).toBeUndefined();
    expect(result.rows[0].receiptEmailSentAt).toBeUndefined();
  });

  it("counts leads by follow-up state for the dashboard", async () => {
    mocks.query.mockResolvedValueOnce([
      {
        total: "9",
        new: "4",
        contacted: "2",
        booked: "2",
        closed: "1",
        last_seven_days: "3",
        with_error: "1",
      },
    ]);

    const stats = await getLeadStats();

    expect(stats).toEqual({
      total: 9,
      new: 4,
      contacted: 2,
      booked: 2,
      closed: 1,
      lastSevenDays: 3,
      withError: 1,
    });

    const statsSql = (mocks.query.mock.calls[0][0] as TemplateStringsArray).join(" ");
    expect(statsSql).toContain("FROM leads");
    expect(statsSql).toContain("last_error IS NOT NULL");
    expect(statsSql).toContain("interval '7 days'");
  });

  it("loads one lead with its follow-up status", async () => {
    mocks.query.mockResolvedValueOnce([leadRow({ status: "contacted" })]);

    const lead = await getLead("11111111-1111-4111-8111-111111111111");

    expect(lead?.status).toBe("contacted");
    expect(lead?.updatedAt).toBeInstanceOf(Date);
    const detailSql = (mocks.query.mock.calls[0][0] as TemplateStringsArray).join(" ");
    expect(detailSql).toContain("WHERE id =");
    expect(detailSql).toContain("status");
  });

  it("saves a follow-up status and stamps the update", async () => {
    mocks.query
      .mockResolvedValueOnce([leadRow()])
      .mockResolvedValueOnce([leadRow({ status: "booked", name: "Grace Hopper" })]);

    const lead = await updateLead("11111111-1111-4111-8111-111111111111", {
      status: "booked",
      name: "Grace Hopper",
    });

    expect(lead.status).toBe("booked");
    expect(lead.name).toBe("Grace Hopper");

    const updateCall = mocks.query.mock.calls[1];
    const updateSql = (updateCall[0] as TemplateStringsArray).join(" ");
    expect(updateSql).toContain("UPDATE leads");
    expect(updateSql).toContain("updated_at = now()");
    expect(updateCall).toContain("booked");
    expect(updateCall).toContain("Grace Hopper");
  });

  it("refuses to edit a lead that is gone", async () => {
    mocks.query.mockResolvedValueOnce([]);

    await expect(
      updateLead("11111111-1111-4111-8111-111111111111", { status: "closed" }),
    ).rejects.toBeInstanceOf(LeadNotFoundError);
  });

  it("filters by follow-up status", async () => {
    mocks.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

    await listLeads(leadsListSchema.parse({ status: "booked" }));

    const listCall = mocks.query.mock.calls[0];
    const listSql = (listCall[0] as TemplateStringsArray).join(" ");
    expect(listSql).toContain("status =");
    expect(listCall).toContain("booked");

    const countCall = mocks.query.mock.calls[1];
    const countSql = (countCall[0] as TemplateStringsArray).join(" ");
    expect(countSql).toContain("status =");
    expect(countCall).toContain("booked");
  });

  it("treats an unknown source as invalid and defaults the empty query", () => {
    expect(leadsListSchema.safeParse({ source: "newsletter" }).success).toBe(false);
    expect(leadsListSchema.safeParse({ status: "won" }).success).toBe(false);
    expect(leadsListSchema.parse({}).source).toBe("all");
    expect(leadsListSchema.parse({}).status).toBe("all");
    expect(leadsListSchema.parse({}).page).toBe(1);
  });
});
