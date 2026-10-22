import { describe, expect, it } from "vitest";
import { isUsefulQuestion, redactQuestion } from "@/lib/knowledge/redact";

describe("redactQuestion", () => {
  it("removes email addresses, phone numbers and links", () => {
    const value = redactQuestion(
      "Please email ada@example.com or call +63 917 123 4567 about https://example.com/private",
    );

    expect(value).toContain("[email]");
    expect(value).toContain("[number]");
    expect(value).toContain("[link]");
    expect(value).not.toContain("ada@example.com");
    expect(value).not.toContain("917");
    expect(value).not.toContain("example.com");
  });

  it("removes long numeric identifiers", () => {
    expect(redactQuestion("My account is 1234567890")).toBe("My account is [number]");
  });

  it("caps very long questions", () => {
    const value = redactQuestion("word ".repeat(300));
    expect(value.length).toBeLessThanOrEqual(501);
    expect(value.endsWith("…")).toBe(true);
  });

  it("keeps a normal question intact", () => {
    expect(redactQuestion("Do you build websites?")).toBe("Do you build websites?");
  });
});

describe("isUsefulQuestion", () => {
  it("rejects empty or punctuation-only text", () => {
    expect(isUsefulQuestion("")).toBe(false);
    expect(isUsefulQuestion("?!")).toBe(false);
    expect(isUsefulQuestion("hi")).toBe(false);
  });

  it("accepts a real question", () => {
    expect(isUsefulQuestion("How do I automate invoices?")).toBe(true);
  });
});
