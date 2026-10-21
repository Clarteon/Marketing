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
| P3 | Google authorization setup (OAuth for the team account, or a service account with domain-wide delegation on Workspace), booking rules (working hours, call length, buffer, minimum notice, whose calendar) |
| P4 | Where content lives (default: files in the repo), who reviews the unanswered-question queue and how often |
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
- Note: CI is green on every push and pull request. Branch protection is not available on a private repository on the GitHub Free plan, so failing checks do not yet block a direct push. Enable protection after making the repo public or upgrading, or enforce a pull-request-only workflow by convention.

## P1 Site shell and brand (size M)

- Skills: `clarteon-design-system`, `clarteon-build-page`
- Deliverables: design tokens and shared components, Home, Solutions, How we work, About, Contact (form UI and booking section placeholder), Privacy, shells for Our work and Insights, metadata and SEO basics, accessibility pass, placeholder check script.
- Exit criteria:
  - [x] Every page in the sitemap renders responsively
  - [x] Booking section and Clara's widget slot appear on every page
  - [x] Automated accessibility checks pass
  - [x] The production build fails if any bracket placeholder remains
- Note: checked at 390, 768 and 1280 px for all eight sitemap pages, with no horizontal overflow. Axe checks pass in tests, and Lighthouse scored 100 for accessibility, best practices and SEO on Home and Contact. Founder bios, certifications and the final privacy review still need human input.

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
  - [ ] A visitor can book from the page and receives a Meet link by email
  - [ ] Double bookings and duplicate retries are prevented
  - [ ] Booking failures show a clear message and an email fallback

## P4 Knowledge layer (size M)

- Skill: `clarteon-knowledge-sync`
- Deliverables: content front matter and chunker, keyword search index built at publish time, `search_knowledge` function returning two or three short snippets, secured sync endpoint, unanswered-question log, admin review queue behind sign-in, approved answers written back as FAQ content that re-syncs.
- Exit criteria:
  - [ ] Publishing content updates search results after a sync
  - [ ] Only published content is indexed
  - [ ] Unanswered questions appear in the review queue, and approvals re-sync
  - [ ] Review pages require sign-in

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

## P7 Content and launch (size M)

- Skills: `clarteon-case-study-writer`, `clarteon-launch`
- Deliverables: two or three published case studies with client permission, founder bios and certifications, Privacy page reviewed, analytics and SEO decisions applied, go-live checklist completed.
- Exit criteria:
  - [ ] No bracket placeholders in production
  - [ ] Every published case study has recorded client permission
  - [ ] Go-live checklist is complete and a rollback path is known

## P8 Learn and iterate (ongoing)

- Weekly: review the unanswered-question queue, sample chats, usage against limits, and failed bookings or emails.
- Upgrade triggers: move to embeddings when the review queue regularly shows questions the site answers but keyword search missed. Move to a paid model tier when daily chats regularly hit the token cap.
- Keep adding Insights articles, each tied to a common problem and ending in a booking section.
