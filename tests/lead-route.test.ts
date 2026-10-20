import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetConfigForTests } from "@/lib/config";
import { resetRateLimitsForTests } from "@/lib/guardrails/rate-limit";
import { POST } from "@/app/api/lead/route";

const mocks = vi.hoisted(() => ({
  getLeadStore: vi.fn(),
  save: vi.fn(),
  markEmailSent: vi.fn(),
  markEmailFailure: vi.fn(),
  sendLeadEmails: vi.fn(),
  verifyTurnstile: vi.fn(),
}));

vi.mock("@/lib/leads/store", () => ({
  getLeadStore: mocks.getLeadStore,
}));

vi.mock("@/lib/email/send-lead-emails", () => ({
  sendLeadEmails: mocks.sendLeadEmails,
}));

vi.mock("@/lib/guardrails/turnstile", () => ({
  verifyTurnstile: mocks.verifyTurnstile,
  TurnstileUnavailableError: class TurnstileUnavailableError extends Error {},
}));

function input(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    company: "Analytical Engines",
    need: "Manual reporting takes too long every week.",
    teamSize: "2-10",
    consent: true,
    turnstileToken: "test-token",
    requestId: crypto.randomUUID(),
    startedAt: Date.now() - 5_000,
    website: "",
    ...overrides,
  };
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/lead", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function savedLead(body: ReturnType<typeof input>) {
  return {
    id: "lead-1",
    requestId: body.requestId,
    name: body.name,
    email: body.email,
    company: body.company,
    need: body.need,
    teamSize: body.teamSize,
    source: "website-form" as const,
    createdAt: new Date("2026-10-20T12:00:00.000Z"),
  };
}

describe("POST /api/lead", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://user:pass@example.com/db";
    process.env.TURNSTILE_SECRET_KEY = "test-turnstile-secret";
    process.env.RATE_LIMIT_MAX_REQUESTS = "20";
    process.env.RATE_LIMIT_WINDOW_SECONDS = "60";
    resetConfigForTests();
    resetRateLimitsForTests();

    mocks.save.mockReset();
    mocks.markEmailSent.mockReset();
    mocks.markEmailFailure.mockReset();
    mocks.sendLeadEmails.mockReset();
    mocks.verifyTurnstile.mockReset();
    mocks.getLeadStore.mockReset();

    mocks.getLeadStore.mockReturnValue({
      save: mocks.save,
      markEmailSent: mocks.markEmailSent,
      markEmailFailure: mocks.markEmailFailure,
    });

    mocks.verifyTurnstile.mockResolvedValue(true);
    mocks.sendLeadEmails.mockResolvedValue({ team: true, receipt: true });
    mocks.save.mockImplementation(async (lead) => ({
      lead: {
        ...lead,
        id: "lead-1",
        createdAt: new Date("2026-10-20T12:00:00.000Z"),
      },
      created: true,
    }));

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saves a valid brief before sending both emails", async () => {
    const body = input();
    const response = await POST(request(body));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: body.requestId,
        name: body.name,
        email: body.email,
        need: body.need,
        source: "website-form",
      }),
    );
    expect(mocks.sendLeadEmails).toHaveBeenCalledOnce();
  });

  it("resends idempotently for a repeated request id", async () => {
    const body = input();
    mocks.save.mockResolvedValue({ lead: savedLead(body), created: false });

    const response = await POST(request(body));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.sendLeadEmails).toHaveBeenCalledOnce();
    expect(mocks.sendLeadEmails.mock.calls[0][0].id).toBe("lead-1");
  });

  it("rejects an invalid body", async () => {
    const response = await POST(request(input({ consent: false })));

    expect(response.status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
  });

  it("rejects line breaks in a header-like name", async () => {
    const response = await POST(request(input({ name: "Ada\r\nBcc: attacker@example.com" })));

    expect(response.status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("rejects an oversized body", async () => {
    const response = await POST(request(input({ need: "x".repeat(17 * 1024) })));

    expect(response.status).toBe(413);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("rejects a request from another origin", async () => {
    const response = await POST(request(input(), { origin: "https://evil.example" }));

    expect(response.status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("rejects a filled honeypot", async () => {
    const response = await POST(request(input({ website: "https://spam.example" })));

    expect(response.status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("rejects a submission that arrives too quickly", async () => {
    const response = await POST(request(input({ startedAt: Date.now() })));

    expect(response.status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("rate limits repeated submissions from one address", async () => {
    process.env.RATE_LIMIT_MAX_REQUESTS = "1";
    resetConfigForTests();

    const first = await POST(request(input({ email: "one@example.com" })));
    const second = await POST(request(input({ email: "two@example.com" })));

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.headers.get("retry-after")).toBeTruthy();
  });

  it("rejects a failed bot check without saving", async () => {
    mocks.verifyTurnstile.mockResolvedValue(false);

    const response = await POST(request(input()));

    expect(response.status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("keeps the lead when email sending throws", async () => {
    mocks.sendLeadEmails.mockRejectedValue(new Error("provider down"));

    const response = await POST(request(input()));

    expect(response.status).toBe(200);
    expect(mocks.save).toHaveBeenCalledOnce();
  });

  it("keeps unknown fields out of the saved lead", async () => {
    const body = input({
      to: "attacker@example.com",
      subject: "Injected subject",
      replyTo: "attacker@example.com",
    });

    const response = await POST(request(body));

    expect(response.status).toBe(200);
    const saved = mocks.save.mock.calls[0][0];
    expect(saved).not.toHaveProperty("to");
    expect(saved).not.toHaveProperty("subject");
    expect(saved).not.toHaveProperty("replyTo");
  });

  it("falls back to an email-only record when the database save fails", async () => {
    const body = input();
    mocks.save.mockRejectedValue(new Error("database down"));
    mocks.sendLeadEmails.mockResolvedValue({ team: true, receipt: true });

    const response = await POST(request(body));

    expect(response.status).toBe(200);
    expect(mocks.sendLeadEmails).toHaveBeenCalledOnce();
    const fallbackLead = mocks.sendLeadEmails.mock.calls[0][0];
    expect(fallbackLead.id).toBe(body.requestId);
    expect(fallbackLead.email).toBe(body.email);
    expect(mocks.sendLeadEmails.mock.calls[0][1]).toBeUndefined();
  });

  it("falls back to email when lead storage is not configured", async () => {
    mocks.getLeadStore.mockImplementation(() => {
      throw new Error("Lead storage is not configured.");
    });

    const response = await POST(request(input()));

    expect(response.status).toBe(200);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.sendLeadEmails).toHaveBeenCalledOnce();
  });

  it("returns 503 when both storage and the fallback email fail", async () => {
    mocks.save.mockRejectedValue(new Error("database down"));
    mocks.sendLeadEmails.mockRejectedValue(new Error("email down"));

    const response = await POST(request(input()));

    expect(response.status).toBe(503);
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.sendLeadEmails).toHaveBeenCalledOnce();
  });
});
