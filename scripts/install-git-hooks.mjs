#!/usr/bin/env node
/**
 * Install the repository's git hooks into this clone.
 *
 * Runs from the `prepare` script, so `npm install` (and `npm ci`) sets it up
 * for every contributor and coding agent without a separate step. Safe to run
 * again at any time: `npm run hooks:install`.
 *
 * The hooks are copied from `.githooks/` into `.git/hooks/` instead of being
 * pointed at with `core.hooksPath`. A tracked folder disappears from the
 * working tree whenever someone checks out a branch created before it existed,
 * which silently disabled the guardrails. A copy in `.git/hooks/` survives
 * every branch switch, worktree and rebase.
 *
 * Skips quietly when it cannot or should not act: CI, Vercel builds, installs
 * from a tarball, or a clone that already uses a different hooks path (for
 * example a husky setup someone chose deliberately).
 */

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const MARKER = "Managed by Clarteon scripts/install-git-hooks.mjs";
const HOOK_NAMES = ["pre-commit", "pre-push"];
const LEGACY_HOOKS_PATH = ".githooks";

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function tryGit(args) {
  try {
    return git(args);
  } catch {
    return "";
  }
}

function isOurs(file) {
  try {
    return readFileSync(file, "utf8").includes(MARKER);
  } catch {
    return false;
  }
}

function installHooks(repoRoot, hooksDir) {
  mkdirSync(hooksDir, { recursive: true });

  for (const name of HOOK_NAMES) {
    const source = path.join(repoRoot, LEGACY_HOOKS_PATH, name);
    if (!existsSync(source)) continue;

    const target = path.join(hooksDir, name);
    if (existsSync(target) && !isOurs(target)) {
      console.warn(
        `install-git-hooks: ${target} was created by something else, leaving it unchanged.`,
      );
      continue;
    }

    copyFileSync(source, target);
    chmodSync(target, 0o755);
  }

  // The installed pre-commit hook uses this copy when the checked-out branch
  // predates scripts/format-staged.mjs.
  const formatter = path.join(repoRoot, "scripts", "format-staged.mjs");
  if (existsSync(formatter)) {
    const target = path.join(hooksDir, "format-staged.mjs");
    writeFileSync(target, readFileSync(formatter));
    chmodSync(target, 0o644);
  }
}

function main() {
  if (process.env.CI === "true" || process.env.CI === "1") return;
  if (process.env.VERCEL === "1") return;

  const repoRoot = tryGit(["rev-parse", "--show-toplevel"]);
  if (!repoRoot) return; // Not a git checkout (tarball install, Docker build, ...).

  if (!existsSync(path.join(repoRoot, LEGACY_HOOKS_PATH, "pre-commit"))) return;

  const hooksPath = tryGit(["config", "--get", "core.hooksPath"]);
  if (hooksPath && hooksPath !== LEGACY_HOOKS_PATH) {
    console.warn(
      `install-git-hooks: core.hooksPath is set to "${hooksPath}", leaving it unchanged. ` +
        `Remove it and run "npm run hooks:install" to use the repository hooks.`,
    );
    return;
  }

  if (hooksPath === LEGACY_HOOKS_PATH) {
    // Migration: the hooks used to be reached through core.hooksPath, which
    // stopped working on any branch that did not contain .githooks/.
    git(["config", "--unset", "core.hooksPath"]);
  }

  const commonDir = git(["rev-parse", "--git-common-dir"]);
  const hooksDir = path.resolve(repoRoot, commonDir, "hooks");
  installHooks(repoRoot, hooksDir);
  console.log(`install-git-hooks: git hooks installed in ${hooksDir}.`);
}

main();
