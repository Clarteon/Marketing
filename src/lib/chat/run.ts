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
import { classifyChatScope, scopeReply } from "./scope";
import {
  actionReply,
  hasSensitiveContent,
  isAction,
  proposeAction,
  readConfirmedAction,
  type ActionConfirmation,
} from "./confirmation";
import { chatSessionSecret } from "./session";

export interface RunChatDependencies {
  config?: Pick<Env, "GROQ_API_KEY" | "LLM_MODEL_PRIMARY" | "LLM_MODEL_FALLBACKS">;
  models?: string[];
  now?: Date;
  streamModel?: typeof streamModelCompletion;
  executeTool?: typeof executeChatTool;
  toolDependencies?: ChatToolDependencies;
  classifyScope?: typeof classifyChatScope;
  confirmationSecret?: string;
}

export interface RunChatInput {
  request: ChatRequest;
  sessionId: string;
  ip: string;
  pageUrl: string;
  signal?: AbortSignal;
  onText: (text: string) => void;
  onStatus?: (status: string) => void;
  onConfirmation?: (confirmation: ActionConfirmation) => void;
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
  onConfirmation,
  deps = {},
}: RunChatInput): Promise<RunChatResult> {
  const deadline = Date.now() + 50_000;
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
  const complete = (text: string): RunChatResult => {
    onText(text);
    return { degraded: false, toolRounds: 0 };
  };
  if (hasSensitiveContent(request.message))
    return complete(
      "Please don’t share passwords, payment details or identification here. Describe the business problem without sensitive information.",
    );
  const declaredMinor = [
    request.message,
    ...request.history.filter((item) => item.role === "user").map((item) => item.content),
  ].some((text) =>
    /\b(?:i(?:’|'| a)?m|i am|age(?:d)?|edad ko(?: ay)?)\s+(?:[1-9]|1[0-7])(?:\s*(?:years? old|y\/?o|taong gulang))?\b|\b(?:i am|i’m|i'm) under 18\b/i.test(
      text,
    ),
  );
  if (declaredMinor)
    return complete(
      "Clarteon works with businesses. If you’re under 18, please don’t share personal details here; I won’t arrange a booking.",
    );

  const executeTool = deps.executeTool ?? executeChatTool;
  if (request.confirmationToken) {
    const secret = deps.confirmationSecret ?? chatSessionSecret();
    const confirmed =
      secret && readConfirmedAction(request.confirmationToken, sessionId, secret, now.getTime());
    if (!confirmed || request.message !== "Confirm this action.")
      return complete(
        "That confirmation is invalid or expired. Please ask me to prepare the details again.",
      );
    const result = await executeTool(confirmed.action, confirmed.args, {
      sessionId,
      ip,
      pageUrl,
      latestMessage: request.message,
      priceIntent: false,
      now,
      timezone: confirmed.timezone,
      actionConfirmed: true,
      deps: deps.toolDependencies,
    });
    return complete(actionReply(confirmed.action, result));
  }
  if (!chatBudgetAvailable(now.getTime())) return { degraded: true, toolRounds: 0 };
  const safeHistory = request.history.map((item) =>
    hasSensitiveContent(item.content) ? { ...item, content: "Sensitive message omitted." } : item,
  );
  let decision;
  try {
    decision = await (deps.classifyScope ?? classifyChatScope)({
      message: request.message,
      history: safeHistory,
      apiKey: config.GROQ_API_KEY,
      models,
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw new ChatUnavailableError("aborted");
    logServerEvent("chat_scope_unavailable");
    if (error instanceof ChatUnavailableError) return { degraded: true, toolRounds: 0 };
    return complete(
      "I couldn’t check that request right now. Please try again with a question about Clarteon or a business technology project.",
    );
  }
  logServerEvent("chat_scope", { kind: decision.kind });
  const redirect = scopeReply(decision, request.message);
  if (redirect) return complete(redirect);
  const businessMessage = decision.kind === "mixed" ? decision.businessMessage : request.message;
  onStatus?.("working");
  const priceIntent = hasPriceIntent(businessMessage);
  const systemPrompt = buildSystemPrompt(now);
  const messages: ModelMessage[] = buildModelMessages({
    systemPrompt,
    history: safeHistory,
    message: businessMessage,
    priceIntent,
  });

  if (decision.language === "fil")
    messages.splice(1, 0, {
      role: "system",
      content:
        "Reply throughout in natural Filipino or Taglish, including the closing sentence. The visitor prefers that language even if a business-only extract was written in English.",
    });

  const context: ChatToolContext = {
    sessionId,
    ip,
    pageUrl,
    latestMessage: businessMessage,
    priceIntent,
    now,
    timezone: request.timezone,
    deps: deps.toolDependencies,
  };

  const modelsToUse = deps.streamModel ?? streamModelCompletion;
  let toolRounds = 0;
  let model: string | undefined;

  while (true) {
    if (!chatBudgetAvailable(now.getTime())) {
      logServerEvent("chat_budget_exhausted", { model: model ?? "none" });
      return { degraded: true, toolRounds, model };
    }

    const requestTokens = estimateTokens(messages) + estimateTokens(chatTools) + 120;
    if (Date.now() >= deadline) return { degraded: true, toolRounds, model };
    const result = await modelsToUse({
      apiKey: config.GROQ_API_KEY,
      models,
      messages,
      tools: chatTools,
      // Hold provider text until this round is complete. A proposal or failed
      // round must never stream an unverified success claim to the visitor.
      onText: () => undefined,
      signal,
      turnTimeoutMs: Math.max(1, deadline - Date.now()),
      now: deps.now ? () => now.getTime() : undefined,
    });
    model = result.model;

    recordChatTokens(requestTokens + estimateTokens(result.content) + 160, now.getTime());

    if (result.toolCalls.length === 0) {
      const claimsAction =
        /\b(?:i(?:’ve|'ve| have)? (?:sent|booked|saved|notified)|(?:your|the) (?:discovery )?(?:call|meeting|booking|email|details) (?:is|was|has been|were) (?:booked|confirmed|sent|saved))\b/i.test(
          result.content,
        );
      if (claimsAction)
        return complete(
          "I haven’t completed an action in this reply. Booking, saving details and sending messages require your confirmation first.",
        );
      // Keep the first question and omit a trailing questionnaire. Markdown
      // link destinations are excluded so URL query strings don't count.
      const prose = result.content.replace(/\]\([^)]*\)/g, (link) => " ".repeat(link.length));
      const text =
        (prose.match(/\?/g)?.length ?? 0) > 1
          ? result.content.slice(0, prose.indexOf("?") + 1)
          : result.content;
      onText(text);
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
      if (index < CHAT_MAX_TOOL_CALLS && isAction(call.function.name)) {
        if (
          /\b(?:don[’']t|do not|not yet|nothing yet|without (?:booking|sending|saving)|continue here|keep chatting)\b/i.test(
            request.message,
          )
        ) {
          return complete("We can keep discussing it here. I won’t book, save or send anything.");
        }
        const args = parseArguments(call.function.arguments);
        const secret = deps.confirmationSecret ?? chatSessionSecret();
        if (!secret || !onConfirmation)
          return complete(
            "I can discuss the next step here, but action confirmation is unavailable. Nothing was booked, saved or sent.",
          );
        try {
          if (hasPriceIntent(String((args as Record<string, unknown> | undefined)?.summary ?? "")))
            throw new Error("pricing_content");
          const confirmation = proposeAction(
            {
              sid: sessionId,
              action: call.function.name,
              args: args as Record<string, unknown>,
              timezone: context.timezone,
            },
            secret,
            now.getTime(),
          );
          onConfirmation(confirmation);
          onText(
            "Please review the details below. Use **Confirm** only if they are correct; nothing has been booked, saved or sent yet.",
          );
          return { degraded: false, model, toolRounds };
        } catch {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: toolMessage({
              ok: false,
              error: "invalid_action",
              message:
                "Check the details. Do not include sensitive information, pricing or an invalid slot. Nothing was done.",
            }),
          });
          continue;
        }
      }
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
