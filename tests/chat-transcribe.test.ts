import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/transcribe/route";
import { chatCookie, createChatSessionToken } from "@/lib/chat/session";
import { createVoiceWav, VOICE_MAX_AUDIO_BYTES } from "@/lib/chat/voice";
import { resetConfigForTests } from "@/lib/config";
import { resetRateLimitsForTests } from "@/lib/guardrails/rate-limit";

const { verifyTurnstile } = vi.hoisted(() => ({ verifyTurnstile: vi.fn() }));
vi.mock("@/lib/guardrails/turnstile", () => ({ verifyTurnstile }));

const SECRET = "test-chat-session-secret-that-is-long-enough";
const URL = "http://localhost:3000/api/chat/transcribe";

function request({
  audio = createVoiceWav(8_000).buffer,
  sessionId = crypto.randomUUID(),
  headers = {},
}: { audio?: ArrayBuffer; sessionId?: string; headers?: Record<string, string> } = {}) {
  return new Request(URL, {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "audio/wav",
      "x-chat-session": sessionId,
      "x-forwarded-for": "203.0.113.7",
      ...headers,
    },
    body: audio,
  });
}

function signedCookie(sessionId: string) {
  return chatCookie(createChatSessionToken(sessionId, SECRET)).split(";", 1)[0];
}

describe("POST /api/chat/transcribe", () => {
  const upstream = vi.fn();

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_CLARA_DICTATION", "true");
    vi.stubEnv("GROQ_API_KEY", "test-groq-key");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-turnstile-secret");
    vi.stubEnv("CHAT_SESSION_SECRET", SECRET);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    resetConfigForTests();
    resetRateLimitsForTests();
    verifyTurnstile.mockReset().mockResolvedValue(true);
    upstream.mockReset().mockImplementation(() => Response.json({ text: "  A typed draft.  " }));
    vi.stubGlobal("fetch", upstream);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    resetConfigForTests();
  });

  it("verifies a visitor’s first audio request and returns an editable transcript", async () => {
    const response = await POST(request({ headers: { "x-turnstile-token": "first-check" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "A typed draft." });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toContain("Path=/api/chat");
    expect(response.headers.get("x-chat-session-verified")).toBe("1");
    expect(verifyTurnstile).toHaveBeenCalledWith(
      "first-check",
      "203.0.113.7",
      "test-turnstile-secret",
      "chat",
    );
    const [destination, options] = upstream.mock.calls[0];
    expect(destination).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
    expect(options.body.get("model")).toBe("whisper-large-v3-turbo");
    expect(options.body.get("language")).toBe("en");
    expect(options.body.get("file")).toMatchObject({ name: "recording.wav", type: "audio/wav" });
  });

  it.each([
    ["tl", "tl"],
    ["auto", null],
  ])("handles the %s dictation language", async (language, expectedHint) => {
    const response = await POST(
      request({
        headers: { "x-turnstile-token": "first-check", "x-dictation-language": language },
      }),
    );
    expect(response.status).toBe(200);
    expect(upstream.mock.calls[0][1].body.get("language")).toBe(expectedHint);
  });

  it("rejects disabled, cross-origin and unverified requests before calling Groq", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLARA_DICTATION", "false");
    expect((await POST(request())).status).toBe(404);
    vi.stubEnv("NEXT_PUBLIC_CLARA_DICTATION", "true");
    expect((await POST(request({ headers: { origin: "https://example.org" } }))).status).toBe(403);
    expect((await POST(request({ headers: { "x-dictation-language": "unknown" } }))).status).toBe(
      400,
    );
    expect((await POST(request())).status).toBe(403);
    verifyTurnstile.mockResolvedValue(false);
    expect((await POST(request({ headers: { "x-turnstile-token": "bad" } }))).status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("rejects oversized or forged WAVs even without a Content-Length header", async () => {
    const malformed = createVoiceWav(8_000);
    malformed.setUint32(24, 8_000, true);
    const headers = { "x-turnstile-token": "token" };
    const tooLarge = request({ headers, audio: new ArrayBuffer(VOICE_MAX_AUDIO_BYTES + 1) });
    expect(tooLarge.headers.has("content-length")).toBe(false);
    expect((await POST(tooLarge)).status).toBe(413);
    expect((await POST(request({ headers, audio: malformed.buffer }))).status).toBe(422);
    expect(verifyTurnstile).not.toHaveBeenCalled();
    expect(upstream).not.toHaveBeenCalled();
  });

  it("limits signed sessions and limits an IP across fresh session IDs", async () => {
    const sessionId = crypto.randomUUID();
    const from = (id: string) => request({ sessionId: id, headers: { cookie: signedCookie(id) } });
    for (let count = 0; count < 3; count++) {
      expect((await POST(from(sessionId))).status).toBe(200);
    }
    expect((await POST(from(sessionId))).status).toBe(429);
    expect((await POST(from(crypto.randomUUID()))).status).toBe(200);
    expect((await POST(from(crypto.randomUUID()))).status).toBe(200);
    const capped = await POST(from(crypto.randomUUID()));
    expect(capped.status).toBe(429);
    expect(Number(capped.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(verifyTurnstile).not.toHaveBeenCalled();
    expect(upstream).toHaveBeenCalledTimes(5);
  });

  it("returns a safe quota error and retains the verified session for typed chat", async () => {
    upstream.mockResolvedValueOnce(
      new Response("provider-only detail", { status: 429, headers: { "Retry-After": "30" } }),
    );
    const response = await POST(request({ headers: { "x-turnstile-token": "first-check" } }));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(response.headers.get("set-cookie")).toContain("Path=/api/chat");
    expect(await response.json()).toEqual({ error: "rate_limited" });
    expect(upstream).toHaveBeenCalledTimes(1);
  });
});
