import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

const typeForDirectory = {
  pages: "page",
  "case-studies": "case-study",
  insights: "insight",
  faqs: "faq",
};

function splitFrontMatter(raw, filePath) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  if (!match) throw new Error(`Missing front matter in ${filePath}`);
  return { data: parse(match[1]), body: raw.slice(match[0].length) };
}

async function listMarkdownFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listMarkdownFiles(path)));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

/**
 * Read every Markdown file under content/. Only published files are returned.
 * The site itself validates the full page schema; this loader checks the fields
 * the index needs and fails loudly when one is missing.
 */
export async function loadPublishedContent(contentRoot) {
  const files = await listMarkdownFiles(contentRoot);
  const published = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, "utf8");
    const { data, body } = splitFrontMatter(raw, filePath);
    const relative = filePath.slice(contentRoot.length + 1).split(/[\\/]/);
    const directory = relative[0];
    const expectedType = typeForDirectory[directory];

    if (!expectedType) {
      throw new Error(`Content file ${filePath} is not in a known content directory.`);
    }
    if (!data || typeof data !== "object") {
      throw new Error(`Front matter in ${filePath} is not an object.`);
    }
    if (data.type !== expectedType) {
      throw new Error(
        `Front matter in ${filePath} has type "${data.type}", expected "${expectedType}".`,
      );
    }
    if (data.status === "draft") continue;
    if (data.status !== "published") {
      throw new Error(`Front matter in ${filePath} has an invalid status.`);
    }
    for (const field of ["title", "slug", "summary"]) {
      if (typeof data[field] !== "string" || data[field].trim() === "") {
        throw new Error(`Front matter in ${filePath} is missing "${field}".`);
      }
    }

    published.push({ frontMatter: data, body, filePath });
  }

  return published.sort((a, b) => a.frontMatter.slug.localeCompare(b.frontMatter.slug));
}
