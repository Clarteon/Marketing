import { z } from "zod";

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
