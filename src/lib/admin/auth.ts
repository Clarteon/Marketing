import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getConfig } from "@/lib/config";
import { secretsMatch } from "@/lib/security/secrets";

export const ADMIN_COOKIE_NAME = "clarteon_admin";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export const ADMIN_ACTOR = "admin";

interface SessionPayload {
  v: 1;
  iat: number;
  exp: number;
  nonce: string;
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSessionToken(
  secret: string,
  now = Date.now(),
  nonce = randomBytes(16).toString("base64url"),
): string {
  const payload: SessionPayload = {
    v: 1,
    iat: Math.floor(now / 1_000),
    exp: Math.floor((now + ADMIN_SESSION_SECONDS * 1_000) / 1_000),
    nonce,
  };
  const encoded = base64Url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyAdminSessionToken(token: string, secret: string, now = Date.now()): boolean {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;

  const expected = sign(encoded, secret);
  if (!secretsMatch(signature, expected)) return false;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return false;
  }

  const nowSeconds = Math.floor(now / 1_000);
  if (payload.v !== 1) return false;
  if (!Number.isFinite(payload.exp) || payload.exp <= nowSeconds) return false;
  if (!Number.isFinite(payload.iat) || payload.iat > nowSeconds + 300) return false;
  return typeof payload.nonce === "string" && payload.nonce.length >= 8;
}

export function adminSecret(): string | undefined {
  return getConfig().ADMIN_AUTH_SECRET;
}

export function adminCookie(token: string): string {
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${ADMIN_SESSION_SECONDS}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function clearAdminCookie(): string {
  const parts = [`${ADMIN_COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
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

export function isAdminRequest(request: Request): boolean {
  const secret = adminSecret();
  if (!secret) return false;
  const token = cookieValue(request.headers.get("cookie"), ADMIN_COOKIE_NAME);
  return Boolean(token && verifyAdminSessionToken(token, secret));
}

export async function isAdminPageAuthenticated(): Promise<boolean> {
  const secret = adminSecret();
  if (!secret) return false;
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return Boolean(token && verifyAdminSessionToken(token, secret));
}
