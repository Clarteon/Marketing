---
name: clarteon-site-quality
description: Keep the Clarteon website working in real browsers and in production (roadmap phases P6 to P8): Playwright end-to-end tests for pages, the project brief form and booking, the Lighthouse performance and accessibility budget, team alerts for failed leads, bookings and usage, Cloudflare Web Analytics, and encrypted database backups and restores. Use whenever the task mentions e2e or browser tests, Playwright, Lighthouse, performance, Core Web Vitals, page speed, alerts, monitoring, analytics, backups, restore, disaster recovery, or a change to a form, booking flow or page layout that a browser test should cover.
---

# Site quality and operations

Goal: every change is proven in a real browser, the site stays fast and accessible, failures reach a person, and no lead or booking is lost for good.

Follow `.claude/rules/code-conventions.md`, `.claude/rules/security.md` and `.claude/rules/privacy-and-data.md`. Clara's own behavior tests live in `clarteon-clara-tests`, not here.

## Where things live

| Concern | File |
| --- | --- |
| Browser tests | `e2e/*.spec.ts`, `playwright.config.ts` |
| Performance and accessibility budget | `lighthouserc.json` |
| CI job running both | `.github/workflows/ci.yml` (`browser` job) |
| Team alerts and usage counter | `src/lib/alerts.ts` |
| Analytics | `src/components/ui/Analytics.tsx`, CSP in `next.config.ts` |
| Backups and restore | `scripts/backup-db.mjs`, `scripts/restore-db.mjs`, `scripts/lib/backup-crypto.mjs`, `db/README.md` |

## End-to-end tests

- Run: `npx playwright install chromium` once, then `npm run test:e2e`. It runs `npm run build`, then serves the build on port 3100 with indexing off and a fake Turnstile key, like a preview deploy.
- Providers are never called. Tests stub the Turnstile script and answer `/api/*` requests in the browser with `page.route`. Never point e2e tests at real Groq, Google, Resend or Neon.
- `site.spec.ts` walks every URL in the sitemap: status, one `h1`, title, canonical, share image, footer Privacy link, no console errors (this catches CSP breaks), axe violations, and no horizontal overflow on desktop and mobile.
- `forms.spec.ts` covers the brief form and booking: success, the exact fields sent, slot taken, booking failure with the brief fallback, and calendar down.
- New page or section: it is covered automatically once it is in the sitemap. New form, flow or error message: add a spec in the same change.

## Lighthouse budget

- Run after a build: `npm run lhci`. Uses the Chrome on the machine. On Windows without Chrome, set `CHROME_PATH` to Playwright's Chromium.
- Budget (errors): accessibility 0.95, best practices 0.9, SEO 0.95, CLS 0.1, and a performance floor of 0.7. Warnings: LCP 2.5 s and TBT 200 ms, the "good" Core Web Vitals marks. `is-crawlable` and `robots-txt` are skipped because test builds are `noindex` on purpose.
- Baseline (October 21, 2026, mobile emulation on a dev laptop): performance 0.75 to 0.87, accessibility, best practices and SEO 1.0. LCP is about 3.1 s because the hero text animates in from transparent, so the header wordmark becomes the LCP element after hydration, and TBT is 330 to 1,200 ms (highest on Contact, which hydrates both forms). Target: performance 0.9. Raise the floor as fixes land.
- Never lower a threshold to make CI pass. Fix the page, or ask a human and record why in the commit message.

## Alerts

- `alertTeam(kind, fields)` emails `TEAM_ALERT_EMAIL` through Resend. It never throws, sends at most one email per kind per 30 minutes (bucketed idempotency key), and drops any field value that is not an id, code or count.
- Wired today: lead save failed, lead store unavailable, booking failed, and daily email usage past `EMAIL_DAILY_ALERT_THRESHOLD` (default 80 of Resend's 100 a day). Clara's token usage uses `recordUsage` in P5.
- Never pass names, emails, messages or notes. Add new kinds to the `AlertKind` union with a one-line summary.
- `npm run alert:test` sends one test email in the alert format to `TEAM_ALERT_EMAIL` (needs `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`). Use it to prove a live alert reaches the real inbox.
- `recordUsage` counts per server instance. The shared store planned for rate limits in P6 replaces it.

## Analytics

- Cloudflare Web Analytics, cookieless. It loads only when `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` is set, and the CSP allows its origins only then. Set the token for Production only in Vercel.
- The Privacy page names it. Any new analytics or tracking provider needs a human decision first.

## Backups and restore

- `npm run db:backup -- --out <path outside the repo>` writes an AES-256-GCM encrypted export of `leads` and `bookings`. Needs `DATABASE_URL` and `BACKUP_PASSPHRASE` (16 or more characters, stored in a password manager, never in the repo).
- `npm run db:restore -- --in <file>` decrypts and counts rows. Add `--confirm` to insert missing rows. It never updates or deletes.
- After a restore, re-apply deletion requests received since the backup, then run `npm run db:prune`, so removed visitors do not come back.
- Test a restore against a Neon branch at least once before launch and after schema changes.

## Done when

`npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run lhci` and `npm run build` pass, and any new flow has an e2e spec.
