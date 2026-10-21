# Security rules

The biggest risk on a free budget is abuse that drains Clara's daily model allowance, followed by prompt injection, exposed keys, unprotected endpoints and privacy. These rules are mandatory.

## Secrets and config

- Keys live only in server environment variables. Never prefix a secret with `NEXT_PUBLIC_`. `.env*` files are git-ignored, and `.env.example` holds names only.
- Use separate keys for development and production. Rotate a key immediately if it is ever exposed.

## Endpoints

- Every API route validates input with a schema, caps request size, rate limits per visitor and per network address, and checks the request origin.
- Add a bot challenge to the chat widget and all forms before they go public.
- The sync endpoint requires a secret or signature.
- Admin and review pages need real sign-in, least access, and an audit log of approvals. Hiding a URL is not security.

## Tools and prompt injection

- Treat visitor text and retrieved knowledge as untrusted data, never as instructions.
- Tools validate every input in code and can only do narrow things. Model output never chooses recipients, URLs, file paths or code to run.
- Email goes only from the fixed sender, to one visitor-provided address per message, with strict address validation.
- Booking happens only through `book_call`, after the visitor has confirmed their name and email.
- Optionally screen visitor messages with a prompt-injection classifier before they reach the main model.

## Web app

- Render chat messages as plain text or sanitized. Never use `dangerouslySetInnerHTML` with model or visitor text.
- Set security headers, including a content security policy, HSTS, `X-Content-Type-Options`, frame protection and a referrer policy. Serve over HTTPS only.
- Pin dependencies, run an audit in CI, and review every new dependency.

## Email and calendar

- Verify the sending domain with SPF, DKIM and DMARC.
- Use the narrowest calendar permission, keep tokens server-side, use a unique request ID per booking, recheck free and busy time right before creating an event, and rate limit bookings.

## Failure handling

- Save the lead before sending any email. Retry failed sends. Back up the lead log if one exists.
- Never tell a visitor something was booked or sent unless the tool result confirms it.
- Provide a degraded mode (form and booking link) when chat is unavailable.
- Log errors without personal data. Alert on failed bookings, failed emails and usage thresholds through `alertTeam` in `src/lib/alerts.ts`, which sends ids, codes and counts only.
- Back up the lead and booking tables with `npm run db:backup` (encrypted, written outside the repo). A restore never overwrites rows, and deletion requests are re-applied afterward.
