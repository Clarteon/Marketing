import { z } from "zod";
import { isValidTimeZone } from "@/lib/booking/time";
import {
  CHAT_HISTORY_MAX_MESSAGES,
  CHAT_MESSAGE_MAX_CHARS,
  CHAT_TURNSTILE_ACTION,
} from "./constants";

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_CHARS),
});

export const chatRequestSchema = z.object({
  sessionId: z.uuid(),
  message: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_CHARS),
  history: z.array(historyMessageSchema).max(CHAT_HISTORY_MAX_MESSAGES).default([]),
  turnstileToken: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(4_096).optional(),
  ),
  timezone: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .max(100)
      .refine((value) => isValidTimeZone(value), "Use a valid timezone name.")
      .optional(),
  ),
  pageUrl: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .max(200)
      .regex(/^\/(?!\/)[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#]*$/, "Use a local page path.")
      .optional(),
  ),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatHistoryMessage = z.infer<typeof historyMessageSchema>;

const singleLineString = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[^\r\n]+$/, "Remove line breaks from this field.");

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const emailField = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
);

export const searchKnowledgeArgsSchema = z.object({
  query: z.string().trim().min(2).max(300),
});

export const saveLeadArgsSchema = z.object({
  name: singleLineString(120),
  email: emailField,
  company: optionalTrimmedString(200),
  problem_summary: optionalTrimmedString(2_000),
  team_size: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.enum(["1", "2-10", "11-50", "51-200", "200+", "not-sure"]).optional(),
  ),
  tools: optionalTrimmedString(300),
  urgency: optionalTrimmedString(200),
});

export const availabilityArgsSchema = z.object({
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine((value) => isValidTimeZone(value), "Use a valid timezone name."),
  from: optionalTrimmedString(40),
  to: optionalTrimmedString(40),
});

export const bookCallArgsSchema = z.object({
  slot_id: z
    .string()
    .trim()
    .min(1)
    .max(240)
    .regex(/^[A-Za-z0-9_-]+$/),
  name: singleLineString(120),
  email: emailField,
  notes: optionalTrimmedString(1_000),
});

export const solutionBriefArgsSchema = z.object({
  email: emailField,
  summary: z.string().trim().min(20).max(2_000),
});

export const handoffArgsSchema = z.object({
  reason: z.string().trim().min(3).max(1_000),
  contact: optionalTrimmedString(300),
});

export type SearchKnowledgeArgs = z.infer<typeof searchKnowledgeArgsSchema>;
export type SaveLeadArgs = z.infer<typeof saveLeadArgsSchema>;
export type AvailabilityArgs = z.infer<typeof availabilityArgsSchema>;
export type BookCallArgs = z.infer<typeof bookCallArgsSchema>;
export type SolutionBriefArgs = z.infer<typeof solutionBriefArgsSchema>;
export type HandoffArgs = z.infer<typeof handoffArgsSchema>;

export { CHAT_TURNSTILE_ACTION };
