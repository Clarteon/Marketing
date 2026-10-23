import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatUnavailableError } from "@/lib/chat/model";
import { runChatTurn } from "@/lib/chat/run";
import { resetChatUsageForTests, recordChatTokens } from "@/lib/chat/usage";
import type { ChatRequest } from "@/lib/chat/schema";
import type { ChatModelResult, ModelToolCall } from "@/lib/chat/types";

vi.mock("@/lib/alerts", () => ({ alertTeam: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/chat/tools", () => ({
  chatTools: [],
  executeChatTool: vi.fn(),
}));

const config = {
  GROQ_API_KEY: "test-key",
  LLM_MODEL_PRIMARY: "openai/gpt-oss-120b",
  LLM_MODEL_FALLBACKS: "",
};

function request(message: string): ChatRequest {
  return {
    sessionId: crypto.randomUUID(),
    message,
    history: [],
  };
}

function toolCall(id: string, name: string, args: string): ModelToolCall {
  return { id, type: "function", function: { name, arguments: args } };
}

function resultWithToolCalls(calls: ModelToolCall[]): ChatModelResult {
  return { model: "test-model", content: "", toolCalls: calls };
}

describe("Clara turn orchestration", () => {
  beforeEach(() => {
    resetChatUsageForTests();
  });

  it("runs a tool round and sends its result back to the model", async () => {
    const onText = vi.fn();
    const streamModel = vi
      .fn()
      .mockResolvedValueOnce(
        resultWithToolCalls([toolCall("call_1", "search_knowledge", '{"query":"automation"}')]),
      )
      .mockImplementationOnce(async (options: { onText: (text: string) => void }) => {
        options.onText("We can automate the repetitive steps.");
        return {
          model: "test-model",
          content: "We can automate the repetitive steps.",
          toolCalls: [],
        };
      });
    const executeTool = vi.fn().mockResolvedValue({ ok: true, results: [] });

    const result = await runChatTurn({
      request: request("What can you automate?"),
      sessionId: crypto.randomUUID(),
      ip: "203.0.113.7",
      pageUrl: "/solutions",
      onText,
      deps: {
        config,
        streamModel: streamModel as never,
        executeTool: executeTool as never,
      },
    });

    expect(result).toMatchObject({ degraded: false, toolRounds: 1, model: "test-model" });
    expect(executeTool).toHaveBeenCalledWith(
      "search_knowledge",
      { query: "automation" },
      expect.objectContaining({ pageUrl: "/solutions" }),
    );
    expect(onText).toHaveBeenCalledWith("We can automate the repetitive steps.");

    const secondMessages = streamModel.mock.calls[1][0].messages as Array<{
      role: string;
      tool_call_id?: string;
      content: string;
    }>;
    expect(
      secondMessages.some(
        (message) => message.role === "tool" && message.tool_call_id === "call_1",
      ),
    ).toBe(true);
  });

  it("executes at most four tools and tells the model why the rest were skipped", async () => {
    const calls = Array.from({ length: 5 }, (_, index) =>
      toolCall(`call_${index + 1}`, "search_knowledge", '{"query":"automation"}'),
    );
    const streamModel = vi
      .fn()
      .mockResolvedValueOnce(resultWithToolCalls(calls))
      .mockResolvedValueOnce({ model: "test-model", content: "Done.", toolCalls: [] });
    const executeTool = vi.fn().mockResolvedValue({ ok: true });

    const result = await runChatTurn({
      request: request("Tell me more."),
      sessionId: crypto.randomUUID(),
      ip: "203.0.113.7",
      pageUrl: "/",
      onText: vi.fn(),
      deps: {
        config,
        streamModel: streamModel as never,
        executeTool: executeTool as never,
      },
    });

    expect(result.degraded).toBe(false);
    expect(executeTool).toHaveBeenCalledTimes(4);
    const secondMessages = streamModel.mock.calls[1][0].messages as Array<{
      role: string;
      tool_call_id?: string;
      content: string;
    }>;
    const skipped = secondMessages.find(
      (message) => message.role === "tool" && message.tool_call_id === "call_5",
    );
    expect(skipped?.content).toContain("too_many_tool_calls");
  });

  it("turns malformed tool arguments into a safe tool result", async () => {
    const streamModel = vi
      .fn()
      .mockResolvedValueOnce(
        resultWithToolCalls([toolCall("call_1", "search_knowledge", "not json")]),
      )
      .mockResolvedValueOnce({ model: "test-model", content: "Let me ask again.", toolCalls: [] });
    const executeTool = vi.fn();

    await runChatTurn({
      request: request("Hello"),
      sessionId: crypto.randomUUID(),
      ip: "203.0.113.7",
      pageUrl: "/",
      onText: vi.fn(),
      deps: {
        config,
        streamModel: streamModel as never,
        executeTool: executeTool as never,
      },
    });

    expect(executeTool).not.toHaveBeenCalled();
    const secondMessages = streamModel.mock.calls[1][0].messages as Array<{
      role: string;
      content: string;
    }>;
    expect(
      secondMessages.some(
        (message) => message.role === "tool" && message.content.includes("invalid_arguments"),
      ),
    ).toBe(true);
  });

  it("stops after two tool rounds with an honest degraded result", async () => {
    const streamModel = vi
      .fn()
      .mockResolvedValue(
        resultWithToolCalls([toolCall("call_1", "search_knowledge", '{"query":"automation"}')]),
      );
    const executeTool = vi.fn().mockResolvedValue({ ok: true });

    const result = await runChatTurn({
      request: request("Keep looking."),
      sessionId: crypto.randomUUID(),
      ip: "203.0.113.7",
      pageUrl: "/",
      onText: vi.fn(),
      deps: {
        config,
        streamModel: streamModel as never,
        executeTool: executeTool as never,
      },
    });

    expect(result).toMatchObject({ degraded: true, toolRounds: 2 });
    expect(streamModel).toHaveBeenCalledTimes(3);
    expect(executeTool).toHaveBeenCalledTimes(2);
  });

  it("tells the model not to discuss pricing before the first call", async () => {
    const streamModel = vi
      .fn()
      .mockResolvedValue({ model: "test-model", content: "Let us talk.", toolCalls: [] });

    await runChatTurn({
      request: request("How much does a chatbot cost?"),
      sessionId: crypto.randomUUID(),
      ip: "203.0.113.7",
      pageUrl: "/",
      onText: vi.fn(),
      deps: { config, streamModel: streamModel as never },
    });

    const messages = streamModel.mock.calls[0][0].messages as Array<{
      role: string;
      content: string;
    }>;
    expect(messages[1]).toMatchObject({
      role: "system",
      content: expect.stringContaining("asks about pricing"),
    });
  });

  it("refuses to call a model when the daily budget is spent", async () => {
    recordChatTokens(160_000);
    const streamModel = vi.fn();

    const result = await runChatTurn({
      request: request("Hello"),
      sessionId: crypto.randomUUID(),
      ip: "203.0.113.7",
      pageUrl: "/",
      onText: vi.fn(),
      deps: { config, streamModel: streamModel as never },
    });

    expect(result.degraded).toBe(true);
    expect(streamModel).not.toHaveBeenCalled();
  });

  it("reports a missing key instead of calling the provider", async () => {
    const streamModel = vi.fn();

    await expect(
      runChatTurn({
        request: request("Hello"),
        sessionId: crypto.randomUUID(),
        ip: "203.0.113.7",
        pageUrl: "/",
        onText: vi.fn(),
        deps: { config: { ...config, GROQ_API_KEY: "" }, streamModel: streamModel as never },
      }),
    ).rejects.toBeInstanceOf(ChatUnavailableError);
    expect(streamModel).not.toHaveBeenCalled();
  });
});
