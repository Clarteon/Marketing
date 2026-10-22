import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPublishedContent } from "../scripts/lib/knowledge-content.mjs";

const contentRoot = join(process.cwd(), "content");
const generatedPath = join(process.cwd(), "src", "lib", "knowledge", "generated", "index.json");

describe("knowledge content loader", () => {
  it("loads only published files", async () => {
    const files = await loadPublishedContent(contentRoot);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((file) => file.frontMatter.status === "published")).toBe(true);
    expect(files.some((file) => file.frontMatter.slug === "terms")).toBe(false);
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
      expect(chunk.id.startsWith("terms#")).toBe(false);
    }
  });
});
