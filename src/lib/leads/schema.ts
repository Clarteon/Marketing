import { z } from "zod";
import { teamSizes } from "./constants";

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const singleLineString = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[^\r\n]+$/, "Remove line breaks from this field.");

const emailField = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
);

export const leadInputSchema = z.object({
  name: singleLineString(120),
  email: emailField,
  company: optionalTrimmedString(200),
  need: z.string().trim().min(10).max(2_000),
  teamSize: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.enum(teamSizes).optional(),
  ),
  consent: z.literal(true),
  turnstileToken: z.string().trim().min(1).max(4_096),
  requestId: z.uuid(),
  startedAt: z.number().int().positive(),
  // A real visitor leaves this hidden field empty. Bots often fill it in.
  website: z.string().max(0).optional(),
});

export type LeadInput = z.infer<typeof leadInputSchema>;
