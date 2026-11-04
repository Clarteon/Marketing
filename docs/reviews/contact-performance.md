# Contact startup performance audit and fix

Date: November 4, 2026 (Asia/Manila).

Branch: `fix/clara-response-reliability`. Audit baseline: reliability commit `8b33742`. This follows the [Clara response evaluation](clara-response-reliability.md); it concerns page startup, not AI generation latency.

## Findings

The Contact page failed the unchanged Lighthouse performance floor of 0.70. Earlier runs scored 0.47–0.53. A fresh baseline reproduced a score of 0.52, LCP of 5,518 ms, total blocking time of 1,946 ms and 613,610 transferred bytes under Lighthouse's mobile simulation.

The earlier trace attributed most headline delay to rendering, with substantial JavaScript and layout work. No `/api/chat` request occurred. Source and network inspection found:

- The full Markdown parser was statically imported even while Clara was closed.
- `BookingSection` imported the booking form even for its link-only variant on other pages.
- Contact mounted the calendar, fetched availability, and mounted the project-brief form and bot widget before the visitor reached those controls.

The affected route's compiled React work is evidence of startup cost, not a component-by-component CPU attribution. The loading changes and before/after measurements establish that unnecessary eager work was a substantial contributor. No matching benchmark on the newer `main` revision establishes when the problem was first introduced.

## Changes

- `MessageMarkdown` loads the existing parser when an assistant message is actually displayed. It forwards the caller's existing formatting, element and link policies unchanged. Loading or chunk failure leaves readable escaped text; it does not execute raw HTML or create unsafe links.
- `DeferredForm` imports and mounts a form when visible or deliberately activated by its native button. Browsers without IntersectionObserver activate it asynchronously. Once mounted, the form stays mounted, preserving typed values and booking state when scrolled offscreen.
- The existing `#book` and `#brief` sections remain present before activation. Keyboard activation transfers focus into the loaded control rather than losing it with the placeholder.
- A form-chunk failure provides a visible error and the approved team email. Booking and lead APIs, validation, consent, confirmation, rate limits, providers and environment settings are unchanged.
- Measured space is reserved before and after activation to prevent the next section moving during navigation. The collapsed brief includes room for verification-widget feedback; visitor-expanded optional fields can grow normally.

No new dependency was added. Styling uses existing brand tokens. The Markdown wrapper deliberately leaves `ClaraChat`'s renderer options in the caller so the newer timezone selector's special link rendering can merge without being discarded by a moved implementation.

## Regression found during implementation

The first deferred-form version reserved 576 px only until the real form mounted. A desktop navigation test intermittently failed because the growing brief moved the direct-message frame below its reveal threshold during scrolling. The trace showed the section at the bottom of the viewport rather than at its intended scroll position.

The loaded brief measured about 725 px on desktop and 888 px on mobile with the real verification failure state. The deterministic test widget added some further height. The wrapper now retains responsive minimum space (48 rem desktop, 58 rem at the brief's existing mobile breakpoint; booking 38 rem). An end-to-end assertion checks that activating the collapsed brief changes wrapper height by less than 2 px. The original scroll/reveal assertion remains unchanged.

A subsequent run exposed a test-measurement error: `getBoundingClientRect()` included the existing reveal animation's changing scale. The assertion now uses `offsetHeight` to measure layout space independently of that animation, retaining the same 2 px bound.

## Measurements

Both post-fix full budget runs passed all required assertions across Home, Solutions, Contact and Insights (three runs per route). After the final layout and renderer-compatibility refinements, Contact results were:

| Metric | Fresh baseline, one run | Post-fix, three runs |
| --- | --- | --- |
| Performance score | 0.52 | 0.81 / 0.87 / 0.86 |
| Largest contentful paint | 5,518 ms | 3,568 / 3,649 / 3,546 ms |
| Total blocking time | 1,946 ms | 407 / 190 / 241 ms |
| Transferred bytes | 613,610 | 450,428 each |

These are local lab measurements, not production field data or guarantees for every device. LCP remains above the 2,500 ms warning target, and some blocking-time samples exceed the 200 ms warning target. No performance, accessibility, SEO or best-practice threshold was reduced.

## Verification

The final desktop/mobile browser run passed 68 tests with two existing mobile-only skips. This includes the unchanged navigation/reveal checks, chat formatting and action confirmation, brief submission, booking success and failure paths, accessibility scans and the new deferred-loading regressions. Provider responses are stubbed. Screenshots and raw trace/report artifacts remain outside Git.

The full `npm run verify` check passed: formatting, lint, route generation/type checking, 345 isolated tests (53 opt-in live tests skipped), and published-placeholder checks. The browser suite also rebuilt the production bundle successfully. `npm audit --omit=dev --audit-level=high` reported zero vulnerabilities.

The final `npm run lhci` exited successfully for all 12 runs. Its required performance floor remains 0.70; accessibility, best practices, SEO and layout-shift assertions also passed. The reported advisory warnings concern LCP. Individual blocking-time samples are listed above even though the aggregate blocking-time assertion did not warn.

Useful repeat commands from the repository root:

```powershell
npm run verify
npm run test:e2e -- --workers=1
$env:CHROME_PATH = node -e "process.stdout.write(require('playwright').chromium.executablePath())"
npm run lhci
```

The browser tests stub provider responses. Lighthouse measures initial page loads and can request calendar availability and the existing bot script when their controls activate; it does not submit leads, create bookings, send emails or ask Groq for a reply.

New coverage includes dormant offscreen forms, first activation, keyboard focus, retained input, graceful formatting-chunk failure, deferred availability requests, brief-wrapper layout stability and form-chunk recovery.
