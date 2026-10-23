import { describe, expect, it } from "vitest";
import {
  buildModelMessages,
  buildSystemPrompt,
  hasPriceIntent,
  trimHistory,
} from "@/lib/chat/prompt";

describe("Clara prompt", () => {
  it("recognizes price questions in English, Filipino and Taglish", () => {
    expect(hasPriceIntent("How much does a chatbot cost?")).toBe(true);
    expect(hasPriceIntent("What is your pricing?")).toBe(true);
    expect(hasPriceIntent("Magkano po ang bayad?")).toBe(true);
    expect(hasPriceIntent("Can you give me a quote in USD?")).toBe(true);
    expect(hasPriceIntent("What are your charges and retainer?")).toBe(true);
    expect(hasPriceIntent("What would ₱50,000 buy?")).toBe(true);
  });

  it("does not block ordinary questions that mention a rate of work", () => {
    expect(hasPriceIntent("Can you automate our weekly reporting process?")).toBe(false);
    expect(hasPriceIntent("How do you work with a small team?")).toBe(false);
  });

  it("keeps the changing date line at the end of the stable prompt", () => {
    const prompt = buildSystemPrompt(new Date("2026-10-23T08:00:00.000Z"));

    expect(prompt).toContain("You are Clara, the AI assistant for Clarteon");
    expect(prompt).toContain("<boundaries>");
    expect(prompt.trimEnd().endsWith("Today's date: October 23, 2026")).toBe(true);
  });

  it("keeps a short history intact", () => {
    const history = [
      { role: "user" as const, content: "Our reporting takes too long." },
      { role: "assistant" as const, content: "Who prepares it today?" },
    ];

    expect(trimHistory(history)).toEqual({ messages: history });
  });

  it("keeps the first problem and the most recent turns when history is long", () => {
    const history = Array.from({ length: 30 }, (_, index) => ({
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `Message ${index} ${"detail ".repeat(40)}`,
    }));

    const trimmed = trimHistory(history, 60);

    expect(trimmed.summary).toContain("Earlier context from the visitor");
    expect(trimmed.summary).toContain("Message 0");
    expect(trimmed.messages.length).toBeGreaterThan(0);
    expect(trimmed.messages.at(-1)?.content).toContain("Message 29");
  });

  it("puts the prompt first, the price guard next and the latest message last", () => {
    const messages = buildModelMessages({
      systemPrompt: "SYSTEM",
      history: [{ role: "user", content: "Our reporting takes too long." }],
      message: "How much does it cost?",
      priceIntent: true,
    });

    expect(messages[0]).toEqual({ role: "system", content: "SYSTEM" });
    expect(messages[1]?.role).toBe("system");
    expect(messages[1]?.content).toContain("asks about pricing");
    expect(messages.at(-1)).toEqual({ role: "user", content: "How much does it cost?" });
  });

  it("labels a trimmed earlier message as visitor text, not a system instruction", () => {
    const history = Array.from({ length: 20 }, (_, index) => ({
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `Turn ${index} ${"context ".repeat(40)}`,
    }));

    const messages = buildModelMessages({
      systemPrompt: "SYSTEM",
      history,
      message: "Latest question",
    });
    const summary = messages.find(
      (message) =>
        typeof message.content === "string" &&
        message.content.includes("Earlier context from the visitor"),
    );

    expect(summary?.role).toBe("user");
  });
});
