export type KnowledgeContentType = "page" | "case-study" | "insight" | "faq";

export interface KnowledgeChunk {
  id: string;
  url: string;
  title: string;
  headingPath: string[];
  text: string;
  tags: string[];
  synonyms: string[];
}

export interface KnowledgeBaseIndex {
  version: 1;
  generatedAt: string;
  chunks: KnowledgeChunk[];
}

export interface KnowledgeSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ReviewQuestion {
  id: string;
  question: string;
  askCount: number;
  createdAt: string;
  lastSeenAt: string;
}

export interface KnowledgeFaq {
  id: string;
  slug: string;
  title: string;
  question: string;
  answer: string;
  tags: string[];
  synonyms: string[];
  sourceUrl: string;
  createdAt: string;
}

export interface StoredKnowledgeIndex extends KnowledgeBaseIndex {
  baseGeneratedAt: string;
}

export interface KnowledgeIndexStatus {
  chunkCount: number;
  faqCount: number;
  generatedAt: string;
  baseGeneratedAt: string;
}
