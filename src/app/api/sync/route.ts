import { getConfig } from "@/lib/config";
import { checkRateLimit, hashRateLimitKey } from "@/lib/guardrails/rate-limit";
import { getClientIp } from "@/lib/guardrails/request";
import { KnowledgeStoreNotConfiguredError } from "@/lib/knowledge/store";
import { syncKnowledgeIndex } from "@/lib/knowledge/service";
import { logServerEvent } from "@/lib/log";
import { secretsMatch } from "@/lib/security/secrets";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYNC_REQUESTS = 10;
const SYNC_WINDOW_MS = 60 * 1_000;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function presentedSecret(request: Request): string | undefined {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }
  return request.headers.get("x-sync-secret")?.trim() || undefined;
}

export async function POST(request: Request) {
  const rate = checkRateLimit(
    `sync:${hashRateLimitKey(getClientIp(request))}`,
    SYNC_REQUESTS,
    SYNC_WINDOW_MS,
  );
  if (!rate.allowed) {
    return json({ ok: false, error: "rate_limited" }, 429);
  }

  let expected: string | undefined;
  try {
    expected = getConfig().SYNC_SECRET;
  } catch {
    return json({ ok: false, error: "sync_unavailable" }, 503);
  }
  if (!expected) return json({ ok: false, error: "sync_not_configured" }, 503);

  const presented = presentedSecret(request);
  if (!presented || !secretsMatch(presented, expected)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  try {
    const index = await syncKnowledgeIndex();
    const faqCount = index.chunks.filter((chunk) => chunk.id.startsWith("faq-")).length;
    return json({
      ok: true,
      chunkCount: index.chunks.length,
      faqCount,
      generatedAt: index.generatedAt,
      baseGeneratedAt: index.baseGeneratedAt,
    });
  } catch (error) {
    if (error instanceof KnowledgeStoreNotConfiguredError) {
      return json({ ok: false, error: "knowledge_store_unavailable" }, 503);
    }
    logServerEvent("knowledge_sync_failed", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return json({ ok: false, error: "sync_failed" }, 500);
  }
}
