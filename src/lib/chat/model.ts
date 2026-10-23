import "server-only";
import { logServerEvent } from "@/lib/log";
import type { Env } from "@/lib/env-schema";
import {
  CHAT_MAX_COMPLETION_TOKENS,
  CHAT_MODEL_TIMEOUT_MS,
  CHAT_TURN_TIMEOUT_MS,
} from "./constants";
import type { ModelMessage, ModelToolCall, ToolDefinition, ChatModelResult } from "./types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const STREAM_DONE = "[" + "DONE]";
const SAFE_MODEL = /^[A-Za-z0-9._/-]{1,100}$/;
const SAFE_CODE = /^[A-Za-z0-9_.:-]{1,80}$/;

export class ChatUnavailableError extends Error {
  readonly code: string;

  constructor(code = "unavailable") {
    super("The chat model is unavailable.");
    this.name = "ChatUnavailableError";
    this.code = SAFE_CODE.test(code) ? code : "unavailable";
  }
}

export class ChatStreamError extends Error {
  readonly code: string;
  readonly emitted: boolean;

  constructor(code = "stream_failed", emitted = false) {
    super("The chat model stopped before finishing.");
    this.name = "ChatStreamError";
    this.code = SAFE_CODE.test(code) ? code : "stream_failed";
    this.emitted = emitted;
  }
}

/** Keep the model chain in configuration, with a safe unique list. */
export function configuredModels(
  config: Pick<Env, "LLM_MODEL_PRIMARY" | "LLM_MODEL_FALLBACKS">,
): string[] {
  const models = [config.LLM_MODEL_PRIMARY, ...config.LLM_MODEL_FALLBACKS.split(",")]
    .map((model) => model.trim())
    .filter((model) => SAFE_MODEL.test(model));
  return [...new Set(models)].slice(0, 4);
}

interface ModelRequestOptions {
  apiKey: string;
  models: string[];
  messages: ModelMessage[];
  tools: ToolDefinition[];
  onText: (text: string) => void;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  timeoutMs?: number;
  turnTimeoutMs?: number;
  maxCompletionTokens?: number;
}

interface RawCompletion {
  content: string;
  toolCalls: ModelToolCall[];
  finishReason?: string;
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function modelParameters(model: string, maxCompletionTokens: number): Record<string, unknown> {
  const parameters: Record<string, unknown> = {
    temperature: 0.5,
    top_p: 0.95,
    max_completion_tokens: maxCompletionTokens,
  };

  if (model.startsWith("openai/gpt-oss")) {
    // Reasoning content is useful for the model but not for a website visitor.
    parameters.include_reasoning = false;
    parameters.reasoning_effort = "low";
  } else if (model.startsWith("qwen/")) {
    parameters.reasoning_effort = "none";
    parameters.reasoning_format = "hidden";
  }

  return parameters;
}

function requestBody(
  model: string,
  messages: ModelMessage[],
  tools: ToolDefinition[],
  maxCompletionTokens: number,
): Record<string, unknown> {
  return {
    model,
    messages,
    tools,
    tool_choice: "auto",
    stream: true,
    ...modelParameters(model, maxCompletionTokens),
  };
}

async function responseCode(response: Response): Promise<string> {
  if (response.status === 429) return "rate_limited";
  if (response.status === 401 || response.status === 403) return "auth";
  if (response.status === 400) return "bad_request";
  if (response.status >= 500) return "provider_error";

  try {
    const text = (await response.text()).slice(0, 20_000);
    const body = JSON.parse(text) as { error?: { code?: unknown } };
    const code = body.error?.code;
    if (typeof code === "string" && SAFE_CODE.test(code)) return code;
  } catch {
    // Never surface a provider body to the visitor or log it.
  }

  return "provider_error";
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

function appendToolCall(
  calls: Map<number, ModelToolCall>,
  index: number,
  delta: {
    id?: string;
    function?: { name?: string; arguments?: string };
  },
): void {
  const current =
    calls.get(index) ??
    ({
      id: "",
      type: "function",
      function: { name: "", arguments: "" },
    } satisfies ModelToolCall);

  if (delta.id) current.id = delta.id;
  if (delta.function?.name) current.function.name += delta.function.name;
  if (delta.function?.arguments) current.function.arguments += delta.function.arguments;
  calls.set(index, current);
}

async function readStream(
  response: Response,
  onText: (text: string) => void,
  signal?: AbortSignal,
  timeoutMs = CHAT_MODEL_TIMEOUT_MS,
): Promise<RawCompletion> {
  if (!response.body) throw new ChatUnavailableError("empty_stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const deadline = Date.now() + Math.max(1, timeoutMs);
  let buffer = "";
  let content = "";
  let finishReason: string | undefined;
  const calls = new Map<number, ModelToolCall>();

  const readChunk = async (): Promise<ReadableStreamReadResult<Uint8Array>> => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new ChatUnavailableError("stream_timeout");

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new ChatUnavailableError("stream_timeout"));
            void reader.cancel().catch(() => undefined);
          }, remaining);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const processLine = (rawLine: string): void => {
    const line = rawLine.replace(/\r$/, "");
    if (!line || line.startsWith(":") || !line.startsWith("data:")) return;

    const data = line.slice(5).trim();
    if (!data || data === STREAM_DONE) return;

    let event: {
      error?: { code?: unknown; message?: unknown };
      choices?: Array<{
        delta?: {
          content?: unknown;
          tool_calls?: Array<{
            index?: number;
            id?: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
        finish_reason?: string;
      }>;
    };

    try {
      event = JSON.parse(data);
    } catch {
      throw new ChatStreamError("invalid_stream", Boolean(content));
    }

    if (event.error) {
      const providerCode =
        typeof event.error.code === "string" && SAFE_CODE.test(event.error.code)
          ? event.error.code
          : "provider_error";
      throw new ChatStreamError(providerCode, Boolean(content));
    }

    const choice = event.choices?.[0];
    const delta = choice?.delta;
    if (typeof delta?.content === "string" && delta.content) {
      content += delta.content;
      onText(delta.content);
    }

    for (const call of delta?.tool_calls ?? []) {
      appendToolCall(calls, Number.isInteger(call.index) ? Number(call.index) : 0, call);
    }

    if (choice?.finish_reason) finishReason = choice.finish_reason;
  };

  try {
    while (true) {
      if (signal?.aborted) throw new ChatUnavailableError("aborted");
      const { done, value } = await readChunk();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
        processLine(line);
      }
    }

    // Some providers end the stream without a final newline. Flush the decoder
    // and read that last line instead of dropping it.
    buffer += decoder.decode();
    if (buffer.trim()) processLine(buffer);
  } finally {
    reader.releaseLock();
  }

  const toolCalls = [...calls.entries()]
    .sort(([left], [right]) => left - right)
    .map(([index, call]) => ({
      ...call,
      id: call.id || `call_${index}`,
      function: {
        name: call.function.name,
        arguments: call.function.arguments || "{}",
      },
    }))
    .filter((call) => call.function.name.length > 0);

  return { content, toolCalls, finishReason };
}

/**
 * Stream one model round, walking the configured fallback chain. Text is
 * forwarded as it arrives; a failure after the first visible token is not
 * retried, because replaying it would duplicate the visitor's answer.
 */
export async function streamModelCompletion({
  apiKey,
  models,
  messages,
  tools,
  onText,
  signal,
  fetchImpl = fetch,
  sleep = delay,
  now = Date.now,
  timeoutMs = CHAT_MODEL_TIMEOUT_MS,
  turnTimeoutMs = CHAT_TURN_TIMEOUT_MS,
  maxCompletionTokens = CHAT_MAX_COMPLETION_TOKENS,
}: ModelRequestOptions): Promise<ChatModelResult> {
  const uniqueModels = [...new Set(models.filter((model) => SAFE_MODEL.test(model)))];
  if (!apiKey || uniqueModels.length === 0) throw new ChatUnavailableError("not_configured");

  const startedAt = now();
  let lastCode = "unavailable";
  let emitted = false;

  const emit = (text: string) => {
    emitted = true;
    onText(text);
  };

  for (const model of uniqueModels) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (signal?.aborted) throw new ChatUnavailableError("aborted");
      if (now() - startedAt > turnTimeoutMs) throw new ChatUnavailableError("turn_timeout");
      const remainingForAttempt = Math.max(
        1,
        Math.min(timeoutMs, turnTimeoutMs - (now() - startedAt)),
      );

      let response: Response;
      try {
        response = await fetchWithTimeout(
          fetchImpl,
          GROQ_URL,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              Accept: "text/event-stream",
            },
            body: JSON.stringify(requestBody(model, messages, tools, maxCompletionTokens)),
          },
          remainingForAttempt,
          signal,
        );
      } catch {
        lastCode = signal?.aborted ? "aborted" : "network";
        if (attempt === 0) {
          await sleep(400);
          continue;
        }
        break;
      }

      if (!response.ok) {
        const code = await responseCode(response);
        lastCode = code;
        if (code === "auth") throw new ChatUnavailableError("auth");
        if ((code === "rate_limited" || code === "provider_error") && attempt === 0) {
          const retryAfter = Number(response.headers.get("retry-after"));
          const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : 500;
          await sleep(Math.min(wait, 2_000));
          continue;
        }
        break;
      }

      try {
        const remainingForStream = Math.max(
          1,
          Math.min(timeoutMs, turnTimeoutMs - (now() - startedAt)),
        );
        const result = await readStream(response, emit, signal, remainingForStream);
        if (result.content.length === 0 && result.toolCalls.length === 0) {
          lastCode = "empty_response";
          break;
        }

        logServerEvent("chat_model_used", { model });
        return { model, ...result };
      } catch (error) {
        if (error instanceof ChatUnavailableError && error.code === "aborted") throw error;
        if (emitted) {
          throw new ChatStreamError(
            error instanceof ChatStreamError ? error.code : "stream_failed",
            true,
          );
        }
        lastCode =
          error instanceof ChatStreamError || error instanceof ChatUnavailableError
            ? error.code
            : "stream_failed";
        break;
      }
    }

    logServerEvent("chat_model_fallback", { from: model, code: lastCode });
  }

  throw new ChatUnavailableError(lastCode);
}
