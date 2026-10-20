---
name: clarteon-lead-and-email
description: Build lead capture and email for Clarteon (roadmap phase P2): the project brief form, the /api/lead route, validation, bot protection, rate limits, saving leads before sending, Resend email sending from the verified domain, and the team alert and visitor receipt emails. Use whenever the task involves the contact or project brief form, lead storage, email sending, Resend, SPF, DKIM or DMARC for Clarteon.
---

# Lead capture and email

Goal: no lead is ever lost, and the form cannot be used to spam anyone.

Read `.claude/rules/security.md`, `privacy-and-data.md` and `free-tier-and-limits.md` first.

## The route

`POST /api/lead` accepts name, email, company (optional), what they need (free text with a length cap), team size (optional), and consent to be contacted.

1. Validate with a schema. Reject oversized bodies. Check the origin.
2. Verify the bot challenge token. Apply rate limits per network address and per email address.
3. Save the lead first (lead log, or at minimum a durable record). Only then send email.
4. Send the team alert and the visitor receipt through the email module. Retry failures with backoff. A failed send must not delete or hide the saved lead, and failures raise an alert.
5. Return a short success message. Never include internal errors in the response.

## Email module

- One fixed sender (for example `hello@` or `clara@` on the verified Clarteon domain). Set Reply-To to a team inbox so replies reach a person.
- Each message goes to exactly one visitor address, validated strictly. No visitor-controlled recipient lists, subjects or headers.
- Use idempotency keys so a retry never sends a duplicate.
- Verify the domain with the provider and confirm SPF, DKIM and DMARC records before launch.
- Budget: the free plan allows 3,000 emails a month and 100 a day, and each recipient counts. See `references/emails.md` for the message types.

## Optional lead log

If a database is used, back it up on your own schedule if the plan has no automatic backups, and make sure a paused or unavailable database falls back to an email-only record rather than losing the lead.

## Tests

- Valid submission saves then sends both emails
- Invalid and oversized input is rejected
- Many rapid submissions are rate limited
- Provider failure keeps the lead and retries
- A body that tries to add recipients or headers is rejected

## Done when

All roadmap P2 exit criteria are met.
