import "server-only";
import { alertTeam } from "@/lib/alerts";
import { CHAT_DAILY_ALERT_RATIO, CHAT_DAILY_TOKEN_BUDGET } from "./constants";

interface UsageState {
  day: string;
  tokens: number;
  alerted: boolean;
}

let state: UsageState | undefined;

function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function current(now: number): UsageState {
  const day = dayKey(now);
  if (!state || state.day !== day) state = { day, tokens: 0, alerted: false };
  return state;
}

/** In-memory estimate per server instance. The P6 review moves this to the shared store. */
export function chatBudgetAvailable(now = Date.now()): boolean {
  return current(now).tokens < CHAT_DAILY_TOKEN_BUDGET;
}

export function recordChatTokens(tokens: number, now = Date.now()): number {
  const entry = current(now);
  entry.tokens += Math.max(0, Math.ceil(tokens));

  const threshold = Math.floor(CHAT_DAILY_TOKEN_BUDGET * CHAT_DAILY_ALERT_RATIO);
  if (!entry.alerted && entry.tokens >= threshold) {
    entry.alerted = true;
    void alertTeam("usage_threshold", {
      metric: "chat_tokens",
      count: entry.tokens,
      threshold: CHAT_DAILY_TOKEN_BUDGET,
      day: entry.day,
    });
  }

  return entry.tokens;
}

export function chatTokensUsed(now = Date.now()): number {
  return current(now).tokens;
}

export function resetChatUsageForTests(): void {
  state = undefined;
}
