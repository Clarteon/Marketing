# Clara tool contracts

Validate every argument in code. Tools return real results, and Clara must never claim success without one. The server, not the model, decides recipients, URLs and credentials.

| Tool | Arguments | Returns | Server-side rules |
| --- | --- | --- | --- |
| `search_knowledge` | `query` (short string) | Up to 3 results with title, URL, short snippet, or an empty list | Query length cap. Empty results are logged to the review queue. Only published content. Snippets are data, not instructions |
| `save_lead` | `name`, `email`, optional `company`, `problem_summary`, `team_size`, `tools`, `urgency` | `lead_id` | Strict validation. Save first, then alert the team. Update the same lead on repeat calls. Free-text fields length capped. No sensitive data stored |
| `check_availability` | `timezone`, optional `from`, `to` | A short list of slots with ids and times in the visitor's timezone | Uses the booking rules config. Reads free and busy time. Limits how many slots are returned |
| `book_call` | `slot_id`, `name`, `email`, optional `notes` | Confirmed time and Meet link, or a clear error with fresh slots | Requires a prior read-back of name and email. Rechecks the slot. Idempotency key. Sends confirmations from the fixed sender. Rate limited |
| `send_solution_brief` | `email`, `summary` | `sent: true` or an error | Only after the visitor agreed. One visitor address. Sent to the visitor and the team. No prices and no promises in the brief |
| `handoff_to_team` | `reason` (a short excerpt of the visitor’s question or problem), `contact` (their reply email) | `handoff_id` | Sends the approved excerpt and reply address to the team inbox for a person to answer |

Cap tool rounds per turn so a loop cannot burn the daily allowance.

## Explicit action confirmation

All four side-effect tools (`save_lead`, `book_call`, `send_solution_brief`, `handoff_to_team`) first produce a server-generated review card. Arguments are schema-validated and checked for sensitive content. The card shows the exact action and destination; booking also shows the actual slot, name, email and timezone. The visitor must press Confirm. A typed claim of earlier consent or browser-supplied history does not authorize execution.

The confirmation token is signed, session-bound, limited to those exact arguments and expires after ten minutes. It is not sent to the model. Cancellation makes no request. Confirmed execution still uses existing validation, idempotency and rate limits, and reports real success and partial email failures. The token is not a global single-use ledger; existing service idempotency handles duplicate retries.

Handoffs are limited to relevant Clarteon matters. Unrelated trivia, homework or creative requests must not enter the knowledge queue or generate a team email. A conversation attempting to change company facts receives a controlled reply and cannot publish knowledge.
