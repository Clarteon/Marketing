import { beforeEach, describe, expect, it } from "vitest";
import { resetConfigForTests } from "@/lib/config";
import { CHAT_SESSION_SECONDS } from "@/lib/chat/constants";
import {
  chatCookie,
  createChatSessionToken,
  hasChatSession,
  verifyChatSessionToken,
} from "@/lib/chat/session";

const SECRET = "test-chat-session-secret-that-is-long-enough";
const NOW = 1_790_000_000_000;

describe("signed chat sessions", () => {
  beforeEach(() => {
    process.env.CHAT_SESSION_SECRET = SECRET;
    resetConfigForTests();
  });

  it("accepts a fresh token for the same session", () => {
    const sessionId = crypto.randomUUID();
    const token = createChatSessionToken(sessionId, SECRET, NOW, "nonce-123456789");

    expect(verifyChatSessionToken(token, SECRET, sessionId, NOW + 1_000)).toBe(true);
  });

  it("rejects a tampered token, a different session and an expired token", () => {
    const sessionId = crypto.randomUUID();
    const token = createChatSessionToken(sessionId, SECRET, NOW, "nonce-123456789");
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

    expect(verifyChatSessionToken(tampered, SECRET, sessionId, NOW + 1_000)).toBe(false);
    expect(verifyChatSessionToken(token, SECRET, crypto.randomUUID(), NOW + 1_000)).toBe(false);
    expect(
      verifyChatSessionToken(token, SECRET, sessionId, NOW + CHAT_SESSION_SECONDS * 1_000 + 1),
    ).toBe(false);
  });

  it("does not accept a token signed with another secret", () => {
    const sessionId = crypto.randomUUID();
    const token = createChatSessionToken(sessionId, SECRET, NOW, "nonce-123456789");

    expect(verifyChatSessionToken(token, "another-secret-that-is-long-enough-123", sessionId)).toBe(
      false,
    );
  });

  it("sets a narrow, HTTP-only cookie", () => {
    const cookie = chatCookie("token");

    expect(cookie).toContain("clarteon_chat=token");
    expect(cookie).toContain("Path=/api/chat");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain(`Max-Age=${CHAT_SESSION_SECONDS}`);
  });

  it("reads the cookie from a request and matches the session id", () => {
    const sessionId = crypto.randomUUID();
    const token = createChatSessionToken(sessionId, SECRET, Date.now(), "nonce-123456789");
    const request = new Request("http://localhost:3000/api/chat", {
      headers: { cookie: `other=1; clarteon_chat=${encodeURIComponent(token)}` },
    });

    expect(hasChatSession(request, sessionId)).toBe(true);
    expect(hasChatSession(request, crypto.randomUUID())).toBe(false);
  });
});
