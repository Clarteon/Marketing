import { describe, expect, it } from "vitest";
import { chunkContent, type ChunkSource } from "@/lib/knowledge/chunk";

function source(overrides: Partial<ChunkSource["frontMatter"]> = {}): ChunkSource {
  return {
    frontMatter: {
      title: "Start with the problem.",
      slug: "solutions",
      type: "page",
      status: "published",
      summary: "Problems grouped by theme.",
      tags: ["solutions", "automation"],
      synonyms: ["services", "what we do"],
      seoTitle: "SEO title that must not be indexed",
      seoDescription: "SEO description that must not be indexed",
      hero: {
        eyebrow: "Solutions",
        title: "Start with the problem.",
        intro: "Find the problem that sounds familiar.",
        actions: [{ label: "Book a free discovery call", href: "/contact#book" }],
      },
      themes: [
        {
          id: "operations",
          title: "Manual work and operations",
          intro: "The work that repeats is often the work that can be automated.",
          problems: [
            {
              title: "Repeated data entry",
              body: "Information is copied from one tool to another.",
              solution: "Workflow automation",
              href: "/contact#book",
            },
          ],
        },
      ],
      booking: {
        title: "Book a free discovery call",
        body: "Choose a time that works for you.",
      },
      ...overrides,
    },
    body: "## Why this matters\n\nMost projects start with a repeated problem.\n\n### Details\n\nA clear recommendation follows.",
  };
}

describe("chunkContent", () => {
  it("keeps the page title, summary, hero and actions in the overview", () => {
    const chunks = chunkContent(source());
    const overview = chunks.find((chunk) => chunk.id === "solutions#overview");

    expect(overview).toBeDefined();
    expect(overview?.headingPath).toEqual(["Start with the problem."]);
    expect(overview?.url).toBe("/solutions");
    expect(overview?.text).toContain("Problems grouped by theme.");
    expect(overview?.text).toContain("Find the problem that sounds familiar.");
    expect(overview?.text).toContain("Book a free discovery call");
    expect(overview?.tags).toContain("automation");
    expect(overview?.synonyms).toContain("services");
  });

  it("turns each problem into a citable chunk with its likely solution", () => {
    const chunks = chunkContent(source());
    const problem = chunks.find((chunk) => chunk.id.includes("problem-1"));

    expect(problem?.title).toBe("Repeated data entry");
    expect(problem?.url).toBe("/contact#book");
    expect(problem?.headingPath).toEqual([
      "Start with the problem.",
      "Manual work and operations",
      "Repeated data entry",
    ]);
    expect(problem?.text).toContain("Information is copied");
    expect(problem?.text).toContain("Likely solution: Workflow automation");
  });

  it("links a theme chunk to the page anchor when a problem has no link", () => {
    const input = source({
      themes: [
        {
          id: "operations",
          title: "Manual work and operations",
          intro: "The work that repeats can be automated.",
          problems: [
            {
              title: "Repeated data entry",
              body: "Information is copied from one tool to another.",
              solution: "Workflow automation",
            },
          ],
        },
      ],
    });

    const problem = chunkContent(input).find((chunk) => chunk.id.includes("problem-1"));
    expect(problem?.url).toBe("/solutions#operations");
  });

  it("splits Markdown body sections by heading and removes markup", () => {
    const chunks = chunkContent(source());
    const details = chunks.find((chunk) => chunk.text.includes("A clear recommendation follows."));

    expect(details?.headingPath).toEqual([
      "Start with the problem.",
      "Why this matters",
      "Details",
    ]);
    expect(details?.text).not.toContain("###");
    expect(details?.text).not.toContain("/contact");
  });

  it("does not index SEO metadata or URLs", () => {
    const text = chunkContent(source())
      .map((chunk) => chunk.text)
      .join(" ");

    expect(text).not.toContain("SEO title");
    expect(text).not.toContain("SEO description");
    expect(text).not.toContain("/contact#book");
  });

  it("keeps every chunk within the size cap", () => {
    const long = "A sentence with enough words to matter. ".repeat(200);
    const chunks = chunkContent(
      source({
        hero: {
          eyebrow: "Solutions",
          title: "Start with the problem.",
          intro: long,
          actions: [],
        },
      }),
    );

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(1_200);
    }
  });

  it("uses the FAQ fallback URL when a FAQ has no explicit link", () => {
    const chunks = chunkContent({
      frontMatter: {
        title: "Do you build websites?",
        slug: "do-you-build-websites",
        type: "faq",
        status: "published",
        summary: "A short answer.",
        tags: ["websites"],
        synonyms: ["web"],
      },
      body: "## Answer\n\nYes, when the problem calls for one.",
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((chunk) => chunk.url === "/contact#message")).toBe(true);
  });
});
