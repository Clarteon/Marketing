import {
  ADMIN_SESSION_SECONDS,
  adminCookie,
  adminSecret,
  createAdminSessionToken,
  isAdminRequest,
} from "@/lib/admin/auth";
import { adminLoginSchema } from "@/lib/admin/schema";
import { isAllowedOrigin } from "@/lib/guardrails/origin";
import { checkRateLimit, hashRateLimitKey } from "@/lib/guardrails/rate-limit";
import { getClientIp, readJsonBody } from "@/lib/guardrails/request";
import { logServerEvent } from "@/lib/log";
import { secretsMatch } from "@/lib/security/secrets";

export const runtime = "nodejs";

const LOGIN_BODY_MAX_BYTES = 1_024;
const LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1_000;

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return json({ ok: false, error: "origin_not_allowed" }, 403);
  }

  const rate = checkRateLimit(
    `admin-login:${hashRateLimitKey(getClientIp(request))}`,
    LOGIN_ATTEMPTS,
    LOGIN_WINDOW_MS,
  );
  if (!rate.allowed) {
    return json({ ok: false, error: "rate_limited" }, 429, {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

  const body = await readJsonBody(request, LOGIN_BODY_MAX_BYTES);
  if (!body.ok) return json({ ok: false, error: body.code }, body.status);

  const parsed = adminLoginSchema.safeParse(body.data);
  if (!parsed.success) return json({ ok: false, error: "invalid_request" }, 400);

  let secret: string | undefined;
  try {
    secret = adminSecret();
  } catch {
    return json({ ok: false, error: "admin_unavailable" }, 503);
  }
  if (!secret) return json({ ok: false, error: "admin_unavailable" }, 503);

  if (!secretsMatch(parsed.data.password, secret)) {
    logServerEvent("admin_login_failed");
    return json({ ok: false, error: "invalid_credentials" }, 401);
  }

  const token = createAdminSessionToken(secret);
  logServerEvent("admin_login_succeeded");
  return json({ ok: true, expiresInSeconds: ADMIN_SESSION_SECONDS }, 200, {
    "Set-Cookie": adminCookie(token),
  });
}

export async function GET(request: Request) {
  return json({ ok: true, authenticated: isAdminRequest(request) });
}
