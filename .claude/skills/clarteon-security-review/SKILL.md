---
name: clarteon-security-review
description: Run a pre-launch security and robustness review of the Clarteon site and Clara (roadmap phase P6): abuse of the free model allowance, prompt injection, secrets, endpoints, admin access, email and calendar abuse, privacy, web app flaws, outages, lost leads and monitoring, with a written report. Use before launch, after major changes to chat, booking, email or knowledge features, and whenever the user asks for a security review, audit, hardening or robustness check.
---

# Security review

Goal: find and fix the ways the system could fail or be abused before real visitors arrive, and leave a short written report.

Read `.claude/rules/security.md`, `privacy-and-data.md` and `free-tier-and-limits.md`.

## Procedure

Go through each area, test it for real where possible, and record the evidence. Do not mark an item as passed from reading code alone if it can be tested.

| Area | What to check |
| --- | --- |
| Free allowance drain | Hammer the chat with many sessions and long messages. Confirm rate limits, message caps, bot challenge, fallback chain, email-only mode and the usage alert all work |
| Prompt injection | Run the injection and fake-authority scenarios. Plant instruction-like text in a published content file and confirm it does not change behavior |
| Secrets | Scan the repo history and the client bundle for keys. Confirm no secret uses a public prefix. Confirm separate dev and production keys |
| Endpoints | Call chat, lead and sync directly without the site. Confirm schema validation, size limits, origin checks, bot challenge, and the sync secret |
| Admin and review | Confirm every admin and review route requires sign-in, access is least privilege, and approvals are logged |
| Email | Confirm one recipient per message, fixed sender, strict validation, per-visitor limits, and SPF, DKIM and DMARC records |
| Calendar | Confirm narrowest scope, server-side tokens, recheck before booking, idempotency, and booking rate limits |
| Privacy | Confirm the notice appears before the first message, the Privacy page is accurate, retention is implemented, deletion on request works, and logs hold no personal data |
| Web app | Confirm chat output is rendered safely, security headers are present, HTTPS only, and the dependency audit is clean |
| Outages | Disable each provider in turn (model, calendar, email, database) and confirm the degraded behavior and that no lead is lost |
| Lost leads | Break email sending after a lead is saved and confirm the lead survives and the retry works. Confirm lead-log backups if a database is used |
| Monitoring | Trigger a failed booking, a failed email and a usage threshold, and confirm alerts arrive without personal data |

## Report format

```
# Security review: [date]
Summary: [pass / pass with fixes / not ready]
| Area | Result | Evidence | Fix or follow-up | Severity |
Open items: [list]
Sign-off needed from a human: [privacy law check, domain verification, key rotation]
```

Severity is high, medium or low. Launch needs zero open high items.

## Done when

All roadmap P6 security exit criteria are met and the report is saved in the repo.
