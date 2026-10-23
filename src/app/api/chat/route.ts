import {
  CHAT_BODY_MAX_BYTES,
  CHAT_BUSY_MESSAGE,
  CHAT_DEGRADED_MESSAGE,
  CHAT_IP_RATE_LIMIT,
  CHAT_RATE_WINDOW_MS,
  CHAT_SESSION_RATE_LIMIT,
  CHAT_TURNSTILE_ACTION,
} from "@/lib/chat/constants";
import { ChatStreamError, ChatUnavailableError } from "@/lib/chat/model";
import { runChatTurn } from "@/lib/chat/run";
import { chatRequestSchema } from "@/lib/chat/schema";
import {
  chatCookie,
  chatSessionSecret,
  createChatSessionToken,
  hasChatSession,
} from "@/lib/chat/session";
import { getConfig } from "@/lib/config";
import { isAllowedOrigin } from "@/lib/guardrails/origin";
import { checkRateLimit, hashRateLimitKey } from "@/lib/guardrails/rate-limit";
import { getClientIp, readJsonBody } from "@/lib/guardrails/request";
import { verifyTurnstile } from "@/lib/guardrails/turnstile";
import { logServerEvent } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(
  body: Record<string, unknown>,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function safeErrorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && /^[A-Za-z0-9_.:-]{1,60}$/.test(code)) return code;
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string" && /^[A-Za-z0-9_.:-]{1,60}$/.test(name)) return name;
  }
  return "unknown";
}

export async function GET(): Promise<Response> {
  return json({ ok: false, error: "method_not_allowed" }, 405, { Allow: "POST" });
}

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  const body = await readJsonBody(request, CHAT_BODY_MAX_BYTES);
  if (!body.ok) return json({ ok: false, error: body.code }, body.status);

  const parsed = chatRequestSchema.safeParse(body.data);
  if (!parsed.success) return json({ ok: false, error: "invalid_input" }, 400);
  const input = parsed.data;

  let config;
  try {
    config = getConfig();
  } catch {
    logServerEvent("chat_config_invalid");
    return json({ ok: false, error: "chat_unavailable" }, 503);
  }

  if (!config.GROQ_API_KEY) {
    logServerEvent("chat_not_configured");
    return json({ ok: false, error: "chat_unavailable" }, 503);
  }

  if (input.history.length + 1 > config.CHAT_MAX_MESSAGES) {
    return json({ ok: false, error: "message_limit" }, 429);
  }

  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(
    `chat:ip:${hashRateLimitKey(ip)}`,
    CHAT_IP_RATE_LIMIT,
    CHAT_RATE_WINDOW_MS,
  );
  if (!ipLimit.allowed) {
    return json({ ok: false, error: "rate_limited" }, 429, {
      "Retry-After": String(ipLimit.retryAfterSeconds),
    });
  }

  const sessionLimit = checkRateLimit(
    `chat:session:${hashRateLimitKey(input.sessionId)}`,
    CHAT_SESSION_RATE_LIMIT,
    CHAT_RATE_WINDOW_MS,
  );
  if (!sessionLimit.allowed) {
    return json({ ok: false, error: "rate_limited" }, 429, {
      "Retry-After": String(sessionLimit.retryAfterSeconds),
    });
  }

  let newCookie: string | undefined;
  if (!hasChatSession(request, input.sessionId)) {
    if (!input.turnstileToken) {
      return json({ ok: false, error: "bot_check_required" }, 403);
    }
    if (!config.TURNSTILE_SECRET_KEY) {
      logServerEvent("chat_turnstile_not_configured");
      return json({ ok: false, error: "bot_check_unavailable" }, 503);
    }

    let verified = false;
    try {
      verified = await verifyTurnstile(
        input.turnstileToken,
        ip,
        config.TURNSTILE_SECRET_KEY,
        CHAT_TURNSTILE_ACTION,
      );
    } catch {
      logServerEvent("chat_turnstile_unavailable");
      return json({ ok: false, error: "bot_check_unavailable" }, 503);
    }
    if (!verified) return json({ ok: false, error: "bot_check_failed" }, 403);

    const secret = chatSessionSecret();
    if (!secret) {
      logServerEvent("chat_session_secret_missing");
      return json({ ok: false, error: "chat_unavailable" }, 503);
    }
    newCookie = chatCookie(createChatSessionToken(input.sessionId, secret));
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      let sentText = false;

      const send = (event: Record<string, unknown>) => {
        if (!open || request.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          open = false;
        }
      };

      try {
        const result = await runChatTurn({
          request: input,
          sessionId: input.sessionId,
          ip,
          pageUrl: input.pageUrl ?? "/",
          signal: request.signal,
          onText: (text) => {
            sentText = true;
            send({ type: "text", text });
          },
          onStatus: (status) => send({ type: "status", status }),
        });

        if (result.degraded) {
          send({
            type: "degraded",
            message: sentText ? CHAT_BUSY_MESSAGE : CHAT_DEGRADED_MESSAGE,
            code: "temporarily_unavailable",
          });
        }
        send({ type: "done" });
      } catch (error) {
        if (
          request.signal.aborted ||
          (error instanceof ChatUnavailableError && error.code === "aborted")
        ) {
          logServerEvent("chat_request_aborted");
          return;
        }

        logServerEvent("chat_turn_failed", { code: safeErrorCode(error) });

        if (error instanceof ChatStreamError && error.emitted) {
          send({
            type: "degraded",
            message: CHAT_BUSY_MESSAGE,
            code: "reply_interrupted",
          });
        } else if (error instanceof ChatUnavailableError) {
          send({
            type: "degraded",
            message: sentText ? CHAT_BUSY_MESSAGE : CHAT_DEGRADED_MESSAGE,
            code: error.code,
          });
        } else {
          send({
            type: "error",
            message: "Something went wrong on my side. Please try again, or send a project brief.",
            code: "internal_error",
          });
        }
        send({ type: "done" });
      } finally {
        if (open) {
          try {
            controller.close();
          } catch {
            // The browser may already have closed the stream.
          }
        }
      }
    },
    cancel() {
      // The model request is tied to request.signal by the route and the model client.
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "X-Accel-Buffering": "no",
  };
  if (newCookie) headers["Set-Cookie"] = newCookie;

  return new Response(stream, { status: 200, headers });
}
