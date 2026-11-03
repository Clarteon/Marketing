# Chat scope and confirmation review

Reviewed: 2026-11-03 (Asia/Manila).

Scope: the reported conversation failures and the authorization boundary around Clara’s six tools. This is a focused robustness review, not a full pre-launch security sign-off. The earlier response-formatting changes remain included on `chat-scope-and-confirmation`.

## Resulting behavior

- The existing Groq client performs a separate, bounded scope decision using strict JSON-schema output. The server validates that decision again. No classifier tool access is available. Invalid output cannot authorize generation or actions; provider unavailability enters degraded mode.
- Unrelated arithmetic, political trivia, homework and creative-writing requests get a controlled scope response. Mixed requests pass only their business request onward; ambiguous requests get clarification. Greetings, adult students and business technology questions stay supported.
- Attempts to permanently teach company facts receive a controlled response, not a knowledge write or handoff. Retrieved content and browser history remain untrusted data. Obvious credentials in earlier history are omitted before model calls.
- The prompt requires one focused question, conditional recommendations, diagnosis before choosing a solution, the complete Diagnose/Recommend/Build/Support process, matching language, and respect for information-only conversations. Call duration and error-rate questions no longer trigger the pricing keyword guard.
- Model text is held until a round completes. Tool-round drafts and recognized unsupported action-success claims are not shown as completed actions. When a reply contains multiple question marks, the server keeps the first question; semantic detection of multiple questions within one sentence still depends on the model instructions.
- Lead saves, bookings, summary emails and team handoffs require an explicit review-card confirmation. The token is signed, session-bound, expires after ten minutes and carries only the displayed arguments. It is not sent to Groq. Direct tool calls without server authorization are rejected. Cancellation makes no request.
- Confirmed actions use existing business validation, Google availability rechecks, booking/email idempotency and action rate limits. Success wording distinguishes a confirmed booking from an email that failed to send. Availability needs a timezone; notes remain optional.

## Verification

| Check | Evidence |
| --- | --- |
| Repository verification | `npm run verify`: formatting, lint, type checks, 313 isolated tests and placeholder checks passed. The 35 opt-in live cases are skipped by ordinary test runs. |
| Real model evaluation | All 35 opt-in cases passed in the final run: 26 scope cases, a multi-turn boundary case, a complete-process reply and seven business-reply regressions. The configured model chain was exercised, including fallback after a real rate limit. |
| Side effects during live evaluation | Only synthetic text was sent to the existing Groq provider. Knowledge retrieval used the bundled index; calendar, email, lead storage and alert integrations were isolated. No live booking, lead or email was created. |
| Browser and production build | Production build completed; desktop/mobile suite passed 58 cases, with two existing mobile skips. An initial scroll-animation failure passed in the final single-worker run without changing its assertion or implementation. |
| Visual review | Desktop and mobile confirmation captures inspected. Existing Markdown formatting and safe-link behavior remain covered. |
| UI detector | No findings for the changed chat component and stylesheet. |
| Lighthouse | All required assertions passed across four routes and twelve runs. Warnings remain for LCP (roughly 3.8–4.9 seconds), Contact blocking time and Home/Contact page weight. No thresholds were reduced. |
| Actual local widget | After restarting the verified development server, sending `What is 7 × 8?` through the in-app browser returned the controlled business-scope redirect. The server logged `chat_scope: unrelated`; no arithmetic answer or side-effect tool was produced. |

Earlier evaluation failures exposed an ambiguous teaching-attempt route and malformed classifier JSON; these led to the controlled policy-change response and schema-constrained provider output. Authority-spoof tests accept either of the two fixed refusal routes and require a non-acting reply. This checks the security outcome rather than an arbitrary label.

The existing development process had exhausted its local token estimate before this work. Its verified project server was restarted to load the changes. Provider quotas were not increased or disabled.

## Running the live checks

These consume Groq allowance and are explicit opt-in. Use test credentials where possible. The file isolates all business integrations.

```powershell
$env:CLARA_LIVE_EVAL = 'true'
node --env-file-if-exists=.env.local node_modules/vitest/vitest.mjs run tests/chat-live-evaluation.test.ts --maxWorkers=1 --bail=1
Remove-Item Env:CLARA_LIVE_EVAL
```

## Remaining limits and release boundary

- A model classifier can misclassify unfamiliar wording. The 35 cases are evidence for those inputs, not proof against every possible prompt or every model version. The full roadmap P6 behavior suite and attacker-style security review remain separate exit criteria; their checkboxes are unchanged.
- Rate limits, daily token estimates and history remain instance-local or browser-supplied. This change does not establish a shared quota ledger, durable chat identity, verified age or email ownership. Explicit confirmation prevents a model from silently authorizing an action; it does not prove a visitor owns an address.
- Signed confirmations are not globally single-use. Existing service idempotency protects normal duplicate booking/email retries within its existing provider and storage guarantees. Global replay control would require explicit stored-state scope and further design.
- Pattern-based sensitive-data and unsupported-success checks are limited. They do not establish complete redaction or semantic output validation.
- Scope classification adds a model request and consumes the existing free-tier allowance. Buffering a round delays visible text until its checks finish. A single 50-second generation deadline includes classification and fallback work.
- No dependency, database schema, provider account, deployment or production setting was changed. The changes are prepared for pull-request review; a production deployment is outside this review. Review client, route, tool and confirmation changes together; an eventual rollback should revert that coherent set together.
