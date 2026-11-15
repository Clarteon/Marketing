import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatUnavailableError, streamModelCompletion } from "@/lib/chat/model";

const PRIMARY = "openai/gpt-oss-120b";
const FALLBACK = "openai/gpt-oss-20b";

function rateLimited(): Response {
  return new Response(JSON.stringify({ error: { code: "rate_limited" } }), {
    status: 429,
    headers: { "retry-after": "0" },
  });
}

function streamed(text: string): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            choices: [{ delta: { content: text }, finish_reason: "stop" }],
          })}\n\n`,
        ),
      );
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function fetchFor(models: { fail: string[]; answer: string }): typeof fetch {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { model: string };
    return models.fail.includes(body.model) ? rateLimited() : streamed(models.answer);
  }) as unknown as typeof fetch;
}

function completion(fetchImpl: typeof fetch) {
  return streamModelCompletion({
    apiKey: "test-key",
    models: [PRIMARY, FALLBACK],
    messages: [{ role: "user", content: "Hello" }],
    tools: [],
    onText: vi.fn(),
    fetchImpl,
    sleep: async () => undefined,
    now: () => 0,
    timeoutMs: 1_000,
    turnTimeoutMs: 5_000,
  });
}

describe("scenario 22: rate limit hit", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to the next model after a 429", async () => {
    const result = await completion(
      fetchFor({ fail: [PRIMARY], answer: "I can still help with that." }),
    );

    expect(result).toMatchObject({
      model: FALLBACK,
      content: "I can still help with that.",
      toolCalls: [],
    });
  });

  it("reports rate_limited after every model fails", async () => {
    await expect(
      completion(fetchFor({ fail: [PRIMARY, FALLBACK], answer: "" })),
    ).rejects.toMatchObject({
      name: "ChatUnavailableError",
      code: "rate_limited",
    });
    await expect(
      completion(fetchFor({ fail: [PRIMARY, FALLBACK], answer: "" })),
    ).rejects.toBeInstanceOf(ChatUnavailableError);
  });
});
