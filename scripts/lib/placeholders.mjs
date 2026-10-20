import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const SCAN_DIRS = ["src", "content"];
const CHECK_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".md", ".mdx", ".css"]);

// Matches [ALL CAPS] style placeholders, but not Markdown links like [Privacy](#).
const PLACEHOLDER_PATTERN = /\[[A-Z][A-Z0-9 _/&.,'’-]*\]/g;

export function findPlaceholdersInText(text) {
  const found = [];

  text.split(/\r?\n/).forEach((line, index) => {
    for (const match of line.matchAll(PLACEHOLDER_PATTERN)) {
      found.push({ line: index + 1, match: match[0] });
    }
  });

  return found;
}

export function isPublishedMarkdown(text) {
  const frontMatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontMatter) return false;
  return /^status:\s*published\s*$/m.test(frontMatter[1]);
}

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile() && CHECK_EXTENSIONS.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function checkPlaceholders(root = process.cwd()) {
  const findings = [];

  for (const dir of SCAN_DIRS) {
    const files = await walk(join(root, dir));

    for (const file of files) {
      const relativePath = relative(root, file).replaceAll("\\", "/");
      const extension = extname(file);
      const text = await readFile(file, "utf8");

      if (dir === "content" && (extension === ".md" || extension === ".mdx")) {
        if (!isPublishedMarkdown(text)) continue;
      }

      for (const finding of findPlaceholdersInText(text)) {
        findings.push({ file: relativePath, ...finding });
      }
    }
  }

  return findings;
}
