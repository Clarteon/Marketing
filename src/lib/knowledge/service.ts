import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { logServerEvent } from "@/lib/log";
import bundledIndexJson from "./generated/index.json";
import { faqToChunk } from "./faq";
import { isUsefulQuestion, redactQuestion } from "./redact";
import { createSearchIndex, searchKnowledgeIndex, type SearchIndex } from "./search";
import { getKnowledgeStore, type KnowledgeStore, type RejectQuestionInput } from "./store";
import type {
  KnowledgeBaseIndex,
  KnowledgeFaq,
  KnowledgeIndexStatus,
  KnowledgeSearchResult,
  ReviewQuestion,
  StoredKnowledgeIndex,
} from "./types";

const bundledIndex = bundledIndexJson as KnowledgeBaseIndex;

export interface KnowledgeServiceDependencies {
  store?: KnowledgeStore;
  baseIndex?: KnowledgeBaseIndex;
}

export interface SearchKnowledgeOptions extends KnowledgeServiceDependencies {
  /** Set false when the caller only wants retrieval and will log separately. */
  logUnanswered?: boolean;
  sourceUrl?: string;
}

export interface ApproveQuestionResult {
  faq: KnowledgeFaq;
  reindexed: boolean;
}

let cachedIndex: StoredKnowledgeIndex | undefined;
let cachedSearch: SearchIndex | undefined;

function storeFor(dependencies: KnowledgeServiceDependencies): KnowledgeStore | undefined {
  if (dependencies.store) return dependencies.store;
  try {
    return getKnowledgeStore();
  } catch {
    return undefined;
  }
}

function baseFor(dependencies: KnowledgeServiceDependencies): KnowledgeBaseIndex {
  return dependencies.baseIndex ?? bundledIndex;
}

function remember(index: StoredKnowledgeIndex, search: SearchIndex): void {
  cachedIndex = index;
  cachedSearch = search;
}

function buildIndex(
  base: KnowledgeBaseIndex,
  faqs: KnowledgeFaq[],
  generatedAt = new Date().toISOString(),
): StoredKnowledgeIndex {
  return {
    version: 1,
    generatedAt,
    baseGeneratedAt: base.generatedAt,
    chunks: [...base.chunks, ...faqs.map(faqToChunk)],
  };
}

function searchFor(index: StoredKnowledgeIndex): SearchIndex {
  if (cachedIndex === index && cachedSearch) return cachedSearch;
  const search = createSearchIndex(index.chunks);
  remember(index, search);
  return search;
}

async function loadIndex(
  dependencies: KnowledgeServiceDependencies = {},
): Promise<StoredKnowledgeIndex> {
  const base = baseFor(dependencies);
  const useCache = !dependencies.store && !dependencies.baseIndex;

  if (useCache && cachedIndex?.baseGeneratedAt === base.generatedAt) {
    return cachedIndex;
  }

  const store = storeFor(dependencies);
  if (!store) {
    const fallback = buildIndex(base, [], base.generatedAt);
    if (useCache) remember(fallback, createSearchIndex(fallback.chunks));
    return fallback;
  }

  try {
    const stored = await store.getIndex();
    if (stored?.baseGeneratedAt === base.generatedAt) {
      const search = createSearchIndex(stored.chunks);
      if (useCache) remember(stored, search);
      return stored;
    }

    const faqs = await store.listPublishedFaqs();
    const rebuilt = buildIndex(base, faqs);
    await store.saveIndex(rebuilt).catch((error) => {
      logServerEvent("knowledge_index_save_failed", {
        code: error instanceof Error ? error.name : "unknown",
      });
    });
    const search = createSearchIndex(rebuilt.chunks);
    if (useCache) remember(rebuilt, search);
    return rebuilt;
  } catch (error) {
    logServerEvent("knowledge_index_load_failed", {
      code: error instanceof Error ? error.name : "unknown",
    });
    const fallback = buildIndex(base, [], base.generatedAt);
    if (useCache) remember(fallback, createSearchIndex(fallback.chunks));
    return fallback;
  }
}

function fingerprint(question: string): string {
  return createHash("sha256").update(question.toLowerCase()).digest("hex");
}

async function logUnanswered(
  rawQuestion: string,
  dependencies: KnowledgeServiceDependencies,
  sourceUrl?: string,
): Promise<void> {
  const question = redactQuestion(rawQuestion);
  if (!isUsefulQuestion(question)) return;

  const store = storeFor(dependencies);
  if (!store) return;

  try {
    await store.logUnansweredQuestion({
      id: randomUUID(),
      question,
      fingerprint: fingerprint(question),
      sourceUrl,
    });
  } catch (error) {
    logServerEvent("knowledge_question_log_failed", {
      code: error instanceof Error ? error.name : "unknown",
    });
  }
}

/**
 * Retrieve at most three published snippets. When nothing relevant is found,
 * the redacted question goes to the review queue so the team can decide
 * whether the site needs a new answer.
 */
export async function searchKnowledge(
  query: string,
  options: SearchKnowledgeOptions = {},
): Promise<KnowledgeSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2 || trimmed.length > 1_000) return [];

  const index = await loadIndex(options);
  const results = searchKnowledgeIndex(searchFor(index), trimmed, 3);

  if (results.length === 0 && options.logUnanswered !== false) {
    await logUnanswered(trimmed, options, options.sourceUrl);
  }

  return results;
}

export async function syncKnowledgeIndex(
  dependencies: KnowledgeServiceDependencies = {},
): Promise<StoredKnowledgeIndex> {
  const store = dependencies.store ?? getKnowledgeStore();
  const base = baseFor(dependencies);
  const faqs = await store.listPublishedFaqs();
  const rebuilt = buildIndex(base, faqs);
  await store.saveIndex(rebuilt);
  remember(rebuilt, createSearchIndex(rebuilt.chunks));
  return rebuilt;
}

export async function getReviewQueue(
  limit = 50,
  dependencies: KnowledgeServiceDependencies = {},
): Promise<ReviewQuestion[]> {
  const store = dependencies.store ?? getKnowledgeStore();
  return store.listOpenQuestions(limit);
}

function faqSlug(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
  return `${base || "answer"}-${id.slice(0, 8)}`;
}

export interface ApproveKnowledgeQuestionInput {
  questionId: string;
  title: string;
  answer: string;
  tags: string[];
  synonyms: string[];
  sourceUrl: string;
  actor: string;
}

export async function approveKnowledgeQuestion(
  input: ApproveKnowledgeQuestionInput,
  dependencies: KnowledgeServiceDependencies = {},
): Promise<ApproveQuestionResult | undefined> {
  const store = dependencies.store ?? getKnowledgeStore();
  const faqId = randomUUID();
  const faq = await store.approveQuestion({
    questionId: input.questionId,
    faqId,
    auditId: randomUUID(),
    slug: faqSlug(input.title, faqId),
    title: input.title,
    answer: input.answer,
    tags: input.tags,
    synonyms: input.synonyms,
    sourceUrl: input.sourceUrl,
    actor: input.actor,
  });

  if (!faq) return undefined;

  try {
    const index = await syncKnowledgeIndex({ ...dependencies, store });
    return { faq, reindexed: index.chunks.length > 0 };
  } catch (error) {
    logServerEvent("knowledge_reindex_failed", {
      code: error instanceof Error ? error.name : "unknown",
    });
    cachedIndex = undefined;
    cachedSearch = undefined;
    return { faq, reindexed: false };
  }
}

export async function rejectKnowledgeQuestion(
  questionId: string,
  actor: string,
  dependencies: KnowledgeServiceDependencies = {},
): Promise<boolean> {
  const store = dependencies.store ?? getKnowledgeStore();
  const input: RejectQuestionInput = {
    questionId,
    auditId: randomUUID(),
    actor,
  };
  return store.rejectQuestion(input);
}

export async function getKnowledgeStatus(
  dependencies: KnowledgeServiceDependencies = {},
): Promise<KnowledgeIndexStatus> {
  const index = await loadIndex(dependencies);
  return {
    chunkCount: index.chunks.length,
    faqCount: index.chunks.filter((chunk) => chunk.id.startsWith("faq-")).length,
    generatedAt: index.generatedAt,
    baseGeneratedAt: index.baseGeneratedAt,
  };
}

export function resetKnowledgeCacheForTests(): void {
  cachedIndex = undefined;
  cachedSearch = undefined;
}
