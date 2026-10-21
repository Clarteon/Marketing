# Code conventions

## Stack and structure

- TypeScript in strict mode, Next.js App Router. Prefer server components. Use client components only for interactivity (chat widget, forms, booking picker).
- Suggested layout:

```
src/app/(site)/...        pages from the sitemap
src/app/api/chat/route.ts       Clara conversation
src/app/api/lead/route.ts       project brief and lead capture
src/app/api/booking/...         availability and booking routes
src/app/api/sync/route.ts       knowledge rebuild trigger (secret required)
src/app/admin/...               review queue (sign-in required)
src/lib/llm/                    model client, fallback chain, token budgeting
src/lib/tools/                  tool implementations used by Clara
src/lib/booking/                availability and booking (Google Calendar)
src/lib/email/                  sender and templates
src/lib/knowledge/              chunking, index, search
src/lib/metadata.ts, src/lib/structured-data.ts   SEO metadata and JSON-LD (see seo.md)
src/lib/guardrails/             rate limits, bot check, size limits, validation
content/                        pages, case studies, insights, faqs (Markdown or MDX)
scripts/                        build-knowledge, check-placeholders, db and Google OAuth helpers
db/                             lead and booking schema, backup and retention notes
tests/                          unit, integration, and the Clara scenario suite
```

## Practices

- Validate all external input with a schema library (for example zod). Define types from schemas.
- Keep the model call behind one function and the model names in environment variables, so providers can be swapped.
- Tool functions are plain, individually tested functions. The model only calls them through a thin, validated layer.
- Every external call has a timeout, limited retries with backoff, and a typed error. Never let an uncaught provider error reach the visitor.
- Use idempotency keys for bookings and emails so retries never duplicate them.
- Keep configuration (working hours, call length, caps, thresholds, retention) in one config module.
- Logging: structured, no personal data, no secrets, no raw chat text unless retention rules allow it.
- Tests: unit tests for tools and guardrails, integration tests for routes with mocked providers, Playwright end-to-end tests in `e2e/` for pages and flows (providers stubbed in the browser, never called), and the Clara scenario suite for behavior. A new form, flow or visitor-facing error message ships with an e2e spec. See the `clarteon-site-quality` skill.
- Performance: the Lighthouse budget in `lighthouserc.json` runs in CI. Do not lower a threshold to pass; fix the page or ask.
- Accessibility: axe runs in unit tests and on every sitemap page in the e2e suite. Review keyboard use manually.
- Commits: small and focused, with a message that says what changed and why.
