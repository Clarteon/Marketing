import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.email().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());
const optionalBooleanString = z.preprocess(emptyToUndefined, z.enum(["true", "false"]).optional());
const optionalLongSecret = z.preprocess(emptyToUndefined, z.string().min(32).optional());
const stringWithDefault = (defaultValue: string) =>
  z.preprocess(emptyToUndefined, z.string().trim().min(1).default(defaultValue));
const positiveInteger = (defaultValue: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(defaultValue));

export const envSchema = z.object({
  NODE_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(["development", "test", "production"]).default("development"),
  ),

  // Public site settings
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  NEXT_PUBLIC_ALLOW_INDEXING: optionalBooleanString,

  // Chat model
  GROQ_API_KEY: optionalString,
  LLM_MODEL_PRIMARY: stringWithDefault("openai/gpt-oss-120b"),
  LLM_MODEL_FALLBACKS: stringWithDefault("openai/gpt-oss-20b,qwen/qwen3.8-27b"),
  LLM_PROMPT_GUARD_MODEL: optionalString,

  // Google Calendar
  GOOGLE_CALENDAR_ID: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  GOOGLE_REFRESH_TOKEN: optionalString,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: optionalEmail,
  GOOGLE_PRIVATE_KEY: optionalString,

  // Lead database
  DATABASE_URL: optionalUrl,

  // Form bot protection
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,
  TURNSTILE_SECRET_KEY: optionalString,

  // Email
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
  EMAIL_REPLY_TO: optionalEmail,
  TEAM_ALERT_EMAIL: optionalEmail,

  // Sync, admin and chat sessions
  SYNC_SECRET: optionalLongSecret,
  ADMIN_AUTH_SECRET: optionalLongSecret,
  CHAT_SESSION_SECRET: optionalLongSecret,

  // Limits
  RATE_LIMIT_WINDOW_SECONDS: positiveInteger(60),
  RATE_LIMIT_MAX_REQUESTS: positiveInteger(20),
  CHAT_MAX_MESSAGES: positiveInteger(20),

  // Alerts (Resend free plan sends 100 emails a day)
  EMAIL_DAILY_ALERT_THRESHOLD: positiveInteger(80),

  // Analytics (Cloudflare Web Analytics, set in Production only)
  NEXT_PUBLIC_CF_ANALYTICS_TOKEN: optionalString,
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(env: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  return result.data;
}
