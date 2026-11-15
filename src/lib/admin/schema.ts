import { z } from "zod";
import { isValidTimeZone } from "@/lib/booking/time";
import { leadStatuses, teamSizes } from "@/lib/leads/constants";

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
  status: z.enum(["all", "new", "contacted", "booked", "closed"]).default("all"),
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

export const adminLeadUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[^\r\n]+$/, "Keep the name on one line.")
      .optional(),
    email: adminEmailField.optional(),
    company: z.string().trim().max(200).nullable().optional(),
    need: z.string().trim().min(10).max(2_000).optional(),
    teamSize: z.enum(teamSizes).nullable().optional(),
    status: z.enum(leadStatuses).optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "Send at least one field to update.",
  );

export type AdminLeadUpdate = z.output<typeof adminLeadUpdateSchema>;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const safeAssetLocationSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (!value) return true;
    if (/^\/[A-Za-z0-9._/-]+$/.test(value)) return !value.includes("..");
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Use a relative /images/... path or an https:// URL.");

export const safeExternalHttpUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }, "Use an http:// or https:// URL.");

export const adminProjectSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(slugPattern, "Use lowercase letters, numbers, and hyphens."),
  title: z
    .string()
    .trim()
    .min(3)
    .max(180)
    .regex(/^[^\r\n]+$/, "Keep title on one line."),
  summary: z.string().trim().min(10).max(500),
  client: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .transform((v) => v || null),
  category: z.enum(["operations", "conversations", "software", "web"]).default("operations"),
  categoryLabel: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .transform((v) => v || null),
  solution_type: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .transform((v) => v || null),
  image: safeAssetLocationSchema
    .nullable()
    .optional()
    .transform((v) => v || null),
  imageAlt: z
    .string()
    .trim()
    .max(240)
    .nullable()
    .optional()
    .transform((v) => v || null),
  secondaryImage: safeAssetLocationSchema
    .nullable()
    .optional()
    .transform((v) => v || null),
  secondaryImageAlt: z
    .string()
    .trim()
    .max(240)
    .nullable()
    .optional()
    .transform((v) => v || null),
  liveUrl: safeExternalHttpUrlSchema
    .nullable()
    .optional()
    .transform((v) => v || null),
  problemBrief: z
    .string()
    .trim()
    .max(600)
    .nullable()
    .optional()
    .transform((v) => v || null),
  approachBrief: z
    .string()
    .trim()
    .max(600)
    .nullable()
    .optional()
    .transform((v) => v || null),
  outcomeBrief: z
    .string()
    .trim()
    .max(600)
    .nullable()
    .optional()
    .transform((v) => v || null),
  highlights: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  tags: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  body: z.string().trim().max(16_000).default(""),
  publishedAt: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => v || null)
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use YYYY-MM-DD format."),
  order: z.coerce.number().int().min(1).max(999).default(99),
  featuredOnHome: z.boolean().default(false),
  status: z.enum(["draft", "published"]).default("published"),
});

export type AdminProjectPayload = z.output<typeof adminProjectSchema>;

const heroOverrideSchema = z.object({
  title: z.string().trim().max(180).optional(),
  intro: z.string().trim().max(500).optional(),
});

export const adminSiteConfigSchema = z.object({
  sections: z.object({
    showHomeProblems: z.boolean(),
    homeProblemsTitle: z.string().trim().min(1).max(160),
    showHomeFlow: z.boolean(),
    showHomeProcess: z.boolean(),
    showHomeFeaturedWork: z.boolean(),
    homeFeaturedWorkTitle: z.string().trim().min(1).max(160),
    showHomeClara: z.boolean(),
    showAboutOrgChart: z.boolean(),
    aboutOrgTitle: z.string().trim().min(1).max(160),
    showBookingSection: z.boolean(),
  }),
  pageHeroes: z
    .object({
      home: heroOverrideSchema.optional(),
      solutions: heroOverrideSchema.optional(),
      "how-we-work": heroOverrideSchema.optional(),
      "our-work": heroOverrideSchema.optional(),
      insights: heroOverrideSchema.optional(),
      about: heroOverrideSchema.optional(),
      contact: heroOverrideSchema.optional(),
      privacy: heroOverrideSchema.optional(),
      terms: heroOverrideSchema.optional(),
    })
    .default({}),
  media: z.object({
    serviceWorkflow: safeAssetLocationSchema,
    serviceDiscovery: safeAssetLocationSchema,
    serviceApiCode: safeAssetLocationSchema,
    serviceSoftwareBuild: safeAssetLocationSchema,
    aboutClarity: safeAssetLocationSchema,
    insightsNotes: safeAssetLocationSchema,
    teamPhotos: z.record(z.string().trim().min(1).max(80), safeAssetLocationSchema).default({}),
  }),
});

export type AdminSiteConfigPayload = z.output<typeof adminSiteConfigSchema>;
