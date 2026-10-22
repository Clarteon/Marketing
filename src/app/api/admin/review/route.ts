import { ADMIN_ACTOR, isAdminRequest } from "@/lib/admin/auth";
import { adminReviewSchema } from "@/lib/admin/schema";
import { isAllowedOrigin } from "@/lib/guardrails/origin";
import { checkRateLimit, hashRateLimitKey } from "@/lib/guardrails/rate-limit";
import { getClientIp, readJsonBody } from "@/lib/guardrails/request";
import { approveKnowledgeQuestion, rejectKnowledgeQuestion } from "@/lib/knowledge/service";
import { KnowledgeStoreNotConfiguredError } from "@/lib/knowledge/store";
import { logServerEvent } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 30;

const REVIEW_BODY_MAX_BYTES = 8 * 1_024;
const REVIEW_REQUESTS = 30;
const REVIEW_WINDOW_MS = 60 * 1_000;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return json({ ok: false, error: "origin_not_allowed" }, 403);
  }
  if (!isAdminRequest(request)) {
    return json({ ok: false, error: "not_signed_in" }, 401);
  }

  const rate = checkRateLimit(
    `admin-review:${hashRateLimitKey(getClientIp(request))}`,
    REVIEW_REQUESTS,
    REVIEW_WINDOW_MS,
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

  const body = await readJsonBody(request, REVIEW_BODY_MAX_BYTES);
  if (!body.ok) return json({ ok: false, error: body.code }, body.status);

  const parsed = adminReviewSchema.safeParse(body.data);
  if (!parsed.success) return json({ ok: false, error: "invalid_request" }, 400);

  try {
    if (parsed.data.action === "reject") {
      const rejected = await rejectKnowledgeQuestion(parsed.data.questionId, ADMIN_ACTOR);
      if (!rejected) return json({ ok: false, error: "question_not_open" }, 409);
      return json({ ok: true });
    }

    const approved = await approveKnowledgeQuestion({
      questionId: parsed.data.questionId,
      title: parsed.data.title,
      answer: parsed.data.answer,
      tags: parsed.data.tags,
      synonyms: parsed.data.synonyms,
      sourceUrl: parsed.data.sourceUrl,
      actor: ADMIN_ACTOR,
    });
    if (!approved) return json({ ok: false, error: "question_not_open" }, 409);

    return json({
      ok: true,
      faqSlug: approved.faq.slug,
      reindexed: approved.reindexed,
      ...(approved.reindexed ? {} : { warning: "index_refresh_pending" }),
    });
  } catch (error) {
    if (error instanceof KnowledgeStoreNotConfiguredError) {
      return json({ ok: false, error: "knowledge_store_unavailable" }, 503);
    }
    logServerEvent("admin_review_failed", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return json({ ok: false, error: "review_failed" }, 500);
  }
}
