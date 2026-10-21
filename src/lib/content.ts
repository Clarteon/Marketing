import "server-only";

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

export const contentTypes = ["page", "case-study", "insight", "faq"] as const;
export type ContentType = (typeof contentTypes)[number];

const typeForDirectory: Record<string, ContentType> = {
  pages: "page",
  "case-studies": "case-study",
  insights: "insight",
  faqs: "faq",
};

const directoryForType: Record<ContentType, string> = {
  page: "pages",
  "case-study": "case-studies",
  insight: "insights",
  faq: "faqs",
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const frontMatterSchema = z
  .object({
    title: z.string().trim().min(1),
    slug: z
      .string()
      .trim()
      .regex(slugPattern, "Use lowercase letters, numbers and single hyphens."),
    type: z.enum(contentTypes),
    status: z.enum(["draft", "published"]),
    summary: z.string().trim().min(1),
    tags: z.array(z.string().trim().min(1)).default([]),
    synonyms: z.array(z.string().trim().min(1)).default([]),
    seoTitle: z.string().trim().min(1).optional(),
    seoDescription: z.string().trim().min(1).optional(),
    publishedAt: z.iso.date().optional(),
    updatedAt: z.iso.date().optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    const isArticle = data.type === "insight" || data.type === "case-study";
    if (isArticle && data.status === "published" && !data.publishedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Published insights and case studies need a publishedAt date (YYYY-MM-DD).",
      });
    }
  });

export type FrontMatter = z.infer<typeof frontMatterSchema>;

export interface ContentPage {
  frontMatter: FrontMatter;
  body: string;
  filePath: string;
}

const contentRoot = join(process.cwd(), "content");

function splitFrontMatter(raw: string, filePath: string): { data: unknown; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  if (!match) {
    throw new Error(`Missing front matter in ${filePath}`);
  }

  return { data: parse(match[1]), body: raw.slice(match[0].length) };
}

async function readPageFile(filePath: string, directory: string): Promise<ContentPage> {
  const raw = await readFile(filePath, "utf8");
  const { data, body } = splitFrontMatter(raw, filePath);
  const result = frontMatterSchema.safeParse(data);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "front matter"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid front matter in ${filePath}: ${issues}`);
  }

  const expectedType = typeForDirectory[directory];
  if (result.data.type !== expectedType) {
    throw new Error(
      `Front matter in ${filePath} has type "${result.data.type}", expected "${expectedType}".`,
    );
  }

  return { frontMatter: result.data, body, filePath };
}

/**
 * Read one published content file by slug. Returns null for a missing or draft
 * entry, so a draft never renders on the site.
 */
export async function getPage(
  slug: string,
  type: ContentType = "page",
): Promise<ContentPage | null> {
  if (!slugPattern.test(slug)) return null;

  const directory = directoryForType[type];
  const filePath = join(contentRoot, directory, `${slug}.md`);

  try {
    const page = await readPageFile(filePath, directory);
    return page.frontMatter.status === "published" ? page : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Read every published entry of one type, sorted by title. */
export async function getPublished(type: ContentType): Promise<ContentPage[]> {
  const directory = directoryForType[type];
  const directoryPath = join(contentRoot, directory);

  let entries;
  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const pages: ContentPage[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const page = await readPageFile(join(directoryPath, entry.name), directory);
    if (page.frontMatter.status === "published") pages.push(page);
  }

  return pages.sort((a, b) => a.frontMatter.title.localeCompare(b.frontMatter.title));
}
