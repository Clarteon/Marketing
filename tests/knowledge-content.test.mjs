import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPublishedContent } from "../scripts/lib/knowledge-content.mjs";

const contentRoot = join(process.cwd(), "content");
const generatedPath = join(process.cwd(), "src", "lib", "knowledge", "generated", "index.json");

describe("knowledge content loader", () => {
  it("loads only published files and ignores drafts", async () => {
    const files = await loadPublishedContent(contentRoot);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((file) => file.frontMatter.status === "published")).toBe(true);
    expect(files.some((file) => file.frontMatter.slug === "terms")).toBe(true);

    const sandbox = await mkdtemp(join(tmpdir(), "clarteon-knowledge-"));
    try {
      await mkdir(join(sandbox, "pages"), { recursive: true });
      await writeFile(
        join(sandbox, "pages", "published-sample.md"),
        [
          "---",
          'title: "Published Sample"',
          "slug: published-sample",
          "type: page",
          "status: published",
          'summary: "Published entry."',
          "tags: []",
          "synonyms: []",
          "---",
          "Visible content.",
        ].join("\n"),
      );
      await writeFile(
        join(sandbox, "pages", "draft-sample.md"),
        [
          "---",
          'title: "Draft Sample"',
          "slug: draft-sample",
          "type: page",
          "status: draft",
          'summary: "Draft entry."',
          "tags: []",
          "synonyms: []",
          "---",
          "Hidden draft content.",
        ].join("\n"),
      );

      const filtered = await loadPublishedContent(sandbox);
      expect(filtered.map((entry) => entry.frontMatter.slug)).toEqual(["published-sample"]);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  it("builds non-empty chunks with the fields the search layer needs", async () => {
    const index = JSON.parse(await readFile(generatedPath, "utf8"));
    expect(index.version).toBe(1);
    expect(index.chunks.length).toBeGreaterThan(0);

    for (const chunk of index.chunks) {
      expect(chunk.id).toBeTruthy();
      expect(chunk.url.startsWith("/")).toBe(true);
      expect(chunk.title).toBeTruthy();
      expect(chunk.headingPath.length).toBeGreaterThan(0);
      expect(chunk.text.length).toBeGreaterThan(0);
      expect(chunk.text.length).toBeLessThanOrEqual(1_200);
      expect(Array.isArray(chunk.tags)).toBe(true);
      expect(Array.isArray(chunk.synonyms)).toBe(true);
    }
  });
});
