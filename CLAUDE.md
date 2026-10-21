# Clarteon website and Clara chatbot

Clarteon is a startup technology company and a business-focused technology partner. It does not lead with products. It starts from the client's problem, then recommends the best-fitting solution (automation, AI agents, chatbots, custom software, websites, mobile apps, CRM, API integrations). The name comes from the French "clarte", meaning clarity.

This repo is the Clarteon marketing site plus Clara, an AI assistant on the site that answers questions, qualifies leads, books discovery calls and diagnoses visitors' problems.

Source of truth for decisions: the plan document (https://claude.ai/artifact/REhBN9Ebruj14D2VAmaZxZ). If the code and the plan disagree, stop and ask a human.

## Stack

- Next.js (App Router) with TypeScript, server API routes for chat, lead capture and sync
- Chat model: Groq's OpenAI-compatible API, free tier first (gpt-oss-120b, then fallbacks), upgradeable to pay-as-you-go
- Knowledge: site content synced on publish into a keyword search index (RAG), embeddings documented as a future upgrade
- Booking: Google Calendar API with Google Meet links
- Email: Resend free plan, sent from a verified Clarteon domain
- Lead log: Neon Postgres (see `db/README.md`), with your own scheduled backups
- Hosting: Vercel (decided October 20, 2026), native Next.js with streaming and preview deployments, deployed from GitHub Actions because Hobby cannot connect private org repos. Hobby is non-commercial only: Pro is a pending human decision. Confirm the current Hobby plan limits before launch.

## Commands

Run these from the repo root with Node 24 and npm.

```bash
npm install            # install dependencies
cp .env.example .env.local   # create local env (names only; fill values locally)
npm run dev            # start the dev server at http://localhost:3000
npm run build          # placeholder check, then production build
npm run start          # serve the production build
npm run lint           # ESLint
npm run lint:fix       # ESLint with autofix
npm run format         # Prettier write
npm run format:check   # Prettier check
npm run typecheck      # next typegen, then tsc --noEmit
npm test               # Vitest run
npm run test:watch     # Vitest watch mode
npm run test:e2e       # Playwright: builds, serves on :3100, runs e2e/ (run `npx playwright install chromium` once)
npm run lhci           # Lighthouse budget against the last build
npm run check:placeholders  # fail if [ALL CAPS] placeholders reach published output
npm run db:init        # apply the lead table to the configured Neon database
npm run db:prune -- --dry-run  # count leads past the 12-month retention period
npm run google:oauth   # one-time Google Calendar OAuth helper
npm run db:backup -- --out <file outside repo>  # encrypted lead and booking backup
npm run db:restore -- --in <file> [--confirm]   # dry run by default; inserts missing rows only
```

CI and releases call the organization-wide reusable workflows in `Clarteon/.github` (`@v1`). The caller in `.github/workflows/ci.yml` runs lint, formatting, type check, tests, the placeholder check, a production dependency audit and the build, plus a local `browser` job with the e2e suite and the Lighthouse budget; `.github/workflows/release.yml` runs the same checks on a `v*` tag, then publishes a GitHub release. A `deploy` job then ships to Vercel through the shared `vercel-deploy.yml` (`@v1.1.0`): production for pushes to `main`, a preview with a PR comment for pull requests (see the `clarteon-deploy` skill). The knowledge build command is added in P4.

## Working agreements

- Work one roadmap phase at a time (see `ROADMAP.md`) and use the matching skill from `.claude/skills/`.
- Keep changes small and testable. Add or update tests with every behavior change.
- Never invent facts about Clarteon: team, clients, results, certifications, prices, location. Use bracket placeholders and flag them.
- Never put secrets in code, logs, client bundles or commits.
- Ask before adding a paid service, a new third-party dependency, or anything that sends visitor data to a new provider.
- When a decision from the plan's open items is needed, stop and ask. Do not guess.
- Tick roadmap checkboxes only when the phase's exit criteria are met.

## Rules (always apply)

@.claude/rules/brand-and-copy.md
@.claude/rules/sitemap-and-content.md
@.claude/rules/security.md
@.claude/rules/privacy-and-data.md
@.claude/rules/clara-behavior.md
@.claude/rules/free-tier-and-limits.md
@.claude/rules/code-conventions.md
@.claude/rules/seo.md

## Skills (load when the task matches)

- `clarteon-foundation`: repo, tooling, env scheme, CI, preview deploys
- `clarteon-design-system`: brand tokens and shared components
- `clarteon-build-page`: build a page from the sitemap
- `clarteon-lead-and-email`: project brief form, lead saving and email
- `clarteon-booking`: Google Calendar booking with Meet
- `clarteon-knowledge-sync`: content sync, keyword search, review queue
- `clarteon-clara-chat`: chat route, model fallback, tools, widget
- `clarteon-clara-tests`: the Clara test script and regression runs
- `clarteon-security-review`: pre-launch security audit
- `clarteon-case-study-writer`: turn a project into an approved case study
- `clarteon-seo`: search metadata, structured data, Search Console launch, Insights articles
- `clarteon-site-quality`: e2e and Lighthouse tests, alerts, analytics, backups and restore
- `clarteon-deploy`: Vercel deploys from GitHub Actions, onboarding, rollback, token rotation
- `clarteon-launch`: go-live checklist and post-launch review loop

## Definition of done

A change is done when it builds, type checks, lints and passes tests, follows the rules above, adds no secrets or bracket placeholders to production output, and the relevant roadmap exit criteria are met.
