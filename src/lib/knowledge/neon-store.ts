import "server-only";
import { neon } from "@neondatabase/serverless";
import type {
  ApproveQuestionInput,
  KnowledgeStore,
  NewUnansweredQuestion,
  RejectQuestionInput,
} from "./store";
import type { KnowledgeFaq, ReviewQuestion, StoredKnowledgeIndex } from "./types";

interface QuestionRow {
  id: string;
  question: string;
  ask_count: number;
  created_at: string | Date;
  last_seen_at: string | Date;
}

interface FaqRow {
  id: string;
  slug: string;
  title: string;
  question: string;
  answer: string;
  tags: string[] | null;
  synonyms: string[] | null;
  source_url: string;
  created_at: string | Date;
}

interface IndexRow {
  payload: unknown;
}

type Sql = ReturnType<typeof neon>;

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapQuestion(row: QuestionRow): ReviewQuestion {
  return {
    id: row.id,
    question: row.question,
    askCount: Number(row.ask_count),
    createdAt: iso(row.created_at),
    lastSeenAt: iso(row.last_seen_at),
  };
}

function mapFaq(row: FaqRow): KnowledgeFaq {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    question: row.question,
    answer: row.answer,
    tags: row.tags ?? [],
    synonyms: row.synonyms ?? [],
    sourceUrl: row.source_url,
    createdAt: iso(row.created_at),
  };
}

export class NeonKnowledgeStore implements KnowledgeStore {
  private readonly sql: Sql;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  async logUnansweredQuestion(input: NewUnansweredQuestion): Promise<void> {
    await this.sql`
      INSERT INTO knowledge_questions (id, question, fingerprint, source_url)
      VALUES (${input.id}, ${input.question}, ${input.fingerprint}, ${input.sourceUrl ?? null})
      ON CONFLICT (fingerprint) DO UPDATE SET
        ask_count = knowledge_questions.ask_count + 1,
        last_seen_at = now(),
        question = EXCLUDED.question,
        source_url = COALESCE(EXCLUDED.source_url, knowledge_questions.source_url)
      WHERE knowledge_questions.status = 'open'
    `;
  }

  async listOpenQuestions(limit: number): Promise<ReviewQuestion[]> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    const rows = (await this.sql`
      SELECT id, question, ask_count, created_at, last_seen_at
      FROM knowledge_questions
      WHERE status = 'open'
      ORDER BY last_seen_at DESC
      LIMIT ${safeLimit}
    `) as unknown as QuestionRow[];

    return rows.map(mapQuestion);
  }

  async listPublishedFaqs(): Promise<KnowledgeFaq[]> {
    const rows = (await this.sql`
      SELECT id, slug, title, question, answer, tags, synonyms, source_url, created_at
      FROM knowledge_faqs
      WHERE status = 'published'
      ORDER BY created_at ASC
    `) as unknown as FaqRow[];

    return rows.map(mapFaq);
  }

  async approveQuestion(input: ApproveQuestionInput): Promise<KnowledgeFaq | undefined> {
    const rows = (await this.sql`
      WITH target AS (
        SELECT id, question
        FROM knowledge_questions
        WHERE id = ${input.questionId} AND status = 'open'
      ), inserted AS (
        INSERT INTO knowledge_faqs (
          id, slug, title, question, answer, tags, synonyms, source_url,
          status, source_question_id
        )
        SELECT
          ${input.faqId}, ${input.slug}, ${input.title}, target.question,
          ${input.answer}, ${input.tags}, ${input.synonyms}, ${input.sourceUrl},
          'published', target.id
        FROM target
        RETURNING
          id, slug, title, question, answer, tags, synonyms, source_url, created_at
      ), updated AS (
        UPDATE knowledge_questions AS q
        SET
          status = 'approved',
          answer = ${input.answer},
          reviewed_at = now(),
          reviewed_by = ${input.actor}
        FROM target
        WHERE q.id = target.id
        RETURNING q.id
      ), audit AS (
        INSERT INTO knowledge_audit (id, action, question_id, faq_id, actor)
        SELECT ${input.auditId}, 'approve', target.id, inserted.id, ${input.actor}
        FROM target, inserted
      )
      SELECT id, slug, title, question, answer, tags, synonyms, source_url, created_at
      FROM inserted
    `) as unknown as FaqRow[];

    return rows.length > 0 ? mapFaq(rows[0]) : undefined;
  }

  async rejectQuestion(input: RejectQuestionInput): Promise<boolean> {
    const rows = (await this.sql`
      WITH target AS (
        SELECT id
        FROM knowledge_questions
        WHERE id = ${input.questionId} AND status = 'open'
      ), updated AS (
        UPDATE knowledge_questions AS q
        SET
          status = 'rejected',
          reviewed_at = now(),
          reviewed_by = ${input.actor}
        FROM target
        WHERE q.id = target.id
        RETURNING q.id
      ), audit AS (
        INSERT INTO knowledge_audit (id, action, question_id, actor)
        SELECT ${input.auditId}, 'reject', target.id, ${input.actor}
        FROM target
      )
      SELECT id FROM updated
    `) as unknown as Array<{ id: string }>;

    return rows.length > 0;
  }

  async getIndex(): Promise<StoredKnowledgeIndex | undefined> {
    const rows = (await this.sql`
      SELECT payload
      FROM knowledge_index
      WHERE id = 'active'
      LIMIT 1
    `) as unknown as IndexRow[];

    if (rows.length === 0) return undefined;
    const payload =
      typeof rows[0].payload === "string" ? JSON.parse(rows[0].payload) : rows[0].payload;
    if (!payload || typeof payload !== "object") return undefined;

    const index = payload as Partial<StoredKnowledgeIndex>;
    if (!Array.isArray(index.chunks) || typeof index.baseGeneratedAt !== "string") {
      return undefined;
    }

    return {
      version: 1,
      generatedAt: typeof index.generatedAt === "string" ? index.generatedAt : "",
      baseGeneratedAt: index.baseGeneratedAt,
      chunks: index.chunks,
    };
  }

  async saveIndex(index: StoredKnowledgeIndex): Promise<void> {
    await this.sql`
      INSERT INTO knowledge_index (id, generated_at, base_generated_at, chunk_count, payload)
      VALUES (
        'active', ${index.generatedAt}, ${index.baseGeneratedAt}, ${index.chunks.length},
        ${JSON.stringify(index)}::jsonb
      )
      ON CONFLICT (id) DO UPDATE SET
        generated_at = EXCLUDED.generated_at,
        base_generated_at = EXCLUDED.base_generated_at,
        chunk_count = EXCLUDED.chunk_count,
        payload = EXCLUDED.payload
    `;
  }
}
