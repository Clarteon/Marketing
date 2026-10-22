# Build roadmap

Work one phase at a time. Each phase names its skill, what humans must supply, its deliverables, and exit criteria. Tick the boxes only when the exit criteria are met. Sizes are rough (S, M, L) and only show relative effort.

## Order and dependencies

P0 Foundations, then P1 Site shell. After P1, P2 Lead capture, P3 Booking and P4 Knowledge layer can run in parallel. P5 Clara needs P2, P3 and P4. Then P6 Hardening and testing, P7 Content and launch, and P8 Learn and iterate.

Reason for this order: forms, booking and knowledge are plain server functions that work without a chatbot, so each one is testable on its own. Clara then becomes a thin conversation layer over tools that already work.

## Decisions needed from humans (by phase)

| Needed by | Decision or input |
| --- | --- |
| P0 | Domain and trademark check for "Clarteon", hosting provider, accounts (Groq, Google Cloud, Resend) |
| P1 | Primary call to action (default: discovery call), founder bios and certifications, final copy for sections beyond the hero |
| P2 | Email sending address, whether to keep a lead log, retention period |
| P3 | Booking rules (working hours, call length, buffer, minimum notice, whose calendar). Google authorization is settled: OAuth for a free Google Account on `admin@clarteon.tech`, no Workspace (see the P3 note) |
| P4 | Who reviews the unanswered-question queue and how often (content is Markdown in the repo and approved FAQs live in Neon; the admin sign-in is ready; review cadence still open) |
| P5 | Confirm exact Groq limits on the console limits page, read Groq's data terms |
| P7 | First two or three case studies with client permission, analytics approach |

## P0 Foundations (size S)

- Skill: `clarteon-foundation`
- Deliverables: Next.js TypeScript app, lint, format, type check and test tooling, environment variable scheme with `.env.example`, CI (lint, type check, tests, dependency audit), preview deployments, security header baseline, commands filled into `CLAUDE.md`.
- Exit criteria:
  - [x] App deploys to a preview URL
  - [ ] CI is green and blocks failing changes
  - [x] No secrets in the repo or client bundle
  - [x] `CLAUDE.md` commands are filled in
- Note: CI is green on every push and pull request and runs from the shared workflow in `Clarteon/.github` (`@v1`); tagged releases run CI before publishing a GitHub release. Branch protection is not available on a private repository on the GitHub Free plan, so failing checks do not yet block a direct push. Enable protection after making the repo public or upgrading, or enforce a pull-request-only workflow by convention.

## P1 Site shell and brand (size M)

- Skills: `clarteon-design-system`, `clarteon-build-page`, `clarteon-seo`
- Deliverables: design tokens and shared components, Home, Solutions, How we work, About, Contact (form UI and booking section placeholder), Privacy, shells for Our work and Insights, metadata and SEO basics, accessibility pass, placeholder check script.
- Exit criteria:
  - [x] Every page in the sitemap renders responsively
  - [x] Booking section and Clara's widget slot appear on every page
  - [x] Automated accessibility checks pass
  - [x] The production build fails if any bracket placeholder remains
- Note: checked at 390, 768 and 1280 px for all eight sitemap pages, with no horizontal overflow. Axe checks pass in tests, and Lighthouse scored 100 for accessibility, best practices and SEO on Home and Contact. Founder bios, certifications and the final privacy review still need human input. SEO follow-up (October 21, 2026): default share image, Organization, WebSite and Article structured data, article dates in the sitemap, and tested title and description limits, with the `clarteon-seo` rule and skill.

## P2 Lead capture and email (size S to M)

- Skill: `clarteon-lead-and-email`
- Deliverables: `/api/lead`, schema validation, bot challenge, rate limits, save-before-send, Resend sender with a verified domain, team alert and visitor receipt emails, optional lead log.
- Exit criteria:
  - [x] Form submission saves the lead, then sends both emails
  - [x] Failures are retried and never lose a lead
  - [x] SPF, DKIM and DMARC are verified
  - [x] Abuse tests (many submissions, many recipients) are blocked
- Note: live-verified on October 21, 2026. A test brief saved in Neon, both Resend sends were accepted without delivery errors, and the SPF, DKIM and DMARC records resolve. Turnstile, origin, honeypot and too-fast checks were blocked. Rate limiting is in-memory for now; replace it with a shared store in P6. Resend receiving is enabled for `info@clarteon.tech`, and the contact page publishes that address.

## P3 Booking (size M)

- Skill: `clarteon-booking`
- Deliverables: availability from Google Calendar free and busy time with configurable rules, booking that creates an event with the visitor as guest and a Meet link, recheck before booking, idempotent request IDs, confirmation emails, a booking section usable without Clara.
- Exit criteria:
  - [x] A visitor can book from the page and receives a Meet link by email
  - [x] Double bookings and duplicate retries are prevented
  - [x] Booking failures show a clear message and an email fallback
- Note: Google authorization decided October 21, 2026. Roles are split. `info@clarteon.tech` is the public mailbox: it sends and receives through Resend and is the sender and Reply-To on every site and booking email. `admin@clarteon.tech` is the setup, planning and meeting account: it holds the Google account, Drive, Calendar and Meet. It is not a public mailbox, and signing up creates no Gmail inbox for it, but Resend must still accept mail for it, because Google sends the signup verification code, security alerts and organizer notices there. Booking uses OAuth for that free Google Account ("For my personal use", then "Use your existing email"), not Google Workspace, so there is no Workspace mailbox, no DNS change and no domain-wide delegation. The free account supplies Drive (15 GB), Calendar, Meet and the Cloud console. Events are created on `admin@`'s calendar with `sendUpdates: all`, so the visitor gets Google's invite from `admin@` plus the branded confirmation from `info@` carrying the Meet link; keeping both was decided October 21, 2026, and the confirmation names `admin@` so the second email does not read as a duplicate. Before signing up, enable receiving for `admin@` at Resend and confirm a test message reaches a mailbox a person can open, since the verification code is sent there. Booking rules set October 21, 2026: `Asia/Manila`, Monday to Friday, 09:00-17:00, 30-minute calls, 10-minute buffer, 24-hour notice and a 30-day horizon, with the shared team calendar as the target. Set `GOOGLE_CALENDAR_ID` to `admin@clarteon.tech` rather than `primary`, so the calendar is pinned to the account the decision names. The booking modules, API routes, tests and Contact-page form are implemented, and `npm run db:init` has been run. Live-verified on October 22, 2026: availability returned slots, a test booking created a confirmed event on `admin@clarteon.tech` (Asia/Manila) with a Google Meet link, the booked slot disappeared from availability, and Resend delivered both the visitor confirmation (with the Meet link, Reply-To `info@clarteon.tech`) and the team alert. The OAuth app is In production, so the refresh token is not subject to the seven-day Testing expiry; it remains unverified with a 1/100 user cap, which is enough for the single `admin@` account. The test booking was cancelled and its booking row removed after verification; the October 26 slot is available again.

## P4 Knowledge layer (size M)

- Skill: `clarteon-knowledge-sync`
- Deliverables: content front matter and chunker, keyword search index built at publish time, `search_knowledge` function returning two or three short snippets, secured sync endpoint, unanswered-question log, admin review queue behind sign-in, approved answers stored as published FAQs in Neon and re-synced immediately without repository write access.
- Exit criteria:
  - [ ] Publishing content updates search results after a sync
  - [ ] Only published content is indexed
  - [ ] Unanswered questions appear in the review queue, and approvals re-sync
  - [ ] Review pages require sign-in
- Note (October 22, 2026): the content chunker and build-time keyword index, search, redaction, Neon FAQ store, secure sync endpoint, review queue, sign-in, audit log and tests are in place. A live Neon smoke test approved an FAQ, reindexed to 55 chunks, then removed it and synced back to 54. CI run `39756007585` passed and deployed `0546a1e`. Production still needs `ADMIN_AUTH_SECRET` and `SYNC_SECRET` set in Vercel: until then `/admin/login` shows the configuration notice and `POST /api/sync` returns `503`. The queue review cadence remains a human decision.

## P5 Clara (size L)

- Skill: `clarteon-clara-chat`
- Deliverables: `/api/chat` with streaming, Groq client with model fallback chain, tool calling for the six tools, token budgeting and history trimming, message caps, chat widget with quick-start buttons and a privacy notice, degraded mode, the system prompt.
- Exit criteria:
  - [ ] End-to-end conversation reaches a booked call and a saved lead
  - [ ] Model fallback and email-only mode work when limits are forced
  - [ ] Privacy notice appears before the first message
  - [ ] Chat output is rendered safely as text

## P6 Hardening and testing (size M)

- Skills: `clarteon-clara-tests`, `clarteon-security-review`
- Deliverables: the full scenario suite, an attacker-style test round, a security review report, usage and failure alerts.
- Exit criteria:
  - [ ] All 26 Clara scenarios pass
  - [ ] No open high-severity findings in the security review
  - [ ] Alerts fire in a test for usage threshold, failed booking and failed email
- Note (October 21, 2026): alert logic, e2e tests (Playwright, desktop and mobile) and the Lighthouse budget are in place and run in the CI `browser` job, with encrypted backups (`db:backup`, `db:restore`). Alert tests cover all three triggers; a live alert to the team inbox (`npm run alert:test`) is still to be checked before ticking the box. Cloudflare Web Analytics is wired and needs its Production token.

## P7 Content and launch (size M)

- Skills: `clarteon-case-study-writer`, `clarteon-launch`, `clarteon-seo`
- Deliverables: two or three published case studies with client permission, founder bios and certifications, Privacy page reviewed, analytics decision applied, SEO launch steps done (canonical host `clarteon.tech`, production indexing, Search Console with the sitemap submitted), go-live checklist completed.
- Exit criteria:
  - [ ] No bracket placeholders in production
  - [ ] Every published case study has recorded client permission
  - [ ] Go-live checklist is complete and a rollback path is known

## P8 Learn and iterate (ongoing)

- Weekly: review the unanswered-question queue, sample chats, usage against limits, and failed bookings or emails.
- Upgrade triggers: move to embeddings when the review queue regularly shows questions the site answers but keyword search missed. Move to a paid model tier when daily chats regularly hit the token cap.
- Keep adding Insights articles, each tied to a common problem and ending in a booking section (`clarteon-seo`).
- Monthly: review Search Console for the "Clarteon" brand query, unindexed pages and low-click queries.
