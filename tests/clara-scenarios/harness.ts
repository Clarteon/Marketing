import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "vitest";
import { GoogleCalendarError } from "@/lib/booking/errors";
import type { BookingResult } from "@/lib/booking/service";
import type { BookingSlot } from "@/lib/booking/types";
import { streamModelCompletion } from "@/lib/chat/model";
import { runChatTurn } from "@/lib/chat/run";
import type { ChatHistoryMessage } from "@/lib/chat/schema";
import { executeChatTool, type ChatToolContext, type ChatToolDependencies } from "@/lib/chat/tools";
import { resetChatUsageForTests } from "@/lib/chat/usage";
import type { OutboundEmail } from "@/lib/email/resend";
import type { Env } from "@/lib/env-schema";
import { resetRateLimitsForTests } from "@/lib/guardrails/rate-limit";
import {
  resetKnowledgeCacheForTests,
  searchKnowledge,
  syncKnowledgeIndex,
} from "@/lib/knowledge/service";
import type {
  ApproveQuestionInput,
  KnowledgeStore,
  NewUnansweredQuestion,
  RejectQuestionInput,
} from "@/lib/knowledge/store";
import type {
  KnowledgeBaseIndex,
  KnowledgeFaq,
  ReviewQuestion,
  StoredKnowledgeIndex,
} from "@/lib/knowledge/types";
import type {
  EmailKind,
  Lead,
  LeadStore,
  LeadUpdate,
  NewLead,
  SaveLeadResult,
} from "@/lib/leads/store";

export const FIXED_NOW = new Date("2026-10-24T08:00:00.000Z");
export const TEST_TIMEZONE = "Asia/Manila";
export const TEST_IP = "203.0.113.7";

export const TEST_CONFIG: Pick<Env, "GROQ_API_KEY" | "LLM_MODEL_PRIMARY" | "LLM_MODEL_FALLBACKS"> =
  {
    GROQ_API_KEY: process.env.GROQ_API_KEY ?? "",
    LLM_MODEL_PRIMARY: "openai/gpt-oss-120b",
    LLM_MODEL_FALLBACKS: "openai/gpt-oss-20b,qwen/qwen3.8-27b",
  };

export const SLOTS: BookingSlot[] = [
  {
    id: "slot-monday-0900",
    start: "2026-10-26T01:00:00.000Z",
    end: "2026-10-26T01:30:00.000Z",
  },
  {
    id: "slot-monday-1000",
    start: "2026-10-26T02:00:00.000Z",
    end: "2026-10-26T02:30:00.000Z",
  },
];

export class MemoryLeadStore implements LeadStore {
  readonly leads: Lead[] = [];

  async save(input: NewLead): Promise<SaveLeadResult> {
    const existing = this.leads.find((lead) => lead.requestId === input.requestId);
    if (existing) return { lead: existing, created: false };

    const lead: Lead = {
      ...input,
      id: `lead-${this.leads.length + 1}`,
      createdAt: FIXED_NOW,
    };
    this.leads.push(lead);
    return { lead, created: true };
  }

  async updateFromChat(id: string, input: LeadUpdate): Promise<Lead> {
    const lead = this.leads.find((item) => item.id === id);
    if (!lead) throw new Error("lead_not_found");
    Object.assign(lead, input);
    return lead;
  }

  async markEmailSent(): Promise<void> {}
  async markEmailFailure(): Promise<void> {}
}

export class MemoryKnowledgeStore implements KnowledgeStore {
  readonly questions: NewUnansweredQuestion[] = [];
  private index: StoredKnowledgeIndex | undefined;

  async logUnansweredQuestion(input: NewUnansweredQuestion): Promise<void> {
    this.questions.push(input);
  }

  async listOpenQuestions(limit: number): Promise<ReviewQuestion[]> {
    return this.questions.slice(0, limit).map((question) => ({
      id: question.id,
      question: question.question,
      askCount: 1,
      createdAt: FIXED_NOW.toISOString(),
      lastSeenAt: FIXED_NOW.toISOString(),
    }));
  }

  async listPublishedFaqs(): Promise<KnowledgeFaq[]> {
    return [];
  }

  async approveQuestion(_input: ApproveQuestionInput): Promise<KnowledgeFaq | undefined> {
    return undefined;
  }

  async rejectQuestion(_input: RejectQuestionInput): Promise<boolean> {
    return false;
  }

  async getIndex(): Promise<StoredKnowledgeIndex | undefined> {
    return this.index;
  }

  async saveIndex(index: StoredKnowledgeIndex): Promise<void> {
    this.index = index;
  }
}

export interface ToolEvent {
  turn: number;
  at: number;
  name: string;
  args: unknown;
  result: unknown;
}

export interface TextEvent {
  turn: number;
  at: number;
  text: string;
}

export interface TurnRecord {
  visitor: string;
  reply: string;
  model?: string;
  degraded?: boolean;
  error?: string;
  toolCalls: ToolEvent[];
}

export interface ScenarioRun {
  id: number;
  name: string;
  turns: TurnRecord[];
  toolEvents: ToolEvent[];
  textEvents: TextEvent[];
  leadStore: MemoryLeadStore;
  knowledgeStore: MemoryKnowledgeStore;
  sentEmails: OutboundEmail[];
  history: ChatHistoryMessage[];
  initialHistoryLength: number;
  availabilityCalls: Array<{ timezone: string; now?: Date }>;
  bookingCalls: Array<Record<string, unknown>>;
}

export interface ScenarioState {
  turns: TurnRecord[];
  toolEvents: ToolEvent[];
}

export type ScenarioMessages = string[] | ((state: ScenarioState) => string | undefined);

export interface ScenarioOptions {
  id: number;
  name: string;
  messages: ScenarioMessages;
  maxTurns?: number;
  baseIndex?: KnowledgeBaseIndex;
  booking?: NonNullable<ChatToolDependencies["bookDiscoveryCall"]>;
  availability?: NonNullable<ChatToolDependencies["getAvailability"]>;
  model?: typeof streamModelCompletion;
  history?: ChatHistoryMessage[];
  now?: Date;
  pageUrl?: string;
  timezone?: string;
  turnDelayMs?: number;
  notes?: string;
}

export interface ScenarioResult {
  id: number;
  name: string;
  status: "pass" | "fail";
  failures: string[];
  turns: TurnRecord[];
  toolEvents: ToolEvent[];
  sentEmails: string[];
  loggedQuestions: string[];
  savedLeads: number;
  notes?: string;
}

const results: ScenarioResult[] = [];

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultBooking(input: {
  requestId: string;
  slotId: string;
  name: string;
  email: string;
  timezone: string;
}): BookingResult {
  return {
    booking: {
      requestId: input.requestId,
      slotStart: new Date("2026-10-26T01:00:00.000Z"),
      slotEnd: new Date("2026-10-26T01:30:00.000Z"),
      name: input.name,
      email: input.email,
      notes: "Booked through Clara.",
      timezone: input.timezone,
      status: "confirmed",
      meetLink: "https://meet.google.com/abc-defg-hij",
      createdAt: FIXED_NOW,
      confirmedAt: FIXED_NOW,
    },
    confirmationEmailSent: true,
    teamEmailSent: true,
  };
}

export async function runScenario(options: ScenarioOptions): Promise<ScenarioRun> {
  resetChatUsageForTests();
  resetRateLimitsForTests();
  resetKnowledgeCacheForTests();

  const sessionId = randomUUID();
  const history: ChatHistoryMessage[] = [...(options.history ?? [])];
  const initialHistoryLength = history.length;
  const leadStore = new MemoryLeadStore();
  const knowledgeStore = new MemoryKnowledgeStore();
  const sentEmails: OutboundEmail[] = [];
  const availabilityCalls: Array<{ timezone: string; now?: Date }> = [];
  const bookingCalls: Array<Record<string, unknown>> = [];
  const baseIndexRef: { current: KnowledgeBaseIndex | undefined } = {
    current: options.baseIndex,
  };
  const toolEvents: ToolEvent[] = [];
  const textEvents: TextEvent[] = [];
  const turns: TurnRecord[] = [];
  let currentTurn = 0;

  const getAvailability: NonNullable<ChatToolDependencies["getAvailability"]> =
    options.availability ??
    (async (input) => {
      const timezone = input?.timezone ?? TEST_TIMEZONE;
      availabilityCalls.push({ timezone, now: input?.now });
      return { timezone, slots: SLOTS };
    });

  const bookDiscoveryCall: NonNullable<ChatToolDependencies["bookDiscoveryCall"]> =
    options.booking ??
    (async (input) => {
      bookingCalls.push(input as unknown as Record<string, unknown>);
      return defaultBooking(input);
    });

  const toolDependencies: ChatToolDependencies = {
    searchKnowledge: (query, searchOptions = {}) =>
      searchKnowledge(query, {
        ...searchOptions,
        store: knowledgeStore,
        baseIndex: baseIndexRef.current,
        logUnanswered: true,
      }),
    getLeadStore: () => leadStore,
    sendLeadEmails: async () => ({ team: true, receipt: true }),
    getAvailability,
    bookDiscoveryCall,
    sendEmail: async (message) => {
      sentEmails.push(message);
    },
    alertTeam: async () => true,
  };

  const executeTool = async (name: string, args: unknown, context: ChatToolContext) => {
    const result = await executeChatTool(name, args, context);
    toolEvents.push({
      turn: currentTurn,
      at: Date.now(),
      name,
      args,
      result,
    });
    return result;
  };

  const maxTurns =
    options.maxTurns ?? (Array.isArray(options.messages) ? options.messages.length : 6);

  for (let index = 0; index < maxTurns; index += 1) {
    currentTurn = index;
    const message = Array.isArray(options.messages)
      ? options.messages[index]
      : options.messages({ turns, toolEvents });
    if (!message) break;

    let reply = "";
    const toolStart = toolEvents.length;
    try {
      const result = await runChatTurn({
        request: {
          sessionId,
          message,
          history: [...history],
          timezone: options.timezone ?? TEST_TIMEZONE,
          pageUrl: options.pageUrl ?? "/",
        },
        sessionId,
        ip: TEST_IP,
        pageUrl: options.pageUrl ?? "/",
        onText: (text) => {
          reply += text;
          textEvents.push({ turn: index, at: Date.now(), text });
        },
        deps: {
          config: TEST_CONFIG,
          streamModel: options.model,
          toolDependencies,
          now: options.now ?? FIXED_NOW,
        },
      });

      turns.push({
        visitor: message,
        reply,
        model: result.model,
        degraded: result.degraded,
        toolCalls: toolEvents.slice(toolStart),
      });

      if (result.degraded) break;
      history.push({ role: "user", content: message }, { role: "assistant", content: reply });
    } catch (error) {
      turns.push({
        visitor: message,
        reply,
        error: error instanceof Error ? `${error.name}: ${error.message}` : "unknown error",
        toolCalls: toolEvents.slice(toolStart),
      });
      break;
    }

    await sleep(options.turnDelayMs ?? 2_500);
  }

  return {
    id: options.id,
    name: options.name,
    turns,
    toolEvents,
    textEvents,
    leadStore,
    knowledgeStore,
    sentEmails,
    history,
    initialHistoryLength,
    availabilityCalls,
    bookingCalls,
  };
}

export type Check = (run: ScenarioRun) => string[] | string | undefined;

export async function runAndCheck(options: ScenarioOptions, checks: Check[]): Promise<ScenarioRun> {
  let run: ScenarioRun;
  try {
    run = await runScenario(options);
  } catch (error) {
    const failure = error instanceof Error ? `${error.name}: ${error.message}` : "unknown error";
    results.push({
      id: options.id,
      name: options.name,
      status: "fail",
      failures: [failure],
      turns: [],
      toolEvents: [],
      sentEmails: [],
      loggedQuestions: [],
      savedLeads: 0,
      notes: options.notes,
    });
    throw error;
  }

  const failures = checks.flatMap((check) => {
    const value = check(run);
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  });

  for (const turn of run.turns) {
    if (turn.error) failures.push(`turn failed: ${turn.error}`);
    if (turn.degraded) failures.push("the turn ended in degraded mode");
  }

  results.push({
    id: options.id,
    name: options.name,
    status: failures.length === 0 ? "pass" : "fail",
    failures,
    turns: run.turns,
    toolEvents: run.toolEvents,
    sentEmails: run.sentEmails.map((email) => email.to),
    loggedQuestions: run.knowledgeStore.questions.map((question) => question.question),
    savedLeads: run.leadStore.leads.length,
    notes: options.notes,
  });

  expect(failures, `${options.name}\n${failures.join("\n")}`).toEqual([]);
  return run;
}

export function replies(run: ScenarioRun): string {
  return run.turns.map((turn) => turn.reply).join("\n");
}

export function lastReply(run: ScenarioRun): string {
  return run.turns.at(-1)?.reply ?? "";
}

export function toolCalls(run: ScenarioRun, name: string): ToolEvent[] {
  return run.toolEvents.filter((event) => event.name === name);
}

export function firstTool(run: ScenarioRun, name: string): ToolEvent | undefined {
  return run.toolEvents.find((event) => event.name === name);
}

export function check(condition: boolean, message: string): string[] {
  return condition ? [] : [message];
}

const PRICE_FIGURE =
  /[$₱€£]|\b\d[\d,.]*\s*(?:k|thousand|million|usd|php|pesos?|dollars?)\b|\b(?:price|cost|costs|rate|budget|fee|quote|quotation|retainer|charge|estimate)\b[^.!?]{0,20}\d|\b\d[\d,.]*\s*(?:-|to|–)\s*\d[\d,.]*\b|\b\d+(?:\.\d+)?k\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|fifty|hundred|thousand|million)\b[^.!?]{0,20}\b(?:dollars?|pesos?|usd|php)\b/i;

export function hasPriceFigure(text: string): boolean {
  return PRICE_FIGURE.test(text);
}

export function offersCall(text: string): boolean {
  return /discovery call|book (?:a )?(?:call|time)|find a time|schedule|talk to|speak with|short call/i.test(
    text,
  );
}

export function offersHuman(text: string): boolean {
  return /person|human|team|handoff|connect you|someone|colleague|real person|follow up/i.test(
    text,
  );
}

export function isUncertain(text: string): boolean {
  return /not sure|don't know|do not know|can't confirm|cannot confirm|no information|not aware|haven't published|not published|unable to confirm|don't have|do not have/i.test(
    text,
  );
}

export function isYoungCompany(text: string): boolean {
  return /young company|early|new company|just starting|not yet|no public case studies|haven't published|do not have case studies|don't have case studies/i.test(
    text,
  );
}

export function bookingClaim(text: string): boolean {
  return /\b(?:is|has been|you're|you are)\s+(?:all\s+)?(?:booked|confirmed|scheduled|reserved)\b|\bbooked (?:for|at|on)\b/i.test(
    text,
  );
}

export function questionsIn(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

export function sentencesIn(text: string): number {
  return text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

export function jaccard(left: string, right: string): number {
  const words = (value: string) =>
    new Set(
      value
        .toLowerCase()
        .match(/[a-z']+/g)
        ?.filter((word) => word.length > 2) ?? [],
    );
  const a = words(left);
  const b = words(right);
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((word) => b.has(word)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export function checkBookingReadBack(run: ScenarioRun): string[] {
  const firstBook = firstTool(run, "book_call");
  if (!firstBook) return ["book_call was not called"];

  const before = run.textEvents
    .filter((event) => event.at < firstBook.at)
    .map((event) => event.text)
    .join(" ");
  const failures: string[] = [];
  if (!/Ada/i.test(before)) {
    failures.push("book_call was called before Clara read the visitor's name back");
  }
  if (!/ada@example\.com/i.test(before)) {
    failures.push("book_call was called before Clara read the visitor's email back");
  }
  return failures;
}

export async function syncScenarioKnowledge(
  run: ScenarioRun,
  baseIndex: KnowledgeBaseIndex,
): Promise<void> {
  await syncKnowledgeIndex({ store: run.knowledgeStore, baseIndex });
  resetKnowledgeCacheForTests();
}

export async function writeScenarioReport(): Promise<void> {
  const directory = path.join(process.cwd(), "test-results", "clara-scenarios");
  await mkdir(directory, { recursive: true });

  const generatedAt = new Date().toISOString();
  const payload = { generatedAt, results };
  await writeFile(path.join(directory, "latest.json"), `${JSON.stringify(payload, null, 2)}\n`);

  const rows = results
    .sort((left, right) => left.id - right.id)
    .map((result) => {
      const detail =
        result.failures.length > 0 ? result.failures.join("; ").replace(/\|/g, "\\|") : "Passed";
      return `| ${result.id} | ${result.name} | ${result.status} | ${detail} |`;
    });

  const markdown = [
    "# Clara scenario run",
    "",
    `Generated: ${generatedAt}`,
    "",
    "| # | Scenario | Result | Notes |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    "Full transcripts, tool calls and replies are in `latest.json`.",
    "",
  ].join("\n");

  await writeFile(path.join(directory, "latest.md"), markdown);
}

export function scenarioResultCount(): number {
  return results.length;
}

export function resetScenarioResultsForTests(): void {
  results.length = 0;
}
