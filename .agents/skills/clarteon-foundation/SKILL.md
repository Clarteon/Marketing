---
name: clarteon-foundation
description: Set up the Clarteon project foundations (roadmap phase P0): Next.js TypeScript repo, lint and test tooling, environment variable scheme, CI, preview deployments and a security header baseline. Use at the start of the Clarteon build, and whenever the task involves project setup, scaffolding, environment variables, CI, hosting or deploys for the Clarteon site, even if the word "foundation" is not used.
---

# Clarteon foundation

Goal: a repo that builds, tests and deploys to a preview URL with no secrets in it, so every later phase has solid ground.

## Before you start

Read `ROADMAP.md` (P0) and follow `.agents/rules/code-conventions.md` and `.agents/rules/security.md`. Ask a human for any of these that are still open, and do not guess:

- Domain and trademark check for "Clarteon"
- Hosting provider (must support streaming responses; confirm its free-tier function run-time limits)
- Accounts and keys for Groq, Google Cloud (Calendar API) and Resend

## Steps

1. Scaffold a Next.js App Router project in TypeScript strict mode, using the folder layout in `.agents/rules/code-conventions.md`.
2. Add tooling: linting, formatting, type check, a unit test runner, and an accessibility check runner. Add scripts for each to `package.json`.
3. Create the environment scheme. Write `.env.example` with names only and no values:
   - `GROQ_API_KEY`, `LLM_MODEL_PRIMARY`, `LLM_MODEL_FALLBACKS` (comma separated), `LLM_PROMPT_GUARD_MODEL` (optional)
   - `GOOGLE_CALENDAR_ID`, plus the Google credentials your chosen auth setup needs
   - `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `TEAM_ALERT_EMAIL`
   - `SYNC_SECRET`, `ADMIN_AUTH_*` (names depend on the sign-in method chosen)
   - `RATE_LIMIT_*` and `CHAT_MAX_MESSAGES` caps
4. Add a typed config module that reads and validates environment variables at startup on the server and fails fast with a clear message. Keep it server-only so keys never reach the client bundle.
5. Add the baseline security headers in the Next.js config: content security policy, HSTS, `X-Content-Type-Options`, frame protection and referrer policy. Start strict and loosen only with a reason.
6. Add CI that runs lint, type check, tests and a dependency audit on every change, and blocks merging on failure.
7. Connect preview deployments and confirm a deploy works.
8. Add a `scripts/check-placeholders` script that fails the production build if any `[ALL CAPS]` placeholder remains in rendered content or in `content/` files marked published. Wire it into the build.
9. Fill in the Commands section of `AGENTS.md` with the real commands.

## Exit criteria

- App deploys to a preview URL
- CI is green and blocks failing changes
- No secrets in the repo or client bundle (scan to confirm)
- `AGENTS.md` commands are filled in

Report what you did, what you assumed, and which human decisions are still open.
