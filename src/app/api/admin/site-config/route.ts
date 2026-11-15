import { revalidatePath } from "next/cache";
import { ADMIN_ACTOR, isAdminRequest } from "@/lib/admin/auth";
import { adminSiteConfigSchema } from "@/lib/admin/schema";
import {
  SiteConfigStoreNotConfiguredError,
  getAdminSiteConfigState,
  saveAdminSiteConfig,
} from "@/lib/admin/site-config";
import { isAllowedOrigin } from "@/lib/guardrails/origin";
import { checkRateLimit, hashRateLimitKey } from "@/lib/guardrails/rate-limit";
import { getClientIp, readJsonBody } from "@/lib/guardrails/request";
import { logServerEvent } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 30;

const BODY_MAX_BYTES = 24 * 1_024;
const LIMIT_REQUESTS = 30;
const LIMIT_WINDOW_MS = 60_000;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function revalidateSiteRoutes() {
  revalidatePath("/", "layout");
  revalidatePath("/solutions");
  revalidatePath("/how-we-work");
  revalidatePath("/our-work");
  revalidatePath("/insights");
  revalidatePath("/about");
  revalidatePath("/contact");
  revalidatePath("/privacy");
  revalidatePath("/terms");
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return json({ ok: false, error: "not_signed_in" }, 401);
  }
  const result = await getAdminSiteConfigState();
  return json({ ok: true, ...result });
}

export async function PUT(request: Request) {
  if (!isAllowedOrigin(request)) {
    return json({ ok: false, error: "origin_not_allowed" }, 403);
  }
  if (!isAdminRequest(request)) {
    return json({ ok: false, error: "not_signed_in" }, 401);
  }

  const rate = checkRateLimit(
    `admin-site-config:${hashRateLimitKey(getClientIp(request))}`,
    LIMIT_REQUESTS,
    LIMIT_WINDOW_MS,
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

  const body = await readJsonBody(request, BODY_MAX_BYTES);
  if (!body.ok) return json({ ok: false, error: body.code }, body.status);

  const parsed = adminSiteConfigSchema.safeParse(body.data);
  if (!parsed.success) return json({ ok: false, error: "invalid_request" }, 400);

  try {
    const config = await saveAdminSiteConfig(parsed.data, ADMIN_ACTOR);
    logServerEvent("admin_site_config_updated", { actor: ADMIN_ACTOR });
    revalidateSiteRoutes();
    return json({ ok: true, config });
  } catch (error) {
    if (error instanceof SiteConfigStoreNotConfiguredError) {
      return json({ ok: false, error: "site_config_store_unavailable" }, 503);
    }
    logServerEvent("admin_site_config_update_failed", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return json({ ok: false, error: "site_config_update_failed" }, 500);
  }
}
