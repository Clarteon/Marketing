export const CHAT_TURNSTILE_ACTION = "chat";
export const CHAT_COOKIE_NAME = "clarteon_chat";
export const CHAT_SESSION_SECONDS = 2 * 60 * 60;

export const CHAT_BODY_MAX_BYTES = 64 * 1024;
export const CHAT_MESSAGE_MAX_CHARS = 2_000;
export const CHAT_HISTORY_MAX_MESSAGES = 40;

// The free Groq tier allows about 200K tokens a day per model. These caps keep
// one conversation small enough to leave room for other visitors.
export const CHAT_MAX_COMPLETION_TOKENS = 600;
export const CHAT_HISTORY_TOKEN_BUDGET = 1_200;
export const CHAT_MAX_TOOL_ROUNDS = 2;
export const CHAT_MAX_TOOL_CALLS = 4;
export const CHAT_AVAILABILITY_SLOTS = 6;

export const CHAT_MODEL_TIMEOUT_MS = 20_000;
export const CHAT_TURN_TIMEOUT_MS = 50_000;

export const CHAT_IP_RATE_LIMIT = 10;
export const CHAT_SESSION_RATE_LIMIT = 8;
export const CHAT_RATE_WINDOW_MS = 60_000;

export const CHAT_LEAD_RATE_LIMIT = 5;
export const CHAT_AVAILABILITY_RATE_LIMIT = 10;
export const CHAT_BOOKING_RATE_LIMIT = 3;
export const CHAT_EMAIL_RATE_LIMIT = 3;
export const CHAT_HANDOFF_RATE_LIMIT = 3;
export const CHAT_ACTION_WINDOW_MS = 60 * 60 * 1_000;

export const CHAT_DAILY_TOKEN_BUDGET = 160_000;
export const CHAT_DAILY_ALERT_RATIO = 0.8;

export const CHAT_DEGRADED_MESSAGE =
  "I can’t take more messages right now. You can send a project brief or book a discovery call, and the team will reply by email.";

export const CHAT_BUSY_MESSAGE =
  "I hit a temporary problem. Please try again, or send a project brief and the team will follow up by email.";
