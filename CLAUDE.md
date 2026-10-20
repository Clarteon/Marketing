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
- Lead log: optional small database, with backups if used
- Hosting: not decided yet. Pick one that supports streaming responses and confirm its free-tier limits.

## Commands

Fill these in during phase 0 (`clarteon-foundation` skill): install, dev, build, lint, type check, test, knowledge build.

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
- `clarteon-launch`: go-live checklist and post-launch review loop

## Definition of done

A change is done when it builds, type checks, lints and passes tests, follows the rules above, adds no secrets or bracket placeholders to production output, and the relevant roadmap exit criteria are met.
