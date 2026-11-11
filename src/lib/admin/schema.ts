import { z } from "zod";
import { isValidTimeZone } from "@/lib/booking/time";

export const adminLoginSchema = z.object({
  password: z.string().min(1).max(200),
});

const tagList = z
  .string()
  .trim()
  .max(400)
  .optional()
  .transform((value) =>
    (value ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8),
  );

const sourceUrl = z
  .string()
  .trim()
  .max(200)
  .regex(/^\/[A-Za-z0-9#/_?=&.%-]*$/, "Use a path on this site, starting with /.")
  .default("/contact#message");

export const adminReviewSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    questionId: z.uuid(),
    title: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .regex(/^[^\r\n]+$/, "Keep the title on one line."),
    answer: z.string().trim().min(10).max(2_000),
    tags: tagList,
    synonyms: tagList,
    sourceUrl,
  }),
  z.object({
    action: z.literal("reject"),
    questionId: z.uuid(),
  }),
]);

export const bookingsListSchema = z.object({
  status: z.enum(["all", "pending", "confirmed", "cancelled"]).default("all"),
  timing: z.enum(["all", "upcoming", "past"]).default("all"),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
});

export type BookingsListQuery = z.output<typeof bookingsListSchema>;

export const leadsListSchema = z.object({
  source: z.enum(["all", "website-form", "clara-chat"]).default("all"),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
});

export type LeadsListQuery = z.output<typeof leadsListSchema>;

const adminEmailField = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
);

export const adminBookingUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[^\r\n]+$/, "Keep the name on one line.")
      .optional(),
    email: adminEmailField.optional(),
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(isValidTimeZone, "Use a valid timezone name.")
      .optional(),
    notes: z.string().trim().max(1_000).nullable().optional(),
    slotId: z
      .string()
      .trim()
      .min(1)
      .max(240)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    cancel: z.literal(true).optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "Send at least one field to update.",
  )
  .refine((value) => {
    const hasDetails = [value.name, value.email, value.timezone, value.notes].some(
      (field) => field !== undefined,
    );
    return value.slotId === undefined || !hasDetails;
  }, "Send guest details or a new slot, not both.")
  .refine((value) => {
    const hasDetails = [value.name, value.email, value.timezone, value.notes].some(
      (field) => field !== undefined,
    );
    return value.cancel === undefined || (value.slotId === undefined && !hasDetails);
  }, "Send a cancellation on its own.");

export type AdminBookingUpdate = z.output<typeof adminBookingUpdateSchema>;
