import { describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimitsForTests } from "@/lib/guardrails/rate-limit";
import { buildTeamAlert, buildVisitorReceipt } from "@/lib/email/templates";
import { leadInputSchema } from "@/lib/leads/schema";
import type { Lead } from "@/lib/leads/store";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ada Lovelace",
    email: "  ADA@Example.COM ",
    company: "",
    need: "Manual reporting takes too long every week.",
    teamSize: "",
    consent: true,
    turnstileToken: "token",
    requestId: "550e8400-e29b-41d4-a716-446655440000",
    startedAt: Date.now() - 5_000,
    website: "",
    ...overrides,
  };
}

const lead: Lead = {
  id: "lead-1",
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  name: "Ada <script>alert(1)</script>",
  email: "ada@example.com",
  need: "Line one\n<script>alert(1)</script>",
  teamSize: "2-10",
  source: "website-form",
  createdAt: new Date("2026-10-20T12:00:00.000Z"),
};

describe("lead input", () => {
  it("normalizes optional fields and email case", () => {
    const result = leadInputSchema.parse(validInput());

    expect(result.email).toBe("ada@example.com");
    expect(result.company).toBeUndefined();
    expect(result.teamSize).toBeUndefined();
  });

  it("keeps unknown fields out of the parsed lead", () => {
    const result = leadInputSchema.parse(
      validInput({ to: "attacker@example.com", subject: "Injected subject" }),
    );

    expect(result).not.toHaveProperty("to");
    expect(result).not.toHaveProperty("subject");
  });

  it("rejects a line break in a name", () => {
    expect(() =>
      leadInputSchema.parse(validInput({ name: "Ada\r\nBcc: bad@example.com" })),
    ).toThrow();
  });

  it("rejects an invalid email and a false consent", () => {
    expect(() => leadInputSchema.parse(validInput({ email: "not-an-email" }))).toThrow();
    expect(() => leadInputSchema.parse(validInput({ consent: false }))).toThrow();
  });
});

describe("rate limiter", () => {
  it("allows up to the limit and reports the retry window", () => {
    resetRateLimitsForTests();

    expect(checkRateLimit("key", 2, 1_000, 10_000).allowed).toBe(true);
    expect(checkRateLimit("key", 2, 1_000, 10_100).allowed).toBe(true);

    const blocked = checkRateLimit("key", 2, 1_000, 10_200);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(checkRateLimit("key", 2, 1_000, 11_001).allowed).toBe(true);
  });
});

describe("lead email templates", () => {
  it("escapes visitor HTML in the team alert and keeps the subject fixed", () => {
    const message = buildTeamAlert(lead);

    expect(message.subject).toBe("New project brief from the Clarteon website");
    expect(message.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(message.html).not.toContain("<script>");
    expect(message.text).toContain("Line one");
    expect(message.text).toContain("Lead ID: lead-1");
  });

  it("keeps the visitor receipt short and fixed", () => {
    const message = buildVisitorReceipt(lead);

    expect(message.subject).toBe("We received your project brief");
    expect(message.text).toContain("Hi Ada <script>alert(1)</script>,");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.text).toContain("Clarteon");
  });
});
