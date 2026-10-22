import type { KnowledgeChunk, KnowledgeContentType } from "./types";

/**
 * A content file as it reaches the chunker. The build script and the runtime
 * sync both use this shape, so there is only one chunking implementation.
 */
export interface ChunkSource {
  frontMatter: {
    title: string;
    slug: string;
    type: KnowledgeContentType;
    status: "draft" | "published";
    summary: string;
    tags?: string[];
    synonyms?: string[];
    url?: string;
    [key: string]: unknown;
  };
  body: string;
}

const MAX_CHUNK_CHARS = 1_200;
const META_KEYS = new Set([
  "title",
  "slug",
  "type",
  "status",
  "summary",
  "tags",
  "synonyms",
  "seoTitle",
  "seoDescription",
  "publishedAt",
  "updatedAt",
  "url",
]);

const HANDLED_KEYS = new Set([
  "hero",
  "problems",
  "steps",
  "proof",
  "themes",
  "call",
  "booking",
  "brief",
  "message",
  "empty",
]);

const LINK_KEYS = new Set(["href", "url", "id", "variant"]);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function clean(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function humanize(value: string): string {
  const spaced = value
    .replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : "Details";
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "section";
}

function pageUrl(frontMatter: ChunkSource["frontMatter"]): string {
  if (frontMatter.url?.startsWith("/")) return frontMatter.url;
  if (frontMatter.type === "page") {
    return frontMatter.slug === "home" ? "/" : `/${frontMatter.slug}`;
  }
  if (frontMatter.type === "insight") return `/insights/${frontMatter.slug}`;
  if (frontMatter.type === "case-study") return `/our-work/${frontMatter.slug}`;
  return "/contact#message";
}

function safeRelativeUrl(value: unknown, fallback: string): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}

function splitText(value: string): string[] {
  if (value.length <= MAX_CHUNK_CHARS) return [value];

  const sentences = value.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [value];
  const parts: string[] = [];
  let current = "";

  function pushCurrent() {
    const trimmed = current.trim();
    if (trimmed) parts.push(trimmed);
    current = "";
  }

  for (const sentence of sentences) {
    const next = `${current} ${sentence}`.trim();
    if (next.length <= MAX_CHUNK_CHARS) {
      current = next;
      continue;
    }

    pushCurrent();
    if (sentence.length <= MAX_CHUNK_CHARS) {
      current = sentence.trim();
      continue;
    }

    let rest = sentence.trim();
    while (rest.length > MAX_CHUNK_CHARS) {
      const window = rest.slice(0, MAX_CHUNK_CHARS);
      const cut = Math.max(window.lastIndexOf(" "), window.lastIndexOf("\n"));
      const end = cut > MAX_CHUNK_CHARS * 0.5 ? cut : MAX_CHUNK_CHARS;
      parts.push(rest.slice(0, end).trim());
      rest = rest.slice(end).trim();
    }
    current = rest;
  }

  pushCurrent();
  return parts.length > 0 ? parts : [value.slice(0, MAX_CHUNK_CHARS)];
}

function addChunk(
  chunks: KnowledgeChunk[],
  input: {
    idBase: string;
    url: string;
    title: string;
    headingPath: string[];
    text: string;
    tags: string[];
    synonyms: string[];
  },
) {
  const body = clean(input.text);
  if (!body) return;

  for (const [index, part] of splitText(body).entries()) {
    chunks.push({
      id: index === 0 ? input.idBase : `${input.idBase}-part-${index + 1}`,
      url: input.url,
      title: input.title,
      headingPath: input.headingPath,
      text: part,
      tags: input.tags,
      synonyms: input.synonyms,
    });
  }
}

function collectStrings(value: unknown, key?: string): string[] {
  if (key && LINK_KEYS.has(key)) return [];
  if (typeof value === "string") {
    return value.startsWith("/") || /^https?:\/\//.test(value) ? [] : [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStrings(item));
  }
  const record = asRecord(value);
  if (!record) return [];
  return Object.entries(record).flatMap(([childKey, child]) => collectStrings(child, childKey));
}

function extractBodySections(body: string): Array<{ headingPath: string[]; text: string }> {
  const lines = body.split(/\r?\n/);
  const sections: Array<{ headingPath: string[]; text: string }> = [];
  const headings: Array<{ level: number; text: string }> = [];
  let current: string[] = [];

  function flush() {
    const value = current.join("\n").trim();
    if (value) {
      sections.push({
        headingPath: headings.map((heading) => heading.text),
        text: value,
      });
    }
    current = [];
  }

  for (const line of lines) {
    const heading = /^(#{1,4})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush();
      const level = heading[1].length;
      while (headings.length > 0 && headings[headings.length - 1].level >= level) {
        headings.pop();
      }
      headings.push({ level, text: clean(heading[2].replace(/[#*_`]/g, "")) });
      continue;
    }
    current.push(line);
  }

  flush();
  return sections;
}

function stripMarkdown(value: string): string {
  return clean(
    value
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^[>\-*+]\s+/gm, "")
      .replace(/^\d+[.)]\s+/gm, "")
      .replace(/[*_~]{1,3}/g, ""),
  );
}

/**
 * Turn one published content file into small, citable chunks. Metadata fields
 * stay out of the body, and every chunk keeps the page URL and heading path.
 */
export function chunkContent(source: ChunkSource): KnowledgeChunk[] {
  const { frontMatter } = source;
  const chunks: KnowledgeChunk[] = [];
  const pageTitle = clean(frontMatter.title);
  const url = pageUrl(frontMatter);
  const tags = (frontMatter.tags ?? []).map(clean).filter(Boolean);
  const synonyms = (frontMatter.synonyms ?? []).map(clean).filter(Boolean);
  const baseTags = tags;
  const baseSynonyms = synonyms;

  function add(input: {
    id: string;
    url?: string;
    headingPath: string[];
    text: string;
    tags?: string[];
    synonyms?: string[];
  }) {
    addChunk(chunks, {
      idBase: `${frontMatter.slug}#${input.id}`,
      url: input.url ?? url,
      title:
        input.headingPath.length > 1 ? input.headingPath[input.headingPath.length - 1] : pageTitle,
      headingPath: [pageTitle, ...input.headingPath.slice(1)],
      text: input.text,
      tags: [...baseTags, ...(input.tags ?? [])],
      synonyms: [...baseSynonyms, ...(input.synonyms ?? [])],
    });
  }

  const hero = asRecord(frontMatter.hero);
  const actionLabels = asArray(hero?.actions)
    .map((action) => text(asRecord(action)?.label))
    .filter(Boolean);

  add({
    id: "overview",
    headingPath: [pageTitle],
    text: [
      clean(frontMatter.summary),
      clean(text(hero?.eyebrow)),
      clean(text(hero?.intro)),
      hero?.title && clean(text(hero.title)) !== pageTitle ? clean(text(hero.title)) : "",
      actionLabels.join(". "),
    ]
      .filter(Boolean)
      .join(" "),
  });

  const problems = asArray(frontMatter.problems);
  for (const [index, value] of problems.entries()) {
    const item = asRecord(value);
    if (!item) continue;
    const itemTitle = clean(text(item.title)) || `Problem ${index + 1}`;
    add({
      id: `problem-${index + 1}`,
      url: safeRelativeUrl(item.href, url),
      headingPath: [pageTitle, itemTitle],
      text: [
        clean(text(item.body)),
        text(item.solution) ? `Likely solution: ${clean(text(item.solution))}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  const steps = asArray(frontMatter.steps);
  for (const [index, value] of steps.entries()) {
    const item = asRecord(value);
    if (!item) continue;
    const itemTitle = clean(text(item.title)) || `Step ${index + 1}`;
    add({
      id: `step-${index + 1}`,
      headingPath: [pageTitle, "Process", itemTitle],
      text: clean(text(item.body)),
    });
  }

  const proof = asRecord(frontMatter.proof);
  if (proof) {
    add({
      id: "proof",
      headingPath: [pageTitle, clean(text(proof.title)) || "Our work"],
      text: [clean(text(proof.body)), clean(text(proof.linkLabel))].filter(Boolean).join(" "),
    });
  }

  const themes = asArray(frontMatter.themes);
  for (const [themeIndex, value] of themes.entries()) {
    const theme = asRecord(value);
    if (!theme) continue;
    const themeTitle = clean(text(theme.title)) || `Theme ${themeIndex + 1}`;
    const anchor =
      typeof theme.id === "string" && /^[a-z0-9-]+$/.test(theme.id) ? theme.id : undefined;
    const themeUrl = anchor ? `${url}#${anchor}` : url;

    add({
      id: `theme-${themeIndex + 1}`,
      url: themeUrl,
      headingPath: [pageTitle, themeTitle],
      text: clean(text(theme.intro)),
    });

    const themeProblems = asArray(theme.problems);
    for (const [problemIndex, problemValue] of themeProblems.entries()) {
      const problem = asRecord(problemValue);
      if (!problem) continue;
      const problemTitle = clean(text(problem.title)) || `Problem ${problemIndex + 1}`;
      add({
        id: `theme-${themeIndex + 1}-problem-${problemIndex + 1}`,
        url: safeRelativeUrl(problem.href, themeUrl),
        headingPath: [pageTitle, themeTitle, problemTitle],
        text: [
          clean(text(problem.body)),
          text(problem.solution) ? `Likely solution: ${clean(text(problem.solution))}` : "",
        ]
          .filter(Boolean)
          .join(" "),
      });
    }
  }

  const call = asRecord(frontMatter.call);
  if (call) {
    add({
      id: "call",
      headingPath: [pageTitle, clean(text(call.title)) || "What to expect"],
      text: [
        clean(text(call.intro)),
        asArray(call.points)
          .map((point) => clean(text(point)))
          .filter(Boolean)
          .join(" "),
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  for (const key of ["booking", "brief", "message", "empty"] as const) {
    const section = asRecord(frontMatter[key]);
    if (!section) continue;
    add({
      id: key,
      url: key === "empty" ? url : `${url}#${key === "booking" ? "book" : key}`,
      headingPath: [pageTitle, clean(text(section.title)) || humanize(key)],
      text: [clean(text(section.body)), clean(text(section.intro)), clean(text(section.email))]
        .filter(Boolean)
        .join(" "),
    });
  }

  for (const [key, value] of Object.entries(frontMatter)) {
    if (META_KEYS.has(key) || HANDLED_KEYS.has(key)) continue;
    const textValue = collectStrings(value, key).map(clean).filter(Boolean).join(" ");
    if (!textValue) continue;
    add({
      id: slugify(key),
      headingPath: [pageTitle, humanize(key)],
      text: textValue,
    });
  }

  for (const [index, section] of extractBodySections(source.body).entries()) {
    add({
      id: `${slugify(section.headingPath.at(-1) ?? "details")}-${index + 1}`,
      headingPath: [
        pageTitle,
        ...(section.headingPath.length > 0 ? section.headingPath : ["Details"]),
      ],
      text: stripMarkdown(section.text),
    });
  }

  return chunks;
}
