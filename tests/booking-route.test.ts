import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetConfigForTests } from "@/lib/config";
import { BookingFailedError } from "@/lib/booking/errors";
import { SlotTakenError } from "@/lib/booking/store";
import { resetRateLimitsForTests } from "@/lib/guardrails/rate-limit";
import { POST } from "@/app/api/booking/route";

const mocks = vi.hoisted(() => ({
  bookDiscoveryCall: vi.fn(),
  verifyTurnstile: vi.fn(),
}));

const alertTeamMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock("@/lib/alerts", () => ({ alertTeam: alertTeamMock }));

vi.mock("@/lib/booking/service", () => ({
  bookDiscoveryCall: mocks.bookDiscoveryCall,
}));

vi.mock("@/lib/guardrails/turnstile", () => ({
  verifyTurnstile: mocks.verifyTurnstile,
  TurnstileUnavailableError: class TurnstileUnavailableError extends Error {},
}));

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    notes: "Manual reporting takes too long every week.",
    timezone: "Asia/Manila",
    slotId: "slot-1",
    consent: true,
    turnstileToken: "test-token",
    requestId: crypto.randomUUID(),
    startedAt: Date.now() - 5_000,
    website: "",
    ...overrides,
  };
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/booking", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function bookingRecord(requestId: string) {
  return {
    requestId,
    slotStart: new Date("2026-10-20T01:00:00.000Z"),
    slotEnd: new Date("2026-10-20T01:30:00.000Z"),
    name: "Ada Lovelace",
    email: "ada@example.com",
    timezone: "Asia/Manila",
    status: "confirmed" as const,
    meetLink: "https://meet.google.com/abc-defg-hij",
    createdAt: new Date("2026-10-19T00:00:00.000Z"),
  };
}

describe("POST /api/booking", () => {
  beforeEach(() => {
    process.env.TURNSTILE_SECRET_KEY = "test-turnstile-secret";
    process.env.RATE_LIMIT_MAX_REQUESTS = "20";
    process.env.RATE_LIMIT_WINDOW_SECONDS = "60";
    resetConfigForTests();
    resetRateLimitsForTests();

    mocks.bookDiscoveryCall.mockReset();
    mocks.verifyTurnstile.mockReset();
    mocks.verifyTurnstile.mockResolvedValue(true);
    mocks.bookDiscoveryCall.mockImplementation(async (input: { requestId: string }) => ({
      booking: bookingRecord(input.requestId),
      confirmationEmailSent: true,
      teamEmailSent: true,
    }));

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("books a valid slot and reports the Meet link", async () => {
    const body = validBody();
    const response = await POST(request(body));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      booking: {
        start: "2026-10-20T01:00:00.000Z",
        end: "2026-10-20T01:30:00.000Z",
        timezone: "Asia/Manila",
        meetLink: "https://meet.google.com/abc-defg-hij",
        calendarLink: null,
      },
      confirmationEmailSent: true,
    });
    expect(mocks.bookDiscoveryCall).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: body.requestId,
        slotId: "slot-1",
        name: body.name,
        email: body.email,
        timezone: "Asia/Manila",
      }),
    );
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith(
      "test-token",
      expect.any(String),
      "test-turnstile-secret",
      "book-call",
    );
  });

  it("rejects an invalid body", async () => {
    const response = await POST(request(validBody({ consent: false })));

    expect(response.status).toBe(400);
    expect(mocks.bookDiscoveryCall).not.toHaveBeenCalled();
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
  });

  it("rejects a request from another origin", async () => {
    const response = await POST(request(validBody(), { origin: "https://evil.example" }));

    expect(response.status).toBe(403);
    expect(mocks.bookDiscoveryCall).not.toHaveBeenCalled();
  });

  it("rejects a filled honeypot", async () => {
    const response = await POST(request(validBody({ website: "https://spam.example" })));

    expect(response.status).toBe(400);
    expect(mocks.bookDiscoveryCall).not.toHaveBeenCalled();
  });

  it("rejects a submission that arrives too quickly", async () => {
    const response = await POST(request(validBody({ startedAt: Date.now() })));

    expect(response.status).toBe(400);
    expect(mocks.bookDiscoveryCall).not.toHaveBeenCalled();
  });

  it("rejects a failed bot check", async () => {
    mocks.verifyTurnstile.mockResolvedValue(false);

    const response = await POST(request(validBody()));

    expect(response.status).toBe(403);
    expect(mocks.bookDiscoveryCall).not.toHaveBeenCalled();
  });

  it("returns a slot conflict as 409", async () => {
    const body = validBody();
    mocks.bookDiscoveryCall.mockRejectedValue(new SlotTakenError(bookingRecord(body.requestId)));

    const response = await POST(request(body));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "slot_unavailable" });
  });

  it("reports a failed booking as 503 without exposing details", async () => {
    mocks.bookDiscoveryCall.mockRejectedValue(new BookingFailedError("calendar_create"));

    const response = await POST(request(validBody()));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "booking_failed" });
    expect(alertTeamMock).toHaveBeenCalledWith("booking_failed", { code: "calendar_create" });
  });

  it("rate limits repeated submissions from one address", async () => {
    process.env.RATE_LIMIT_MAX_REQUESTS = "1";
    resetConfigForTests();

    const first = await POST(request(validBody({ email: "one@example.com" })));
    const second = await POST(request(validBody({ email: "two@example.com" })));

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.headers.get("retry-after")).toBeTruthy();
  });
});
