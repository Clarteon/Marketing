import { z } from "zod";
import { CHAT_MESSAGE_MAX_CHARS, CHAT_TURNSTILE_ACTION } from "@/lib/chat/constants";
import {
  chatCookie,
  chatSessionSecret,
  createChatSessionToken,
  hasChatSession,
} from "@/lib/chat/session";
import { DICTATION_LANGUAGES, isVoiceWav, VOICE_MAX_AUDIO_BYTES } from "@/lib/chat/voice";
import { getConfig } from "@/lib/config";
import { isAllowedOrigin } from "@/lib/guardrails/origin";
import { checkRateLimit, hashRateLimitKey } from "@/lib/guardrails/rate-limit";
import { getClientIp } from "@/lib/guardrails/request";
import { verifyTurnstile } from "@/lib/guardrails/turnstile";

export const runtime = "nodejs";
export const maxDuration = 30;

const TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";
const RATE_WINDOW_MS = 60_000;
const IP_LIMIT = 6;
const SESSION_LIMIT = 3;
const UPSTREAM_TIMEOUT_MS = 12_000;
const requestSchema = z.object({
  sessionId: z.uuid(),
  token: z.string().min(1).max(2048).nullable(),
  language: z.enum(DICTATION_LANGUAGES).default("en"),
});
const transcriptSchema = z.object({ text: z.string().trim() });

async function readAudio(request: Request) {
  if (Number(request.headers.get("content-length")) > VOICE_MAX_AUDIO_BYTES) return "too_large";
  const reader = request.body?.getReader();
  if (!reader) return null;

  const bytes = new Uint8Array(VOICE_MAX_AUDIO_BYTES);
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return bytes.subarray(0, length);
      if (length + value.byteLength > bytes.byteLength) {
        void reader.cancel().catch(() => {});
        return "too_large";
      }
      bytes.set(value, length);
      length += value.byteLength;
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request): Promise<Response> {
  const headers = new Headers({ "Cache-Control": "no-store" });
  const json = (body: { error: string } | { text: string }, status = 200) =>
    Response.json(body, { status, headers });

  if (process.env.NEXT_PUBLIC_CLARA_DICTATION !== "true") {
    return json({ error: "voice_unavailable" }, 404);
  }
  if (!isAllowedOrigin(request)) return json({ error: "forbidden" }, 403);
  if (request.headers.get("content-type") !== "audio/wav") {
    return json({ error: "unsupported_media_type" }, 415);
  }

  const parsed = requestSchema.safeParse({
    sessionId: request.headers.get("x-chat-session"),
    token: request.headers.get("x-turnstile-token"),
    language: request.headers.get("x-dictation-language") ?? undefined,
  });
  if (!parsed.success) return json({ error: "invalid_input" }, 400);
  const { sessionId, token, language } = parsed.data;

  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`voice:ip:${hashRateLimitKey(ip)}`, IP_LIMIT, RATE_WINDOW_MS);
  const sessionLimit = checkRateLimit(
    `voice:session:${hashRateLimitKey(sessionId)}`,
    SESSION_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!ipLimit.allowed || !sessionLimit.allowed) {
    headers.set(
      "Retry-After",
      String(Math.max(ipLimit.retryAfterSeconds, sessionLimit.retryAfterSeconds)),
    );
    return json({ error: "rate_limited" }, 429);
  }

  try {
    const config = getConfig();
    if (!config.GROQ_API_KEY) return json({ error: "voice_unavailable" }, 503);
    const verifiedSession = hasChatSession(request, sessionId);
    if (!verifiedSession && !token) return json({ error: "bot_check_required" }, 403);

    const audio = await readAudio(request);
    if (audio === "too_large") return json({ error: "body_too_large" }, 413);
    if (!audio || !isVoiceWav(audio)) return json({ error: "invalid_audio" }, 422);

    if (!verifiedSession && token) {
      const secret = chatSessionSecret();
      if (!secret || !config.TURNSTILE_SECRET_KEY) return json({ error: "voice_unavailable" }, 503);
      if (!(await verifyTurnstile(token, ip, config.TURNSTILE_SECRET_KEY, CHAT_TURNSTILE_ACTION))) {
        return json({ error: "bot_check_failed" }, 403);
      }
      headers.set("Set-Cookie", chatCookie(createChatSessionToken(sessionId, secret)));
    }
    headers.set("X-Chat-Session-Verified", "1");

    const body = new FormData();
    body.set("file", new Blob([audio], { type: "audio/wav" }), "recording.wav");
    body.set("model", TRANSCRIPTION_MODEL);
    if (language !== "auto") body.set("language", language);
    const upstream = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.GROQ_API_KEY}` },
      body,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]),
    });
    if (upstream.status === 429) {
      const retryAfter = upstream.headers.get("Retry-After");
      if (retryAfter && /^\d{1,8}$/.test(retryAfter)) headers.set("Retry-After", retryAfter);
      return json({ error: "rate_limited" }, 429);
    }
    if (!upstream.ok) return json({ error: "voice_unavailable" }, 502);

    const result = transcriptSchema.safeParse(await upstream.json());
    if (!result.success) return json({ error: "voice_unavailable" }, 502);
    if (!result.data.text) return json({ error: "no_speech" }, 422);
    return json({ text: result.data.text.slice(0, CHAT_MESSAGE_MAX_CHARS) });
  } catch {
    return json({ error: "voice_unavailable" }, 503);
  }
}
