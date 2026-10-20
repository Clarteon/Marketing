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
- [ ] SEO basics: unique titles and descriptions, sitemap file, robots rules, canonical URLs, social share image
- [ ] Accessibility checks pass and keyboard use is verified
- [ ] Performance is reasonable on a mid-range phone and a slow connection
- [ ] Analytics decision made. If used, prefer a privacy-friendly approach, disclose it on the Privacy page, and add a consent banner only if the approach requires one

Operations
- [ ] Production and development keys are separate, and keys are rotated if ever exposed
- [ ] Error and usage alerts reach a person who will act on them
- [ ] A rollback path is known and tested (previous deployment can be restored)
- [ ] Domain, DNS and certificates are in order

## After launch: weekly review loop (P8)

Every week, review and record:

1. The unanswered-question queue: approve, edit or reject, and publish the useful answers
2. A sample of chats against the test script: any new failures become new scenarios
3. Usage against the daily allowance, and failed bookings or emails
4. Upgrade triggers: embeddings when keyword search misses questions the site answers, and a paid model tier when daily chats regularly hit the cap
5. One new Insights article tied to a common problem, ending in a booking section

## Done when

Every box in the checklist is ticked or has a named owner and a date, and the first weekly review is scheduled.
