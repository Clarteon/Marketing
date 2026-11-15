import { revalidatePath } from "next/cache";
import { ADMIN_ACTOR, isAdminRequest } from "@/lib/admin/auth";
import {
  ProjectConflictError,
  ProjectStoreNotConfiguredError,
  createAdminProject,
  listAdminProjects,
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

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return json({ ok: false, error: "not_signed_in" }, 401);
  }
  const result = await listAdminProjects();
  return json({ ok: true, ...result });
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return json({ ok: false, error: "origin_not_allowed" }, 403);
  }
  if (!isAdminRequest(request)) {
    return json({ ok: false, error: "not_signed_in" }, 401);
  }

  const rate = checkRateLimit(
    `admin-projects-create:${hashRateLimitKey(getClientIp(request))}`,
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

  const parsed = adminProjectSchema.safeParse(body.data);
  if (!parsed.success) return json({ ok: false, error: "invalid_request" }, 400);

  try {
    const project = await createAdminProject(parsed.data);
    logServerEvent("admin_project_created", { actor: ADMIN_ACTOR, slug: project.slug });
    revalidateProjectPaths(project.slug);
    return json({ ok: true, project }, 201);
  } catch (error) {
    if (error instanceof ProjectStoreNotConfiguredError) {
      return json({ ok: false, error: "project_store_unavailable" }, 503);
    }
    if (error instanceof ProjectConflictError) {
      return json({ ok: false, error: "project_slug_conflict" }, 409);
    }
    logServerEvent("admin_project_create_failed", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return json({ ok: false, error: "project_create_failed" }, 500);
  }
}
