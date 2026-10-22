import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionToken } from "@/lib/admin/auth";
import { resetRateLimitsForTests } from "@/lib/guardrails/rate-limit";

const mocks = vi.hoisted(() => ({
  config: {
    SYNC_SECRET: "sync-secret-that-is-long-enough-123456",
    ADMIN_AUTH_SECRET: "a-test-secret-that-is-long-enough-123456",
  },
  syncKnowledgeIndex: vi.fn(),
  approveKnowledgeQuestion: vi.fn(),
  rejectKnowledgeQuestion: vi.fn(),
}));

const SECRET = mocks.config.ADMIN_AUTH_SECRET;

vi.mock("@/lib/config", () => ({
  getConfig: () => mocks.config,
}));

vi.mock("@/lib/knowledge/service", () => ({
  syncKnowledgeIndex: mocks.syncKnowledgeIndex,
  approveKnowledgeQuestion: mocks.approveKnowledgeQuestion,
  rejectKnowledgeQuestion: mocks.rejectKnowledgeQuestion,
}));

import { POST as syncPost } from "@/app/api/sync/route";
import { POST as reviewPost } from "@/app/api/admin/review/route";

const QUESTION_ID = "00000000-0000-4000-8000-000000000000";

function reviewRequest(body: unknown, cookie?: string) {
  return new Request("http://localhost:3000/api/admin/review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetRateLimitsForTests();
  mocks.syncKnowledgeIndex.mockReset();
  mocks.approveKnowledgeQuestion.mockReset();
  mocks.rejectKnowledgeQuestion.mockReset();
});

describe("POST /api/sync", () => {
  it("rejects a request without the sync secret", async () => {
    const response = await syncPost(
      new Request("http://localhost:3000/api/sync", { method: "POST" }),
    );
    expect(response.status).toBe(401);
    expect(mocks.syncKnowledgeIndex).not.toHaveBeenCalled();
  });

  it("rebuilds the index with the bearer secret", async () => {
    mocks.syncKnowledgeIndex.mockResolvedValue({
      version: 1,
      generatedAt: "2026-10-22T00:00:00.000Z",
      baseGeneratedAt: "2026-10-21T00:00:00.000Z",
      chunks: [{ id: "faq-1" }],
    });

    const response = await syncPost(
      new Request("http://localhost:3000/api/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${mocks.config.SYNC_SECRET}` },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.faqCount).toBe(1);
    expect(mocks.syncKnowledgeIndex).toHaveBeenCalledOnce();
  });
});

describe("POST /api/admin/review", () => {
  it("rejects a request without a session", async () => {
    const response = await reviewPost(
      reviewRequest({
        action: "approve",
        questionId: QUESTION_ID,
        title: "A clear answer",
        answer: "This is a sufficiently long answer.",
      }),
    );
    expect(response.status).toBe(401);
    expect(mocks.approveKnowledgeQuestion).not.toHaveBeenCalled();
  });

  it("approves a question for a signed-in reviewer", async () => {
    mocks.approveKnowledgeQuestion.mockResolvedValue({
      faq: { slug: "a-clear-answer-12345678" },
      reindexed: true,
    });
    const token = createAdminSessionToken(SECRET);

    const response = await reviewPost(
      reviewRequest(
        {
          action: "approve",
          questionId: QUESTION_ID,
          title: "A clear answer",
          answer: "This is a sufficiently long answer.",
          tags: "refunds, terms",
          synonyms: "money back",
          sourceUrl: "/contact#message",
        },
        `clarteon_admin=${encodeURIComponent(token)}`,
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(mocks.approveKnowledgeQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: QUESTION_ID,
        title: "A clear answer",
        tags: ["refunds", "terms"],
        synonyms: ["money back"],
        actor: "admin",
      }),
    );
  });

  it("rejects a question for a signed-in reviewer", async () => {
    mocks.rejectKnowledgeQuestion.mockResolvedValue(true);
    const token = createAdminSessionToken(SECRET);

    const response = await reviewPost(
      reviewRequest(
        { action: "reject", questionId: QUESTION_ID },
        `clarteon_admin=${encodeURIComponent(token)}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.rejectKnowledgeQuestion).toHaveBeenCalledWith(QUESTION_ID, "admin");
  });
});
