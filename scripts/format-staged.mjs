#!/usr/bin/env node
/**
 * Format the files staged for the next commit with the repository's Prettier
 * and re-stage the ones Prettier changed.
 *
 * Called by the pre-commit hook, both from `.githooks/` and from the copy that
 * `npm install` places in `.git/hooks/`. Prettier is resolved from the
 * repository root rather than from this file's directory, so the installed
 * copy works on branches that predate `.githooks/`.
 *
 * Files ignored by `.prettierignore` and files Prettier has no parser for are
 * left alone, so the hook never rewrites generated content or binaries.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MAX_REPORTED_FILES = 10;

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

const repoRoot = git(["rev-parse", "--show-toplevel"]).trim();
const requireFromRepo = createRequire(path.join(repoRoot, "package.json"));
const prettierModule = await import(pathToFileURL(requireFromRepo.resolve("prettier")).href);
const prettier = prettierModule.default ?? prettierModule;

const ignorePath = path.join(repoRoot, ".prettierignore");
const fileInfoOptions = existsSync(ignorePath) ? { ignorePath } : {};

function stagedFiles() {
  const output = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]);
  return output.split("\0").filter(Boolean);
}

async function isFormattable(file) {
  const info = await prettier.getFileInfo(file, fileInfoOptions);
  return !info.ignored && Boolean(info.inferredParser);
}

async function formatFile(file) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    // Deleted or unreadable between `git diff` and now: nothing to format.
    return false;
  }

  const options = (await prettier.resolveConfig(file)) ?? {};
  const formatted = await prettier.format(source, { ...options, filepath: file });

  if (formatted === source) return false;

  writeFileSync(file, formatted);
  return true;
}

async function main() {
  const files = stagedFiles();
  if (files.length === 0) return;

  const formattable = [];
  for (const file of files) {
    if (await isFormattable(file)) formattable.push(file);
  }
  if (formattable.length === 0) return;

  const changed = [];
  for (const file of formattable) {
    if (await formatFile(file)) changed.push(file);
  }
  if (changed.length === 0) return;

  git(["add", "--", ...changed]);

  const shown = changed.slice(0, MAX_REPORTED_FILES);
  const extra = changed.length - shown.length;
  console.log(`pre-commit: Prettier reformatted and re-staged ${changed.length} file(s):`);
  for (const file of shown) console.log(`  ${file}`);
  if (extra > 0) console.log(`  ...and ${extra} more`);
}

await main();
