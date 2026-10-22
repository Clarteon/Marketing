import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { chunkContent } from "../src/lib/knowledge/chunk.ts";
import { loadPublishedContent } from "./lib/knowledge-content.mjs";

const root = process.cwd();
const contentRoot = join(root, "content");
const outputPath = join(root, "src", "lib", "knowledge", "generated", "index.json");

const files = await loadPublishedContent(contentRoot);
const chunks = files.flatMap((file) =>
  chunkContent({
    frontMatter: file.frontMatter,
    body: file.body,
  }),
);
chunks.sort((a, b) => a.id.localeCompare(b.id));

let generatedAt = new Date().toISOString();
try {
  const existing = JSON.parse(await readFile(outputPath, "utf8"));
  if (JSON.stringify(existing.chunks) === JSON.stringify(chunks) && existing.generatedAt) {
    generatedAt = existing.generatedAt;
  }
} catch {
  // The first build creates the file.
}

const index = { version: 1, generatedAt, chunks };
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");

console.log(
  `Knowledge index: ${files.length} published files, ${chunks.length} chunks, written to ${outputPath}`,
);
