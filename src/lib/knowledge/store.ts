import "server-only";
import { getConfig } from "@/lib/config";
import { NeonKnowledgeStore } from "./neon-store";
import type { KnowledgeFaq, ReviewQuestion, StoredKnowledgeIndex } from "./types";

export interface NewUnansweredQuestion {
  id: string;
  question: string;
  fingerprint: string;
  sourceUrl?: string;
}

export interface ApproveQuestionInput {
  questionId: string;
  faqId: string;
  auditId: string;
  slug: string;
  title: string;
  answer: string;
  tags: string[];
  synonyms: string[];
  sourceUrl: string;
  actor: string;
}

export interface RejectQuestionInput {
  questionId: string;
  auditId: string;
  actor: string;
}

export interface KnowledgeStore {
  logUnansweredQuestion(input: NewUnansweredQuestion): Promise<void>;
  listOpenQuestions(limit: number): Promise<ReviewQuestion[]>;
  listPublishedFaqs(): Promise<KnowledgeFaq[]>;
  approveQuestion(input: ApproveQuestionInput): Promise<KnowledgeFaq | undefined>;
  rejectQuestion(input: RejectQuestionInput): Promise<boolean>;
  getIndex(): Promise<StoredKnowledgeIndex | undefined>;
  saveIndex(index: StoredKnowledgeIndex): Promise<void>;
}

export class KnowledgeStoreNotConfiguredError extends Error {
  constructor() {
    super("The knowledge store is not configured.");
    this.name = "KnowledgeStoreNotConfiguredError";
  }
}

let store: KnowledgeStore | undefined;

export function getKnowledgeStore(): KnowledgeStore {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) throw new KnowledgeStoreNotConfiguredError();

  store ??= new NeonKnowledgeStore(DATABASE_URL);
  return store;
}

export function resetKnowledgeStoreForTests(): void {
  store = undefined;
}
