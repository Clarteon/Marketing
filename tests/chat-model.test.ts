import { describe, expect, it, vi } from "vitest";
import { ChatUnavailableError, configuredModels, streamModelCompletion } from "@/lib/chat/model";
import type { ModelMessage } from "@/lib/chat/types";

const messages: ModelMessage[] = [{ role: "user", content: "Hello" }];

function sse(events: Array<Record<string, unknown>>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

function completion(content: string): Record<string, unknown> {
  return { choices: [{ delta: { content } }] };
}

const base = {
  apiKey: "test-key",
  models: ["openai/gpt-oss-120b"],
  messages,
  tools: [],
  onText: () => {},
  sleep: async () => {},
  now: () => 0,
};

describe("Groq model client", () => {
  it("streams text and sends a stable, low-reasoning request", async () => {
    const onText = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(sse([completion("Hello "), completion("there.")]));

    const result = await streamModelCompletion({
      ...base,
      fetchImpl: fetchMock,
      onText,
    });

    expect(result.content).toBe("Hello there.");
    expect(result.model).toBe("openai/gpt-oss-120b");
    expect(onText.mock.calls.map(([text]) => text)).toEqual(["Hello ", "there."]);

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      model: "openai/gpt-oss-120b",
      stream: true,
      include_reasoning: false,
      reasoning_effort: "low",
      max_completion_tokens: 600,
    });
  });

  it("assembles streamed tool calls, including split arguments", async () => {
    const response = sse([
      {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: "call_1",
                  function: { name: "search_knowledge", arguments: '{"query":"auto' },
                },
              ],
            },
          },
        ],
      },
      {
        choices: [
          {
            delta: {
              tool_calls: [{ index: 0, function: { arguments: 'mation"}' } }],
            },
          },
        ],
      },
    ]);
    const fetchMock = vi.fn().mockResolvedValue(response);

    const result = await streamModelCompletion({ ...base, fetchImpl: fetchMock });

    expect(result.toolCalls).toEqual([
      {
        id: "call_1",
        type: "function",
        function: { name: "search_knowledge", arguments: '{"query":"automation"}' },
      },
    ]);
  });

  it("retries a rate limit and then falls back to the next model", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: "rate_limited" } }), { status: 429 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: "bad_request" } }), {
          status: 400,
        }),
      )
      .mockResolvedValueOnce(sse([completion("Fallback reply")]));

    const result = await streamModelCompletion({
      ...base,
      models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.model).toBe("openai/gpt-oss-20b");
    expect(result.content).toBe("Fallback reply");
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).model).toBe("openai/gpt-oss-20b");
  });

  it("does not replay a reply after some text was already shown", async () => {
    const onText = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(sse([completion("Hi"), { error: { code: "provider_error" } }]));

    await expect(
      streamModelCompletion({ ...base, fetchImpl: fetchMock, onText }),
    ).rejects.toMatchObject({ name: "ChatStreamError", emitted: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(onText).toHaveBeenCalledWith("Hi");
  });

  it("returns a safe unavailable error when every model fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "rate_limited" } }), {
        status: 429,
      }),
    );

    await expect(
      streamModelCompletion({
        ...base,
        models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
        fetchImpl: fetchMock,
      }),
    ).rejects.toBeInstanceOf(ChatUnavailableError);
  });

  it("rejects an empty stream so another model can try", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(sse([]))
      .mockResolvedValueOnce(sse([completion("Second try")]));

    const result = await streamModelCompletion({
      ...base,
      models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
      fetchImpl: fetchMock,
    });

    expect(result.content).toBe("Second try");
    expect(result.model).toBe("openai/gpt-oss-20b");
  });

  it("keeps only safe, unique configured models", () => {
    expect(
      configuredModels({
        LLM_MODEL_PRIMARY: "openai/gpt-oss-120b",
        LLM_MODEL_FALLBACKS: "openai/gpt-oss-120b, openai/gpt-oss-20b, bad model, qwen/qwen3.8-27b",
      }),
    ).toEqual(["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]);
  });

  it("reads a final data line even when the stream has no trailing newline", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(completion("Last line"))}`));
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status: 200 }));

    const result = await streamModelCompletion({ ...base, fetchImpl: fetchMock });

    expect(result.content).toBe("Last line");
  });

  it("stops a stream that never finishes", async () => {
    const body = new ReadableStream<Uint8Array>({ start() {} });
    const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status: 200 }));

    await expect(
      streamModelCompletion({ ...base, fetchImpl: fetchMock, timeoutMs: 20 }),
    ).rejects.toMatchObject({ code: "stream_timeout" });
  });

  it("turns a stream parse failure into a safe error", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("data: {not-json}\n\n"));
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status: 200 }));

    await expect(streamModelCompletion({ ...base, fetchImpl: fetchMock })).rejects.toBeInstanceOf(
      ChatUnavailableError,
    );
  });
});
