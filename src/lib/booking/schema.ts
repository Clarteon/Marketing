import { z } from "zod";
import { isValidTimeZone } from "./time";

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

export const bookingInputSchema = z.object({
  name: singleLineString(120),
  email: emailField,
  notes: optionalTrimmedString(1_000),
  timezone: z.string().trim().min(1).max(100).refine(isValidTimeZone, "Use a valid timezone name."),
  slotId: z
    .string()
    .trim()
    .min(1)
    .max(240)
    .regex(/^[A-Za-z0-9_-]+$/),
  consent: z.literal(true),
  turnstileToken: z.string().trim().min(1).max(4_096),
  requestId: z.uuid(),
  startedAt: z.number().int().positive(),
  // A real visitor leaves this hidden field empty.
  website: z.string().max(0).optional(),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

export const availabilityQuerySchema = z.object({
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(isValidTimeZone, "Use a valid timezone name.")
    .optional(),
});
