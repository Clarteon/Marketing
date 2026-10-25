#!/usr/bin/env node
/**
 * Point this clone at the committed git hooks in `.githooks`.
 *
 * Runs from the `prepare` script, so `npm install` (and `npm ci`) sets it up
 * for every contributor and coding agent without a separate step. Safe to run
 * again at any time: `npm run hooks:install`.
 *
 * Skips quietly when it cannot or should not act: CI, Vercel builds, installs
 * from a tarball, or a clone that already uses a different hooks path (for
 * example a husky setup someone chose deliberately).
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const HOOKS_PATH = ".githooks";

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function main() {
  if (process.env.CI === "true" || process.env.CI === "1") return;
  if (process.env.VERCEL === "1") return;

  const hooksDir = path.resolve(HOOKS_PATH);
  if (!existsSync(path.join(hooksDir, "pre-commit"))) return;

  try {
    git(["rev-parse", "--show-toplevel"]);
  } catch {
    // Not a git checkout (tarball install, Docker build, and so on).
    return;
  }

  let current = "";
  try {
    current = git(["config", "--get", "core.hooksPath"]);
  } catch {
    current = "";
  }

  if (current === HOOKS_PATH) return;

  if (current) {
    console.warn(
      `install-git-hooks: core.hooksPath is already set to "${current}", leaving it unchanged. ` +
        `Remove it and run "npm run hooks:install" to use the repository hooks.`,
    );
    return;
  }

  git(["config", "core.hooksPath", HOOKS_PATH]);
  console.log(`install-git-hooks: git hooks enabled (core.hooksPath=${HOOKS_PATH}).`);
}

main();
