---
name: clarteon-launch
description: Prepare and run the Clarteon go-live (roadmap phases P7 and P8): final content check, SEO basics, analytics and cookie decision, accessibility and performance checks, monitoring and alerts, rollback path, and the weekly post-launch review loop. Use when the site is nearly ready to publish, when the user mentions launch, going live, go-live, production, SEO, analytics or post-launch reviews.
---

# Launch

Goal: a calm launch with nothing embarrassing in production and a habit of weekly learning afterward.

Read `ROADMAP.md` (P7 and P8) and follow `.agents/rules/security.md` and `.agents/rules/privacy-and-data.md`.

## Go-live checklist

Content
- [ ] No bracket placeholders anywhere in production output (the build check passes)
- [ ] Founder bios and certifications supplied by the founders, not invented
- [ ] Every published case study has recorded client permission
- [ ] Homepage uses the approved headline and subhead
- [ ] Privacy page is accurate and a qualified lawyer has reviewed the privacy approach for the countries involved

Product
- [ ] The Clara scenario suite passes in full and the security review has no open high items
- [ ] Booking works end to end against the real calendar, and the confirmation arrives with a Meet link
- [ ] Email domain verified (SPF, DKIM, DMARC) and a test lead alert is received
- [ ] Free-tier limits re-verified on each provider's current page, and the usage alert threshold is set
- [ ] Degraded mode tested: chat down still leaves the form and booking working

Quality
- [ ] SEO: every step in the `clarteon-seo` launch section is done (canonical host `clarteon.tech`, production indexing on, sitemap submitted in Search Console, structured data validated, previews still `noindex`)
- [ ] Accessibility checks pass and keyboard use is verified
- [ ] The `browser` CI job passes: e2e tests on desktop and mobile, and the Lighthouse budget (see `clarteon-site-quality`)
- [ ] Cloudflare Web Analytics: site added in the Cloudflare dashboard, `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` set for Production only, beacon seen loading on production, Privacy page names it

Operations
- [ ] Production and development keys are separate, and keys are rotated if ever exposed
- [ ] Error and usage alerts reach a person who will act on them
- [ ] A rollback path is known and tested (previous deployment can be restored with Vercel's Instant Rollback)
- [ ] A first encrypted backup is taken and a test restore to a Neon branch has worked. Backups are scheduled and someone owns them
- [ ] Terms of use: published after lawyer approval with a footer link, or explicitly deferred by a human
- [ ] Domain, DNS and certificates are in order

## After launch: weekly review loop (P8)

Every week, review and record:

1. The unanswered-question queue: approve, edit or reject, and publish the useful answers
2. A sample of chats against the test script: any new failures become new scenarios
3. Usage against the daily allowance, and failed bookings or emails
4. Upgrade triggers: embeddings when keyword search misses questions the site answers, and a paid model tier when daily chats regularly hit the cap
5. One new Insights article tied to a common problem, ending in a booking section (see `clarteon-seo`)
6. Monthly: the Search Console review in `clarteon-seo`

## Done when

Every box in the checklist is ticked or has a named owner and a date, and the first weekly review is scheduled.
