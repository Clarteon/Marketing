import { revalidatePath } from "next/cache";
import { ADMIN_ACTOR, isAdminRequest } from "@/lib/admin/auth";
import {
  ProjectNotFoundError,
  ProjectStoreNotConfiguredError,
  deleteAdminProject,
  updateAdminProject,
} from "@/lib/admin/projects";
import { adminProjectSchema } from "@/lib/admin/schema";
import { isAllowedOrigin } from "@/lib/guardrails/origin";
import { checkRateLimit, hashRateLimitKey } from "@/lib/guardrails/rate-limit";
import { getClientIp, readJsonBody } from "@/lib/guardrails/request";
import { logServerEvent } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 30;

const BODY_MAX_BYTES = 32 * 1_024;
const LIMIT_REQUESTS = 30;
const LIMIT_WINDOW_MS = 60_000;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function revalidateProjectPaths(slug: string) {
  revalidatePath("/");
  revalidatePath("/our-work");
  revalidatePath(`/our-work/${slug}`);
  revalidatePath("/sitemap.xml");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return json({ ok: false, error: "origin_not_allowed" }, 403);
  }
  if (!isAdminRequest(request)) {
    return json({ ok: false, error: "not_signed_in" }, 401);
  }

  const rate = checkRateLimit(
    `admin-project-edit:${hashRateLimitKey(getClientIp(request))}`,
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

  const { slug } = await params;
  if (!SLUG_REGEX.test(slug)) {
    return json({ ok: false, error: "invalid_request" }, 400);
  }

  const body = await readJsonBody(request, BODY_MAX_BYTES);
  if (!body.ok) return json({ ok: false, error: body.code }, body.status);

  const parsed = adminProjectSchema.safeParse(body.data);
  if (!parsed.success) return json({ ok: false, error: "invalid_request" }, 400);

  try {
    const project = await updateAdminProject(slug, { ...parsed.data, slug });
    logServerEvent("admin_project_updated", { actor: ADMIN_ACTOR, slug });
    revalidateProjectPaths(slug);
    return json({ ok: true, project });
  } catch (error) {
    if (error instanceof ProjectStoreNotConfiguredError) {
      return json({ ok: false, error: "project_store_unavailable" }, 503);
    }
    if (error instanceof ProjectNotFoundError) {
      return json({ ok: false, error: "project_not_found" }, 404);
    }
    logServerEvent("admin_project_update_failed", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return json({ ok: false, error: "project_update_failed" }, 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return json({ ok: false, error: "origin_not_allowed" }, 403);
  }
  if (!isAdminRequest(request)) {
    return json({ ok: false, error: "not_signed_in" }, 401);
  }

  const rate = checkRateLimit(
    `admin-project-delete:${hashRateLimitKey(getClientIp(request))}`,
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

  const { slug } = await params;
  if (!SLUG_REGEX.test(slug)) {
    return json({ ok: false, error: "invalid_request" }, 400);
  }

  try {
    await deleteAdminProject(slug);
    logServerEvent("admin_project_deleted", { actor: ADMIN_ACTOR, slug });
    revalidateProjectPaths(slug);
    return json({ ok: true });
  } catch (error) {
    if (error instanceof ProjectStoreNotConfiguredError) {
      return json({ ok: false, error: "project_store_unavailable" }, 503);
    }
    if (error instanceof ProjectNotFoundError) {
      return json({ ok: false, error: "project_not_found" }, 404);
    }
    logServerEvent("admin_project_delete_failed", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return json({ ok: false, error: "project_delete_failed" }, 500);
  }
}
