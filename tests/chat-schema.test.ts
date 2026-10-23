import { describe, expect, it } from "vitest";
import {
  availabilityArgsSchema,
  bookCallArgsSchema,
  chatRequestSchema,
  handoffArgsSchema,
  saveLeadArgsSchema,
  searchKnowledgeArgsSchema,
  solutionBriefArgsSchema,
} from "@/lib/chat/schema";

const sessionId = "6f1b6a1e-3b5e-4d5d-9f0a-2f8c5a7d9b1e";

describe("chat request schema", () => {
  it("accepts a normal message with history", () => {
    const result = chatRequestSchema.safeParse({
      sessionId,
      message: "  Our reporting takes too long.  ",
      history: [{ role: "assistant", content: "What is slowing you down?" }],
      timezone: "Asia/Manila",
      pageUrl: "/solutions",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("Our reporting takes too long.");
      expect(result.data.history).toHaveLength(1);
    }
  });

  it("rejects empty, oversized and malformed input", () => {
    const base = { sessionId, message: "Hello" };

    expect(chatRequestSchema.safeParse({ ...base, message: " " }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ ...base, message: "x".repeat(2_001) }).success).toBe(
      false,
    );
    expect(chatRequestSchema.safeParse({ ...base, sessionId: "not-a-uuid" }).success).toBe(false);
    expect(
      chatRequestSchema.safeParse({ ...base, history: [{ role: "system", content: "hi" }] })
        .success,
    ).toBe(false);
    expect(chatRequestSchema.safeParse({ ...base, timezone: "Mars/Olympus" }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ ...base, pageUrl: "https://evil.example" }).success).toBe(
      false,
    );
    expect(chatRequestSchema.safeParse({ ...base, pageUrl: "//evil.example" }).success).toBe(false);
  });

  it("caps browser-provided history", () => {
    const history = Array.from({ length: 41 }, () => ({ role: "user", content: "hi" }));

    expect(chatRequestSchema.safeParse({ sessionId, message: "Hello", history }).success).toBe(
      false,
    );
  });

  it("treats blank optional values as missing", () => {
    const result = chatRequestSchema.parse({
      sessionId,
      message: "Hello",
      turnstileToken: " ",
      timezone: "",
      pageUrl: "",
    });

    expect(result.turnstileToken).toBeUndefined();
    expect(result.timezone).toBeUndefined();
    expect(result.pageUrl).toBeUndefined();
  });
});

describe("tool argument schemas", () => {
  it("rejects header injection in a lead name", () => {
    expect(
      saveLeadArgsSchema.safeParse({
        name: "Ada\r\nBcc: attacker@example.com",
        email: "ada@example.com",
      }).success,
    ).toBe(false);
  });

  it("normalizes email addresses", () => {
    const result = saveLeadArgsSchema.parse({ name: "Ada", email: " ADA@Example.COM " });
    expect(result.email).toBe("ada@example.com");
  });

  it("validates availability timezones and booking slot ids", () => {
    expect(availabilityArgsSchema.safeParse({ timezone: "Asia/Manila" }).success).toBe(true);
    expect(availabilityArgsSchema.safeParse({ timezone: "not/a-zone" }).success).toBe(false);
    expect(
      bookCallArgsSchema.safeParse({
        slot_id: "../../etc/passwd",
        name: "Ada",
        email: "ada@example.com",
      }).success,
    ).toBe(false);
  });

  it("keeps search and solution brief inputs bounded", () => {
    expect(searchKnowledgeArgsSchema.safeParse({ query: "xx" }).success).toBe(true);
    expect(searchKnowledgeArgsSchema.safeParse({ query: "x" }).success).toBe(false);
    expect(
      solutionBriefArgsSchema.safeParse({
        email: "ada@example.com",
        summary: "A short summary of the problem.",
      }).success,
    ).toBe(true);
    expect(
      solutionBriefArgsSchema.safeParse({ email: "not-an-email", summary: "A short summary." })
        .success,
    ).toBe(false);
  });

  it("allows a handoff without contact details", () => {
    expect(handoffArgsSchema.safeParse({ reason: "Needs a person" }).success).toBe(true);
  });
});
