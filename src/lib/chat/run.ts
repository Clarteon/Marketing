import "server-only";
import { getConfig } from "@/lib/config";
import type { Env } from "@/lib/env-schema";
import { logServerEvent } from "@/lib/log";
import { CHAT_MAX_TOOL_CALLS, CHAT_MAX_TOOL_ROUNDS } from "./constants";
import { ChatUnavailableError, configuredModels, streamModelCompletion } from "./model";
import { buildModelMessages, buildSystemPrompt, hasPriceIntent } from "./prompt";
import type { ChatRequest } from "./schema";
import {
  executeChatTool,
  chatTools,
  type ChatToolContext,
  type ChatToolDependencies,
} from "./tools";
import { estimateTokens } from "./tokens";
import type { ModelMessage, ModelToolCall } from "./types";
import { chatBudgetAvailable, recordChatTokens } from "./usage";

export interface RunChatDependencies {
  config?: Pick<Env, "GROQ_API_KEY" | "LLM_MODEL_PRIMARY" | "LLM_MODEL_FALLBACKS">;
  models?: string[];
  now?: Date;
  streamModel?: typeof streamModelCompletion;
  executeTool?: typeof executeChatTool;
  toolDependencies?: ChatToolDependencies;
}

export interface RunChatInput {
  request: ChatRequest;
  sessionId: string;
  ip: string;
  pageUrl: string;
  signal?: AbortSignal;
  onText: (text: string) => void;
  onStatus?: (status: string) => void;
  deps?: RunChatDependencies;
}

export interface RunChatResult {
  degraded: boolean;
  model?: string;
  toolRounds: number;
}

function parseArguments(raw: string): unknown | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    const value: unknown = JSON.parse(trimmed);
    return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function toolMessage(result: unknown): string {
  let text: string;
  try {
    text = JSON.stringify(result) ?? JSON.stringify({ ok: false, error: "tool_result_failed" });
  } catch {
    text = JSON.stringify({ ok: false, error: "tool_result_failed" });
  }
  if (text.length <= 6_000) return text;
  return JSON.stringify({
    ok: false,
    error: "result_too_large",
    message: "The result was too large. Ask a narrower question or offer a handoff.",
  });
}

async function runTool(
  call: ModelToolCall,
  executeTool: typeof executeChatTool,
  context: ChatToolContext,
): Promise<unknown> {
  const args = parseArguments(call.function.arguments);
  if (args === undefined) {
    return {
      ok: false,
      error: "invalid_arguments",
      message: "The tool arguments were not valid JSON. Try again.",
    };
  }
  return executeTool(call.function.name, args, context);
}

/**
 * One Clara turn: at most three model rounds (the reply plus two tool rounds).
 * The model can change mid-turn if a provider fails before it has said anything.
 */
export async function runChatTurn({
  request,
  sessionId,
  ip,
  pageUrl,
  signal,
  onText,
  onStatus,
  deps = {},
}: RunChatInput): Promise<RunChatResult> {
  let config: Pick<Env, "GROQ_API_KEY" | "LLM_MODEL_PRIMARY" | "LLM_MODEL_FALLBACKS">;
  try {
    config = deps.config ?? getConfig();
  } catch {
    throw new ChatUnavailableError("config_invalid");
  }

  if (!config.GROQ_API_KEY) throw new ChatUnavailableError("not_configured");

  const models = deps.models ?? configuredModels(config);
  if (models.length === 0) throw new ChatUnavailableError("not_configured");

  const now = deps.now ?? new Date();
  const priceIntent = hasPriceIntent(request.message);
  const systemPrompt = buildSystemPrompt(now);
  const messages: ModelMessage[] = buildModelMessages({
    systemPrompt,
    history: request.history,
    message: request.message,
    priceIntent,
  });

  const context: ChatToolContext = {
    sessionId,
    ip,
    pageUrl,
    latestMessage: request.message,
    priceIntent,
    now,
    timezone: request.timezone,
    deps: deps.toolDependencies,
  };

  const modelsToUse = deps.streamModel ?? streamModelCompletion;
  const executeTool = deps.executeTool ?? executeChatTool;
  let toolRounds = 0;
  let model: string | undefined;

  while (true) {
    if (!chatBudgetAvailable(now.getTime())) {
      logServerEvent("chat_budget_exhausted", { model: model ?? "none" });
      return { degraded: true, toolRounds, model };
    }

    const requestTokens = estimateTokens(messages) + estimateTokens(chatTools) + 120;
    const result = await modelsToUse({
      apiKey: config.GROQ_API_KEY,
      models,
      messages,
      tools: chatTools,
      onText,
      signal,
      now: deps.now ? () => now.getTime() : undefined,
    });
    model = result.model;

    recordChatTokens(requestTokens + estimateTokens(result.content) + 160, now.getTime());

    if (result.toolCalls.length === 0) {
      logServerEvent("chat_turn_complete", {
        model: result.model,
        toolRounds,
        chars: result.content.length,
      });
      return { degraded: false, model: result.model, toolRounds };
    }

    if (toolRounds >= CHAT_MAX_TOOL_ROUNDS) {
      logServerEvent("chat_tool_round_limit", { model: result.model, toolRounds });
      return { degraded: true, model: result.model, toolRounds };
    }

    toolRounds += 1;
    onStatus?.("working");

    messages.push({
      role: "assistant",
      content: result.content || null,
      tool_calls: result.toolCalls,
    });

    for (let index = 0; index < result.toolCalls.length; index += 1) {
      const call = result.toolCalls[index];
      const toolResult =
        index < CHAT_MAX_TOOL_CALLS
          ? await runTool(call, executeTool, context)
          : {
              ok: false,
              error: "too_many_tool_calls",
              message: "Use at most four tools in one turn. Ask the visitor a question.",
            };
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: toolMessage(toolResult),
      });
    }
  }
}
