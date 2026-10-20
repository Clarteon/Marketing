import { z } from "zod";
import type { ContentPage } from "./content";

export const actionSchema = z.object({
  label: z.string().trim().min(1),
  href: z.string().trim().min(1),
  variant: z.enum(["primary", "secondary", "text"]).default("primary"),
});

export type PageAction = z.infer<typeof actionSchema>;

export const heroSchema = z.object({
  eyebrow: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  intro: z.string().trim().min(1),
  actions: z.array(actionSchema).default([]),
});

export type HeroData = z.infer<typeof heroSchema>;

export const problemSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  solution: z.string().trim().min(1),
  href: z.string().trim().min(1).optional(),
});

export type ProblemData = z.infer<typeof problemSchema>;

export const stepSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
});

export type StepData = z.infer<typeof stepSchema>;

export const homeSchema = z.object({
  hero: heroSchema,
  problems: z.array(problemSchema).length(4),
  steps: z.array(stepSchema).length(4),
  proof: z.object({
    title: z.string().trim().min(1),
    body: z.string().trim().min(1),
    linkLabel: z.string().trim().min(1),
    href: z.string().trim().min(1),
  }),
});

export type HomeData = z.infer<typeof homeSchema>;

export const solutionsSchema = z.object({
  hero: heroSchema,
  themes: z
    .array(
      z.object({
        id: z
          .string()
          .trim()
          .regex(/^[a-z0-9-]+$/),
        title: z.string().trim().min(1),
        intro: z.string().trim().min(1),
        problems: z.array(problemSchema).min(1),
      }),
    )
    .min(1),
});

export type SolutionsData = z.infer<typeof solutionsSchema>;

export const howWeWorkSchema = z.object({
  hero: heroSchema,
  steps: z.array(stepSchema).length(4),
  call: z.object({
    title: z.string().trim().min(1),
    intro: z.string().trim().min(1),
    points: z.array(z.string().trim().min(1)).min(1),
  }),
});

export type HowWeWorkData = z.infer<typeof howWeWorkSchema>;

export const listPageSchema = z.object({
  hero: heroSchema,
  empty: z.object({
    title: z.string().trim().min(1),
    body: z.string().trim().min(1),
  }),
});

export type ListPageData = z.infer<typeof listPageSchema>;

export const simplePageSchema = z.object({
  hero: heroSchema,
});

export type SimplePageData = z.infer<typeof simplePageSchema>;

export const contactSchema = z.object({
  hero: heroSchema,
  booking: z.object({
    title: z.string().trim().min(1),
    body: z.string().trim().min(1),
  }),
  brief: z.object({
    title: z.string().trim().min(1),
    intro: z.string().trim().min(1),
  }),
  message: z.object({
    title: z.string().trim().min(1),
    body: z.string().trim().min(1),
  }),
});

export type ContactData = z.infer<typeof contactSchema>;

export function parsePageData<T>(schema: z.ZodType<T>, page: ContentPage): T {
  const result = schema.safeParse(page.frontMatter);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "front matter"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid page data in ${page.filePath}: ${issues}`);
  }

  return result.data;
}
