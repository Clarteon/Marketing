import { ADMIN_ACTOR, isAdminRequest } from "@/lib/admin/auth";
import { LeadNotFoundError, updateLead, type AdminLeadRow } from "@/lib/admin/lead-queries";
import { adminLeadUpdateSchema } from "@/lib/admin/schema";
import { isAllowedOrigin } from "@/lib/guardrails/origin";
import { checkRateLimit, hashRateLimitKey } from "@/lib/guardrails/rate-limit";
import { getClientIp, readJsonBody } from "@/lib/guardrails/request";
import { LeadStoreNotConfiguredError } from "@/lib/leads/store";
import { logServerEvent } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 30;

const EDIT_BODY_MAX_BYTES = 8 * 1_024;
const EDIT_REQUESTS = 30;
const EDIT_WINDOW_MS = 60_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function serialize(lead: AdminLeadRow) {
  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    company: lead.company ?? null,
    need: lead.need,
    teamSize: lead.teamSize ?? null,
    source: lead.source,
    status: lead.status,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return json({ ok: false, error: "origin_not_allowed" }, 403);
  }
  if (!isAdminRequest(request)) {
    return json({ ok: false, error: "not_signed_in" }, 401);
  }

  const rate = checkRateLimit(
    `admin-lead-edit:${hashRateLimitKey(getClientIp(request))}`,
    EDIT_REQUESTS,
    EDIT_WINDOW_MS,
  );
  if (!rate.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rate.retryAfterSeconds),
        },
      },
    );
  }

  const body = await readJsonBody(request, EDIT_BODY_MAX_BYTES);
  if (!body.ok) return json({ ok: false, error: body.code }, body.status);

  const parsed = adminLeadUpdateSchema.safeParse(body.data);
  if (!parsed.success) return json({ ok: false, error: "invalid_request" }, 400);

  const { id } = await params;
  if (!UUID.test(id)) return json({ ok: false, error: "invalid_request" }, 400);

  try {
    const lead = await updateLead(id, parsed.data);
    logServerEvent("admin_lead_updated", { actor: ADMIN_ACTOR, leadId: id });
    return json({ ok: true, lead: serialize(lead) });
  } catch (error) {
    if (error instanceof LeadNotFoundError) {
      return json({ ok: false, error: "lead_not_found" }, 404);
    }
    if (error instanceof LeadStoreNotConfiguredError) {
      return json({ ok: false, error: "lead_store_unavailable" }, 503);
    }

    logServerEvent("admin_lead_edit_failed", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return json({ ok: false, error: "lead_edit_failed" }, 500);
  }
}
