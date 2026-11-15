import "server-only";

import { neon } from "@neondatabase/serverless";
import { getConfig } from "@/lib/config";
import { getPage, getPublished, type ContentPage } from "@/lib/content";
import { logServerEvent } from "@/lib/log";
import type { AdminProjectPayload } from "./schema";
import type { AdminProjectRecord } from "./site-config-defaults";

export class ProjectStoreNotConfiguredError extends Error {
  constructor() {
    super("Project database storage is not configured.");
  }
}

export class ProjectConflictError extends Error {
  constructor() {
    super("A project with this slug already exists.");
  }
}

export class ProjectNotFoundError extends Error {
  constructor() {
    super("Project not found.");
  }
}

interface SiteProjectRow {
  slug: string;
  title: string;
  summary: string;
  client: string | null;
  category: string;
  category_label: string | null;
  solution_type: string | null;
  image: string | null;
  image_alt: string | null;
  secondary_image: string | null;
  secondary_image_alt: string | null;
  live_url: string | null;
  problem_brief: string | null;
  approach_brief: string | null;
  outcome_brief: string | null;
  highlights: unknown;
  tags: unknown;
  body: string;
  published_at: string | Date | null;
  sort_order: number;
  featured_on_home: boolean;
  status: string;
}

function getSql() {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) throw new ProjectStoreNotConfiguredError();
  return neon(DATABASE_URL);
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeCategory(value: string): AdminProjectRecord["category"] {
  if (value === "conversations" || value === "software" || value === "web") return value;
  return "operations";
}

function formatIsoDate(value: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
}

function mapDbRow(row: SiteProjectRow): AdminProjectRecord {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    client: row.client,
    category: normalizeCategory(row.category),
    categoryLabel: row.category_label,
    solution_type: row.solution_type,
    image: row.image,
    imageAlt: row.image_alt,
    secondaryImage: row.secondary_image,
    secondaryImageAlt: row.secondary_image_alt,
    liveUrl: row.live_url,
    problemBrief: row.problem_brief,
    approachBrief: row.approach_brief,
    outcomeBrief: row.outcome_brief,
    highlights: normalizeStringArray(row.highlights),
    tags: normalizeStringArray(row.tags),
    body: row.body ?? "",
    publishedAt: formatIsoDate(row.published_at),
    order: row.sort_order,
    featuredOnHome: row.featured_on_home,
    status: row.status === "draft" ? "draft" : "published",
  };
}

function mapMarkdownToProject(page: ContentPage, index: number): AdminProjectRecord {
  const fm = page.frontMatter;
  const order = fm.order ?? index + 1;
  return {
    slug: fm.slug,
    title: fm.title,
    summary: fm.summary,
    client: fm.client ?? null,
    category: fm.category ?? "operations",
    categoryLabel: fm.categoryLabel ?? null,
    solution_type: fm.solution_type ?? null,
    image: fm.image ?? null,
    imageAlt: fm.imageAlt ?? null,
    secondaryImage: fm.secondaryImage ?? null,
    secondaryImageAlt: fm.secondaryImageAlt ?? null,
    liveUrl: fm.liveUrl ?? null,
    problemBrief: fm.problemBrief ?? null,
    approachBrief: fm.approachBrief ?? null,
    outcomeBrief: fm.outcomeBrief ?? null,
    highlights: fm.highlights ?? [],
    tags: fm.tags ?? [],
    body: page.body.trim(),
    publishedAt: fm.publishedAt ?? "2026-10-20",
    order,
    featuredOnHome: order <= 3,
    status: fm.status,
  };
}

function mapRecordToContentPage(record: AdminProjectRecord): ContentPage {
  return {
    frontMatter: {
      title: record.title,
      slug: record.slug,
      type: "case-study",
      status: record.status,
      summary: record.summary,
      tags: record.tags,
      synonyms: [],
      publishedAt: record.publishedAt ?? "2026-10-20",
      order: record.order,
      category: record.category,
      ...(record.categoryLabel ? { categoryLabel: record.categoryLabel } : {}),
      ...(record.client ? { client: record.client } : {}),
      ...(record.solution_type ? { solution_type: record.solution_type } : {}),
      ...(record.image ? { image: record.image } : {}),
      ...(record.imageAlt ? { imageAlt: record.imageAlt } : {}),
      ...(record.secondaryImage ? { secondaryImage: record.secondaryImage } : {}),
      ...(record.secondaryImageAlt ? { secondaryImageAlt: record.secondaryImageAlt } : {}),
      ...(record.liveUrl ? { liveUrl: record.liveUrl } : {}),
      ...(record.problemBrief ? { problemBrief: record.problemBrief } : {}),
      ...(record.approachBrief ? { approachBrief: record.approachBrief } : {}),
      ...(record.outcomeBrief ? { outcomeBrief: record.outcomeBrief } : {}),
      ...(record.highlights.length > 0 ? { highlights: record.highlights } : {}),
    },
    body: record.body,
    filePath: `db://site_projects/${record.slug}`,
  };
}

export async function getSeedProjectsFromMarkdown(): Promise<AdminProjectRecord[]> {
  const studies = await getPublished("case-study");
  return studies.map((page, index) => mapMarkdownToProject(page, index));
}

async function seedProjectsInDb(
  sql: ReturnType<typeof neon<false, false>>,
): Promise<AdminProjectRecord[]> {
  const seeds = await getSeedProjectsFromMarkdown();
  for (const item of seeds) {
    await sql`
      INSERT INTO site_projects (
        slug, title, summary, client, category, category_label, solution_type,
        image, image_alt, secondary_image, secondary_image_alt, live_url,
        problem_brief, approach_brief, outcome_brief, highlights, tags, body,
        published_at, sort_order, featured_on_home, status
      )
      VALUES (
        ${item.slug}, ${item.title}, ${item.summary}, ${item.client}, ${item.category},
        ${item.categoryLabel}, ${item.solution_type}, ${item.image}, ${item.imageAlt},
        ${item.secondaryImage}, ${item.secondaryImageAlt}, ${item.liveUrl},
        ${item.problemBrief}, ${item.approachBrief}, ${item.outcomeBrief},
        ${JSON.stringify(item.highlights)}::jsonb, ${JSON.stringify(item.tags)}::jsonb,
        ${item.body}, ${item.publishedAt}, ${item.order}, ${item.featuredOnHome}, ${item.status}
      )
      ON CONFLICT (slug) DO NOTHING
    `;
  }
  return seeds;
}

export async function listAdminProjects(): Promise<{
  configured: boolean;
  schemaMissing?: boolean;
  projects: AdminProjectRecord[];
}> {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) {
    return {
      configured: false,
      projects: await getSeedProjectsFromMarkdown(),
    };
  }

  try {
    const sql = neon(DATABASE_URL);
    const rows = (await sql`
      SELECT
        slug, title, summary, client, category, category_label, solution_type,
        image, image_alt, secondary_image, secondary_image_alt, live_url,
        problem_brief, approach_brief, outcome_brief, highlights, tags, body,
        published_at, sort_order, featured_on_home, status
      FROM site_projects
      ORDER BY sort_order ASC, title ASC
    `) as SiteProjectRow[];

    if (rows.length === 0) {
      const seeded = await seedProjectsInDb(sql);
      return { configured: true, projects: seeded };
    }

    return { configured: true, projects: rows.map(mapDbRow) };
  } catch (error) {
    logServerEvent("admin_projects_list_failed", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return {
      configured: true,
      schemaMissing: true,
      projects: await getSeedProjectsFromMarkdown(),
    };
  }
}

export async function createAdminProject(input: AdminProjectPayload): Promise<AdminProjectRecord> {
  const sql = getSql();
  const countRows = (await sql`SELECT COUNT(*)::int AS total FROM site_projects`) as {
    total: number;
  }[];
  if ((countRows[0]?.total ?? 0) === 0) {
    await seedProjectsInDb(sql);
  }

  const publishedAt = input.publishedAt ?? new Date().toISOString().slice(0, 10);

  try {
    const rows = (await sql`
      INSERT INTO site_projects (
        slug, title, summary, client, category, category_label, solution_type,
        image, image_alt, secondary_image, secondary_image_alt, live_url,
        problem_brief, approach_brief, outcome_brief, highlights, tags, body,
        published_at, sort_order, featured_on_home, status
      )
      VALUES (
        ${input.slug}, ${input.title}, ${input.summary}, ${input.client}, ${input.category},
        ${input.categoryLabel}, ${input.solution_type}, ${input.image}, ${input.imageAlt},
        ${input.secondaryImage}, ${input.secondaryImageAlt}, ${input.liveUrl},
        ${input.problemBrief}, ${input.approachBrief}, ${input.outcomeBrief},
        ${JSON.stringify(input.highlights)}::jsonb, ${JSON.stringify(input.tags)}::jsonb,
        ${input.body}, ${publishedAt}, ${input.order}, ${input.featuredOnHome}, ${input.status}
      )
      RETURNING
        slug, title, summary, client, category, category_label, solution_type,
        image, image_alt, secondary_image, secondary_image_alt, live_url,
        problem_brief, approach_brief, outcome_brief, highlights, tags, body,
        published_at, sort_order, featured_on_home, status
    `) as SiteProjectRow[];
    return mapDbRow(rows[0]);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") throw new ProjectConflictError();
    throw error;
  }
}

export async function updateAdminProject(
  slug: string,
  input: AdminProjectPayload,
): Promise<AdminProjectRecord> {
  const sql = getSql();
  const countRows = (await sql`SELECT COUNT(*)::int AS total FROM site_projects`) as {
    total: number;
  }[];
  if ((countRows[0]?.total ?? 0) === 0) {
    await seedProjectsInDb(sql);
  }

  const publishedAt = input.publishedAt ?? new Date().toISOString().slice(0, 10);

  const rows = (await sql`
    UPDATE site_projects
    SET
      title = ${input.title},
      summary = ${input.summary},
      client = ${input.client},
      category = ${input.category},
      category_label = ${input.categoryLabel},
      solution_type = ${input.solution_type},
      image = ${input.image},
      image_alt = ${input.imageAlt},
      secondary_image = ${input.secondaryImage},
      secondary_image_alt = ${input.secondaryImageAlt},
      live_url = ${input.liveUrl},
      problem_brief = ${input.problemBrief},
      approach_brief = ${input.approachBrief},
      outcome_brief = ${input.outcomeBrief},
      highlights = ${JSON.stringify(input.highlights)}::jsonb,
      tags = ${JSON.stringify(input.tags)}::jsonb,
      body = ${input.body},
      published_at = ${publishedAt},
      sort_order = ${input.order},
      featured_on_home = ${input.featuredOnHome},
      status = ${input.status},
      updated_at = now()
    WHERE slug = ${slug}
    RETURNING
      slug, title, summary, client, category, category_label, solution_type,
      image, image_alt, secondary_image, secondary_image_alt, live_url,
      problem_brief, approach_brief, outcome_brief, highlights, tags, body,
      published_at, sort_order, featured_on_home, status
  `) as SiteProjectRow[];

  if (!rows[0]) throw new ProjectNotFoundError();
  return mapDbRow(rows[0]);
}

export async function deleteAdminProject(slug: string): Promise<void> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM site_projects
    WHERE slug = ${slug}
    RETURNING slug
  `) as { slug: string }[];
  if (!rows[0]) throw new ProjectNotFoundError();
}

export async function listPublicProjects(): Promise<ContentPage[]> {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) return getPublished("case-study");

  try {
    const sql = neon(DATABASE_URL);
    const totalRows = (await sql`SELECT COUNT(*)::int AS total FROM site_projects`) as {
      total: number;
    }[];
    if ((totalRows[0]?.total ?? 0) === 0) {
      return getPublished("case-study");
    }

    const rows = (await sql`
      SELECT
        slug, title, summary, client, category, category_label, solution_type,
        image, image_alt, secondary_image, secondary_image_alt, live_url,
        problem_brief, approach_brief, outcome_brief, highlights, tags, body,
        published_at, sort_order, featured_on_home, status
      FROM site_projects
      WHERE status = 'published'
      ORDER BY sort_order ASC, title ASC
    `) as SiteProjectRow[];

    return rows.map((row) => mapRecordToContentPage(mapDbRow(row)));
  } catch (error) {
    logServerEvent("public_projects_fallback", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return getPublished("case-study");
  }
}

export async function getPublicProjectBySlug(slug: string): Promise<ContentPage | null> {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) return getPage(slug, "case-study");

  try {
    const sql = neon(DATABASE_URL);
    const totalRows = (await sql`SELECT COUNT(*)::int AS total FROM site_projects`) as {
      total: number;
    }[];
    if ((totalRows[0]?.total ?? 0) === 0) {
      return getPage(slug, "case-study");
    }

    const rows = (await sql`
      SELECT
        slug, title, summary, client, category, category_label, solution_type,
        image, image_alt, secondary_image, secondary_image_alt, live_url,
        problem_brief, approach_brief, outcome_brief, highlights, tags, body,
        published_at, sort_order, featured_on_home, status
      FROM site_projects
      WHERE slug = ${slug} AND status = 'published'
      LIMIT 1
    `) as SiteProjectRow[];

    return rows[0] ? mapRecordToContentPage(mapDbRow(rows[0])) : null;
  } catch (error) {
    logServerEvent("public_project_lookup_fallback", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return getPage(slug, "case-study");
  }
}

export interface FeaturedHomeProject {
  number: string;
  slug: string;
  category: string;
  title: string;
  problem: string;
  outcome: string;
}

export async function listFeaturedHomeProjects(): Promise<FeaturedHomeProject[] | null> {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) return null;

  try {
    const sql = neon(DATABASE_URL);
    const totalRows = (await sql`SELECT COUNT(*)::int AS total FROM site_projects`) as {
      total: number;
    }[];
    if ((totalRows[0]?.total ?? 0) === 0) return null;

    const rows = (await sql`
      SELECT
        slug, title, summary, client, category, category_label, solution_type,
        image, image_alt, secondary_image, secondary_image_alt, live_url,
        problem_brief, approach_brief, outcome_brief, highlights, tags, body,
        published_at, sort_order, featured_on_home, status
      FROM site_projects
      WHERE status = 'published' AND featured_on_home = true
      ORDER BY sort_order ASC, title ASC
      LIMIT 4
    `) as SiteProjectRow[];

    return rows.map((row, index) => ({
      number: String(index + 1).padStart(2, "0"),
      slug: row.slug,
      category: row.category_label ?? row.solution_type ?? "Case study",
      title: row.title,
      problem: row.problem_brief ?? row.summary,
      outcome: row.outcome_brief ?? row.approach_brief ?? row.summary,
    }));
  } catch {
    return null;
  }
}
