import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionToken } from "@/lib/admin/auth";
import { resetRateLimitsForTests } from "@/lib/guardrails/rate-limit";

const mocks = vi.hoisted(() => ({
  config: {
    ADMIN_AUTH_SECRET: "a-test-secret-that-is-long-enough-123456",
  },
  updateLead: vi.fn(),
}));

const SECRET = mocks.config.ADMIN_AUTH_SECRET;

vi.mock("@/lib/config", () => ({
  getConfig: () => mocks.config,
}));

vi.mock("@/lib/admin/lead-queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/lead-queries")>(
    "@/lib/admin/lead-queries",
  );
  return { ...actual, updateLead: mocks.updateLead };
});

import { PATCH } from "@/app/api/admin/leads/[id]/route";
import { LeadNotFoundError, type AdminLeadRow } from "@/lib/admin/lead-queries";
import { LeadStoreNotConfiguredError } from "@/lib/leads/store";

const LEAD_ID = "00000000-0000-4000-8000-000000000001";
const PARAMS = { params: Promise.resolve({ id: LEAD_ID }) };

function savedLead(overrides: Partial<AdminLeadRow> = {}): AdminLeadRow {
  return {
    id: LEAD_ID,
    name: "Juan Dela Cruz",
    email: "juan@example.com",
    company: "Casa Verde",
    need: "Our weekly report takes a whole day.",
    teamSize: "11-50",
    source: "website-form",
    status: "contacted",
    createdAt: new Date("2026-11-10T02:30:00.000Z"),
    updatedAt: new Date("2026-11-11T02:30:00.000Z"),
    ...overrides,
  };
}

function editRequest(body: unknown, options: { cookie?: string; origin?: string } = {}) {
  return new Request(`http://localhost:3000/api/admin/leads/${LEAD_ID}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Origin: options.origin ?? "http://localhost:3000",
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function signedIn(body: unknown) {
  const token = createAdminSessionToken(SECRET);
  return editRequest(body, { cookie: `clarteon_admin=${encodeURIComponent(token)}` });
}

beforeEach(() => {
  resetRateLimitsForTests();
  mocks.updateLead.mockReset();
});

describe("PATCH /api/admin/leads/[id]", () => {
  it("rejects a request from another origin", async () => {
    const response = await PATCH(
      editRequest({ status: "booked" }, { origin: "https://evil.example" }),
      PARAMS,
    );

    expect(response.status).toBe(403);
    expect(mocks.updateLead).not.toHaveBeenCalled();
  });

  it("rejects a request without a session", async () => {
    const response = await PATCH(editRequest({ status: "booked" }), PARAMS);

    expect(response.status).toBe(401);
    expect(mocks.updateLead).not.toHaveBeenCalled();
  });

  it("rejects an empty payload", async () => {
    const response = await PATCH(signedIn({}), PARAMS);

    expect(response.status).toBe(400);
    expect(mocks.updateLead).not.toHaveBeenCalled();
  });

  it("rejects a follow-up state that is not on the list", async () => {
    const response = await PATCH(signedIn({ status: "won" }), PARAMS);

    expect(response.status).toBe(400);
    expect(mocks.updateLead).not.toHaveBeenCalled();
  });

  it("rejects a malformed lead id", async () => {
    const response = await PATCH(signedIn({ status: "booked" }), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.updateLead).not.toHaveBeenCalled();
  });

  it("saves the changed fields for a signed-in admin", async () => {
    mocks.updateLead.mockResolvedValue(savedLead({ status: "booked" }));

    const response = await PATCH(
      signedIn({ status: "booked", company: null, email: " Juan@Example.com " }),
      PARAMS,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.lead.status).toBe("booked");
    expect(body.lead.updatedAt).toBe("2026-11-11T02:30:00.000Z");
    expect(mocks.updateLead).toHaveBeenCalledWith(LEAD_ID, {
      status: "booked",
      company: null,
      email: "juan@example.com",
    });
  });

  it("answers 404 when the lead is gone", async () => {
    mocks.updateLead.mockRejectedValue(new LeadNotFoundError());

    const response = await PATCH(signedIn({ status: "closed" }), PARAMS);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("lead_not_found");
  });

  it("answers 503 when lead storage is not configured", async () => {
    mocks.updateLead.mockRejectedValue(new LeadStoreNotConfiguredError());

    const response = await PATCH(signedIn({ status: "closed" }), PARAMS);

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("lead_store_unavailable");
  });

  it("answers 500 without leaking details on an unexpected error", async () => {
    mocks.updateLead.mockRejectedValue(new Error("secret internal message"));

    const response = await PATCH(signedIn({ status: "closed" }), PARAMS);

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret internal message");
  });

  it("rate limits a burst of edits", async () => {
    mocks.updateLead.mockResolvedValue(savedLead());

    let last: Response | undefined;
    for (let attempt = 0; attempt < 31; attempt += 1) {
      last = await PATCH(signedIn({ status: "contacted" }), PARAMS);
      if (last.status === 429) break;
    }

    expect(last?.status).toBe(429);
  });
});
