import { z } from "zod";

const optionalSecret = z.string().trim().min(1).optional();

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Chat model
  GROQ_API_KEY: optionalSecret,
  LLM_MODEL_PRIMARY: z.string().trim().min(1).default("openai/gpt-oss-120b"),
  LLM_MODEL_FALLBACKS: z.string().trim().min(1).default("openai/gpt-oss-20b,qwen/qwen3.8-27b"),
  LLM_PROMPT_GUARD_MODEL: z.string().trim().min(1).optional(),

  // Google Calendar
  GOOGLE_CALENDAR_ID: z.string().trim().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
  GOOGLE_CLIENT_SECRET: optionalSecret,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.email().optional(),
  GOOGLE_PRIVATE_KEY: z.string().trim().min(1).optional(),

  // Email
  RESEND_API_KEY: optionalSecret,
  EMAIL_FROM: z.string().trim().min(3).optional(),
  EMAIL_REPLY_TO: z.email().optional(),
  TEAM_ALERT_EMAIL: z.email().optional(),

  // Sync and admin
  SYNC_SECRET: z.string().min(32).optional(),
  ADMIN_AUTH_SECRET: z.string().min(32).optional(),

  // Limits
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(20),
  CHAT_MAX_MESSAGES: z.coerce.number().int().positive().default(20),
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
