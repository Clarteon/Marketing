import { afterEach, describe, expect, it, vi } from "vitest";
import {
  approveKnowledgeQuestion,
  getReviewQueue,
  resetKnowledgeCacheForTests,
  searchKnowledge,
  syncKnowledgeIndex,
} from "@/lib/knowledge/service";
import type {
  ApproveQuestionInput,
  KnowledgeStore,
  NewUnansweredQuestion,
} from "@/lib/knowledge/store";
import type { KnowledgeBaseIndex, KnowledgeFaq, StoredKnowledgeIndex } from "@/lib/knowledge/types";

const baseIndex: KnowledgeBaseIndex = {
  version: 1,
  generatedAt: "2026-10-22T00:00:00.000Z",
  chunks: [
    {
      id: "solutions#ops",
      url: "/solutions#operations",
      title: "Too much manual admin",
      headingPath: ["Solutions", "Too much manual admin"],
      text: "Repeated data entry and manual reporting can be automated.",
      tags: ["automation"],
      synonyms: ["manual work"],
    },
    {
      id: "contact#book",
      url: "/contact#book",
      title: "Book a free discovery call",
      headingPath: ["Contact", "Book a free discovery call"],
      text: "Choose a time for a 30-minute call.",
      tags: ["discovery call"],
      synonyms: ["booking"],
    },
  ],
};

function createFakeStore(initialFaqs: KnowledgeFaq[] = []) {
  const faqs = [...initialFaqs];
  const logged: NewUnansweredQuestion[] = [];
  let storedIndex: StoredKnowledgeIndex | undefined;

  const store: KnowledgeStore = {
    logUnansweredQuestion: vi.fn(async (input: NewUnansweredQuestion) => {
      logged.push(input);
    }),
    listOpenQuestions: vi.fn(async () => [
      {
        id: "q-1",
        question: "Do you offer refunds?",
        askCount: 2,
        createdAt: "2026-10-21T00:00:00.000Z",
        lastSeenAt: "2026-10-22T00:00:00.000Z",
      },
    ]),
    listPublishedFaqs: vi.fn(async () => [...faqs]),
    approveQuestion: vi.fn(async (input: ApproveQuestionInput) => {
      const faq: KnowledgeFaq = {
        id: input.faqId,
        slug: input.slug,
        title: input.title,
        question: "Do you offer refunds?",
        answer: input.answer,
        tags: input.tags,
        synonyms: input.synonyms,
        sourceUrl: input.sourceUrl,
        createdAt: "2026-10-22T00:00:00.000Z",
      };
      faqs.push(faq);
      return faq;
    }),
    rejectQuestion: vi.fn(async () => true),
    getIndex: vi.fn(async () => storedIndex),
    saveIndex: vi.fn(async (index: StoredKnowledgeIndex) => {
      storedIndex = index;
    }),
  };

  return { store, faqs, logged };
}

afterEach(() => {
  resetKnowledgeCacheForTests();
});

describe("searchKnowledge", () => {
  it("returns snippets without logging an answered question", async () => {
    const { store, logged } = createFakeStore();
    const results = await searchKnowledge("automation", { store, baseIndex });

    expect(results[0]?.url).toBe("/solutions#operations");
    expect(logged).toHaveLength(0);
  });

  it("logs a redacted question when nothing is relevant", async () => {
    const { store, logged } = createFakeStore();
    const results = await searchKnowledge("Do you offer holograms? Email ada@example.com", {
      store,
      baseIndex,
    });

    expect(results).toEqual([]);
    expect(logged).toHaveLength(1);
    expect(logged[0].question).toContain("[email]");
    expect(logged[0].question).not.toContain("ada@example.com");
    expect(logged[0].fingerprint).toHaveLength(64);
  });

  it("can skip logging when the caller handles it", async () => {
    const { store, logged } = createFakeStore();
    await searchKnowledge("holograms", { store, baseIndex, logUnanswered: false });
    expect(logged).toHaveLength(0);
  });

  it("rebuilds with approved FAQs and searches them", async () => {
    const { store } = createFakeStore([
      {
        id: "faq-1",
        slug: "refund-policy-abc12345",
        title: "Refund policy",
        question: "Do you offer refunds?",
        answer: "We agree the terms in writing before work starts.",
        tags: ["refunds", "terms"],
        synonyms: ["money back"],
        sourceUrl: "/contact#message",
        createdAt: "2026-10-22T00:00:00.000Z",
      },
    ]);

    const results = await searchKnowledge("refunds", { store, baseIndex });
    expect(results[0]?.url).toBe("/contact#message");
    expect(store.saveIndex).toHaveBeenCalled();
  });
});

describe("review and sync", () => {
  it("lists the review queue", async () => {
    const { store } = createFakeStore();
    const questions = await getReviewQueue(50, { store });
    expect(questions).toHaveLength(1);
    expect(questions[0].askCount).toBe(2);
  });

  it("approves an answer and immediately adds it to search", async () => {
    const { store } = createFakeStore();
    const result = await approveKnowledgeQuestion(
      {
        questionId: "q-1",
        title: "Refund policy",
        answer: "We agree the terms in writing before work starts.",
        tags: ["refunds"],
        synonyms: ["money back"],
        sourceUrl: "/contact#message",
        actor: "admin",
      },
      { store, baseIndex },
    );

    expect(result?.reindexed).toBe(true);
    const results = await searchKnowledge("refunds", { store, baseIndex });
    expect(results[0]?.title).toBe("Refund policy");
  });

  it("syncs the bundled index and approved FAQs", async () => {
    const { store } = createFakeStore();
    const index = await syncKnowledgeIndex({ store, baseIndex });
    expect(index.baseGeneratedAt).toBe(baseIndex.generatedAt);
    expect(index.chunks.length).toBe(baseIndex.chunks.length);
    expect(store.saveIndex).toHaveBeenCalledWith(index);
  });

  it("uses a newly published content index after a sync", async () => {
    const { store } = createFakeStore();
    await syncKnowledgeIndex({ store, baseIndex });

    const published: KnowledgeBaseIndex = {
      ...baseIndex,
      generatedAt: "2026-10-23T00:00:00.000Z",
      chunks: [
        ...baseIndex.chunks,
        {
          id: "insights#new-article",
          url: "/insights/new-article",
          title: "A newly published article",
          headingPath: ["Insights", "A newly published article"],
          text: "This answer only exists after the new content was published.",
          tags: ["publishing"],
          synonyms: [],
        },
      ],
    };

    const index = await syncKnowledgeIndex({ store, baseIndex: published });
    const stored = await store.getIndex();

    expect(index.baseGeneratedAt).toBe(published.generatedAt);
    expect(index.chunks.some((chunk) => chunk.id === "insights#new-article")).toBe(true);
    expect(stored?.chunks.some((chunk) => chunk.id === "insights#new-article")).toBe(true);
  });

  it("returns undefined when the question is no longer open", async () => {
    const { store } = createFakeStore();
    vi.mocked(store.approveQuestion).mockResolvedValueOnce(undefined);
    const result = await approveKnowledgeQuestion(
      {
        questionId: "q-1",
        title: "Refund policy",
        answer: "A valid answer that is long enough.",
        tags: [],
        synonyms: [],
        sourceUrl: "/contact#message",
        actor: "admin",
      },
      { store, baseIndex },
    );
    expect(result).toBeUndefined();
  });
});
