import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetConfigForTests } from "@/lib/config";
import { ChatUnavailableError } from "@/lib/chat/model";
import { createChatSessionToken } from "@/lib/chat/session";
import { resetRateLimitsForTests } from "@/lib/guardrails/rate-limit";
import { POST } from "@/app/api/chat/route";

const mocks = vi.hoisted(() => ({
  runChatTurn: vi.fn(),
  verifyTurnstile: vi.fn(),
}));

vi.mock("@/lib/chat/run", () => ({ runChatTurn: mocks.runChatTurn }));

vi.mock("@/lib/guardrails/turnstile", () => ({
  verifyTurnstile: mocks.verifyTurnstile,
  TurnstileUnavailableError: class TurnstileUnavailableError extends Error {},
}));

const SESSION_SECRET = "test-chat-session-secret-that-is-long-enough";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: crypto.randomUUID(),
    message: "Our weekly reporting takes too long.",
    history: [],
    turnstileToken: "test-token",
    timezone: "Asia/Manila",
    pageUrl: "/",
    ...overrides,
  };
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.7",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function events(text: string): Array<Record<string, unknown>> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = "test-groq-key";
    process.env.TURNSTILE_SECRET_KEY = "test-turnstile-secret";
    process.env.CHAT_SESSION_SECRET = SESSION_SECRET;
    process.env.CHAT_MAX_MESSAGES = "20";
    resetConfigForTests();
    resetRateLimitsForTests();

    mocks.runChatTurn.mockReset();
    mocks.verifyTurnstile.mockReset();
    mocks.verifyTurnstile.mockResolvedValue(true);
    mocks.runChatTurn.mockImplementation(async ({ onText }: { onText: (text: string) => void }) => {
      onText("Hello from Clara.");
      return { degraded: false, model: "test-model", toolRounds: 0 };
    });

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("checks the visitor once and streams a safe NDJSON reply", async () => {
    const body = validBody();
    const response = await POST(request(body));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    expect(response.headers.get("set-cookie")).toContain("clarteon_chat=");

    const parsed = events(await response.text());
    expect(parsed).toEqual([{ type: "text", text: "Hello from Clara." }, { type: "done" }]);
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith(
      "test-token",
      "203.0.113.7",
      "test-turnstile-secret",
      "chat",
    );
    expect(mocks.runChatTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ message: body.message }),
        sessionId: body.sessionId,
      }),
    );
  });

  it("skips the bot check when the signed session cookie is valid", async () => {
    const sessionId = crypto.randomUUID();
    const token = createChatSessionToken(sessionId, SESSION_SECRET);
    const response = await POST(
      request(
        { sessionId, message: "Hello again.", history: [], turnstileToken: undefined },
        { cookie: `clarteon_chat=${encodeURIComponent(token)}` },
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a missing origin, a malformed body and an oversized body", async () => {
    const noOrigin = await POST(
      new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validBody()),
      }),
    );
    expect(noOrigin.status).toBe(403);

    const badJson = await POST(
      new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { origin: "http://localhost:3000", "content-type": "application/json" },
        body: "{",
      }),
    );
    expect(badJson.status).toBe(400);

    const oversized = await POST(request(validBody({ message: "x".repeat(70 * 1024) })));
    expect(oversized.status).toBe(413);
    expect(mocks.runChatTurn).not.toHaveBeenCalled();
  });

  it("requires a bot check on the first message", async () => {
    const response = await POST(request(validBody({ turnstileToken: undefined })));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "bot_check_required" });
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
    expect(mocks.runChatTurn).not.toHaveBeenCalled();
  });

  it("rejects a failed or replayed bot check", async () => {
    mocks.verifyTurnstile.mockResolvedValue(false);

    const response = await POST(request(validBody()));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "bot_check_failed" });
    expect(mocks.runChatTurn).not.toHaveBeenCalled();
  });

  it("requires a new bot check when the cookie is tampered with", async () => {
    const sessionId = crypto.randomUUID();
    const token = createChatSessionToken(sessionId, SESSION_SECRET);
    const tampered = `${token.slice(0, -1)}x`;

    const response = await POST(
      request(
        { sessionId, message: "Hello.", history: [], turnstileToken: undefined },
        { cookie: `clarteon_chat=${encodeURIComponent(tampered)}` },
      ),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "bot_check_required" });
  });

  it("returns 503 when the chat model is not configured", async () => {
    delete process.env.GROQ_API_KEY;
    resetConfigForTests();

    const response = await POST(request(validBody()));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "chat_unavailable" });
    expect(mocks.runChatTurn).not.toHaveBeenCalled();
  });

  it("rate limits one session", async () => {
    const body = validBody();

    for (let index = 0; index < 8; index += 1) {
      const response = await POST(request(body));
      expect(response.status).toBe(200);
    }

    const blocked = await POST(request(body));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    expect(mocks.runChatTurn).toHaveBeenCalledTimes(8);
  });

  it("enforces the configured conversation cap", async () => {
    process.env.CHAT_MAX_MESSAGES = "2";
    resetConfigForTests();

    const response = await POST(
      request(
        validBody({
          history: [
            { role: "user", content: "First" },
            { role: "assistant", content: "Reply" },
          ],
        }),
      ),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ ok: false, error: "message_limit" });
    expect(mocks.runChatTurn).not.toHaveBeenCalled();
  });

  it("turns a model outage into a degraded reply with a way forward", async () => {
    mocks.runChatTurn.mockRejectedValue(new ChatUnavailableError("not_configured"));

    const response = await POST(request(validBody()));

    expect(response.status).toBe(200);
    const parsed = events(await response.text());
    expect(parsed).toEqual([
      expect.objectContaining({ type: "degraded", code: "not_configured" }),
      { type: "done" },
    ]);
  });

  it("does not expose a raw provider error", async () => {
    mocks.runChatTurn.mockRejectedValue(new Error("upstream secret-token"));

    const response = await POST(request(validBody()));
    const text = await response.text();

    expect(text).toContain("internal_error");
    expect(text).not.toContain("secret-token");
  });
});
