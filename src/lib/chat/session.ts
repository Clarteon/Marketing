import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { getConfig } from "@/lib/config";
import { secretsMatch } from "@/lib/security/secrets";
import { CHAT_COOKIE_NAME, CHAT_SESSION_SECONDS } from "./constants";

interface ChatSessionPayload {
  v: 1;
  sid: string;
  iat: number;
  exp: number;
  nonce: string;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`clarteon:chat-session:v1:${payload}`)
    .digest("base64url");
}

/**
 * A chat session only proves that the browser passed the bot check. It carries
 * no identity and grants no admin access, so a domain-separated HMAC of the
 * admin secret is enough. CHAT_SESSION_SECRET can separate the keys later.
 */
export function chatSessionSecret(): string | undefined {
  const config = getConfig();
  return config.CHAT_SESSION_SECRET ?? config.ADMIN_AUTH_SECRET;
}

export function createChatSessionToken(
  sessionId: string,
  secret: string,
  now = Date.now(),
  nonce = randomBytes(16).toString("base64url"),
): string {
  const payload: ChatSessionPayload = {
    v: 1,
    sid: sessionId,
    iat: Math.floor(now / 1_000),
    exp: Math.floor((now + CHAT_SESSION_SECONDS * 1_000) / 1_000),
    nonce,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyChatSessionToken(
  token: string,
  secret: string,
  sessionId: string,
  now = Date.now(),
): boolean {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  if (!secretsMatch(signature, sign(encoded, secret))) return false;

  let payload: ChatSessionPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return false;
  }

  const nowSeconds = Math.floor(now / 1_000);
  if (payload.v !== 1 || payload.sid !== sessionId) return false;
  if (!Number.isFinite(payload.exp) || payload.exp <= nowSeconds) return false;
  if (!Number.isFinite(payload.iat) || payload.iat > nowSeconds + 300) return false;
  return typeof payload.nonce === "string" && payload.nonce.length >= 8;
}

export function chatCookie(token: string): string {
  const parts = [
    `${CHAT_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/api/chat",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${CHAT_SESSION_SECONDS}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

function cookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key !== name) continue;
    try {
      return decodeURIComponent(rest.join("="));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function hasChatSession(request: Request, sessionId: string): boolean {
  const secret = chatSessionSecret();
  if (!secret) return false;
  const token = cookieValue(request.headers.get("cookie"), CHAT_COOKIE_NAME);
  return Boolean(token && verifyChatSessionToken(token, secret, sessionId));
}
