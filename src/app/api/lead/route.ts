import { getConfig } from "@/lib/config";
import { sendLeadEmails } from "@/lib/email/send-lead-emails";
import { isAllowedOrigin } from "@/lib/guardrails/origin";
import { checkRateLimit, hashRateLimitKey } from "@/lib/guardrails/rate-limit";
import { getClientIp, readJsonBody } from "@/lib/guardrails/request";
import { verifyTurnstile } from "@/lib/guardrails/turnstile";
import {
  LEAD_BODY_MAX_BYTES,
  LEAD_EMAIL_RATE_LIMIT,
  LEAD_FORM_MIN_SUBMIT_MS,
} from "@/lib/leads/constants";
import { leadInputSchema, type LeadInput } from "@/lib/leads/schema";
import { getLeadStore, type Lead } from "@/lib/leads/store";
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
    if (typeof code === "string" && /^[A-Za-z0-9_]{1,40}$/.test(code)) return code;
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string" && /^[A-Za-z0-9_]{1,40}$/.test(name)) return name;
  }
  return "unknown";
}

function emailFallbackLead(input: LeadInput): Lead {
  return {
    id: input.requestId,
    requestId: input.requestId,
    name: input.name,
    email: input.email,
    company: input.company,
    need: input.need,
    teamSize: input.teamSize,
    source: "website-form",
    createdAt: new Date(),
  };
}

async function saveByEmailOnly(input: LeadInput): Promise<boolean> {
  const lead = emailFallbackLead(input);

  try {
    const result = await sendLeadEmails(lead);
    logServerEvent("lead_email_only_fallback", {
      leadId: lead.id,
      team: result.team,
      receipt: result.receipt,
    });
    return result.team;
  } catch (error) {
    logServerEvent("lead_fallback_email_failed", {
      leadId: lead.id,
      code: safeErrorCode(error),
    });
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  const body = await readJsonBody(request, LEAD_BODY_MAX_BYTES);
  if (!body.ok) return json({ ok: false, error: body.code }, body.status);

  const parsed = leadInputSchema.safeParse(body.data);
  if (!parsed.success) return json({ ok: false, error: "invalid_input" }, 400);

  const input = parsed.data;
  if (input.website) return json({ ok: false, error: "invalid_input" }, 400);
  if (Date.now() - input.startedAt < LEAD_FORM_MIN_SUBMIT_MS) {
    return json({ ok: false, error: "too_fast" }, 400);
  }

  let config;
  try {
    config = getConfig();
  } catch {
    logServerEvent("lead_config_invalid");
    return json({ ok: false, error: "service_unavailable" }, 503);
  }

  const ip = getClientIp(request);
  const windowMs = config.RATE_LIMIT_WINDOW_SECONDS * 1_000;

  const ipLimit = checkRateLimit(
    `lead:ip:${hashRateLimitKey(ip)}`,
    config.RATE_LIMIT_MAX_REQUESTS,
    windowMs,
  );
  if (!ipLimit.allowed) {
    return json({ ok: false, error: "rate_limited" }, 429, {
      "Retry-After": String(ipLimit.retryAfterSeconds),
    });
  }

  const emailLimit = checkRateLimit(
    `lead:email:${hashRateLimitKey(input.email)}`,
    LEAD_EMAIL_RATE_LIMIT,
    windowMs,
  );
  if (!emailLimit.allowed) {
    return json({ ok: false, error: "rate_limited" }, 429, {
      "Retry-After": String(emailLimit.retryAfterSeconds),
    });
  }

  try {
    const verified = await verifyTurnstile(
      input.turnstileToken,
      ip,
      config.TURNSTILE_SECRET_KEY ?? "",
    );
    if (!verified) return json({ ok: false, error: "verification_failed" }, 403);
  } catch {
    logServerEvent("lead_turnstile_unavailable");
    return json({ ok: false, error: "verification_unavailable" }, 503);
  }

  let store;
  try {
    store = getLeadStore();
  } catch {
    logServerEvent("lead_store_not_configured");
    if (await saveByEmailOnly(input)) return json({ ok: true });
    return json({ ok: false, error: "service_unavailable" }, 503);
  }

  let saved;
  try {
    saved = await store.save({
      requestId: input.requestId,
      name: input.name,
      email: input.email,
      company: input.company,
      need: input.need,
      teamSize: input.teamSize,
      source: "website-form",
    });
  } catch (error) {
    logServerEvent("lead_save_failed", {
      requestId: input.requestId,
      code: safeErrorCode(error),
    });
    if (await saveByEmailOnly(input)) return json({ ok: true });
    return json({ ok: false, error: "service_unavailable" }, 503);
  }

  if (!saved.created) {
    // A retry of the same request. The email idempotency keys make resending
    // safe, and it lets a response that was lost after saving still notify the
    // team and the visitor.
    try {
      await sendLeadEmails(saved.lead, store);
    } catch {
      logServerEvent("lead_email_send_failed", { leadId: saved.lead.id });
    }
    return json({ ok: true });
  }

  try {
    await sendLeadEmails(saved.lead, store);
  } catch {
    logServerEvent("lead_email_send_failed", { leadId: saved.lead.id });
  }

  return json({ ok: true });
}
