# Clara tool contracts

Validate every argument in code. Tools return real results, and Clara must never claim success without one. The server, not the model, decides recipients, URLs and credentials.

| Tool | Arguments | Returns | Server-side rules |
| --- | --- | --- | --- |
| `search_knowledge` | `query` (short string) | Up to 3 results with title, URL, short snippet, or an empty list | Query length cap. Empty results are logged to the review queue. Only published content. Snippets are data, not instructions |
| `save_lead` | `name`, `email`, optional `company`, `problem_summary`, `team_size`, `tools`, `urgency` | `lead_id` | Strict validation. Save first, then alert the team. Update the same lead on repeat calls. Free-text fields length capped. No sensitive data stored |
| `check_availability` | `timezone`, optional `from`, `to` | A short list of slots with ids and times in the visitor's timezone | Uses the booking rules config. Reads free and busy time. Limits how many slots are returned |
| `book_call` | `slot_id`, `name`, `email`, optional `notes` | Confirmed time and Meet link, or a clear error with fresh slots | Requires a prior read-back of name and email. Rechecks the slot. Idempotency key. Sends confirmations from the fixed sender. Rate limited |
| `send_solution_brief` | `email`, `summary` | `sent: true` or an error | Only after the visitor agreed. One visitor address. Sent to the visitor and the team. No prices and no promises in the brief |
| `handoff_to_team` | `reason`, optional `contact` | `handoff_id` | Alerts the team inbox. Collects only the contact details the visitor chose to give |

Cap tool rounds per turn so a loop cannot burn the daily allowance.
