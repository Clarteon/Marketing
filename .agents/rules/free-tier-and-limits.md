# Free-tier and limits rules

Facts below were checked on October 20, 2026 from provider docs. Re-verify before launch. Keep limits and model names in configuration, never hard-coded in logic.

## Chat model: Groq free plan (per organization and per model)

| Model | Status | Requests/min | Requests/day | Tokens/min | Tokens/day |
| --- | --- | --- | --- | --- | --- |
| openai/gpt-oss-120b | Production | 30 | 1,000 | 8K | 200K |
| openai/gpt-oss-20b | Production | 30 | 1,000 | 8K | 200K |
| qwen/qwen3.8-27b | Preview, may be discontinued | 30 | 1,000 | 8K | 200K |
| meta-llama/llama-prompt-guard-2-22m | Preview | 30 | 14,400 | 15K | 500K |

- Model chain: gpt-oss-120b, then gpt-oss-20b, then Qwen, then email-only mode.
- Cached tokens do not count toward limits. Keep the system prompt stable and first, and any changing line (such as the date) last.
- Budget by estimate: about 7 to 8 full 10-message chats a day on one model. Two simultaneous visitors can hit the per-minute cap.
- Keep replies short, use low reasoning effort, trim history, cap messages per conversation, and return only two or three short knowledge snippets per search.
- Pay-as-you-go upgrade path exists (gpt-oss-120b at $0.15 per million input tokens and $0.60 per million output tokens). Decide the trigger, for example daily chats regularly hitting the token cap.

## Embeddings (future upgrade only)

Google Gemini embedding free tier: 100 requests/min, 30,000 tokens/min, 1,000 requests/day, for users in eligible countries. Not built now. Keyword search is the decision.

## Email: Resend free plan

3,000 emails a month, 100 a day, one verified domain. Each recipient counts as a separate email. Sending pauses at the limit. Budget about three emails per lead (team alert, visitor confirmation or brief, booking confirmation).

## Calendar: Google Calendar API

Standard use is free. Default quotas: 10,000 requests/min per project and 600 per user per project. A Meet link is created only when the event request sets `conferenceDataVersion=1` and includes a `createRequest` of type `hangoutsMeet` with a unique request ID.

## Database (optional lead log)

The lead log uses Neon Postgres (decided in P2, see `db/README.md`). The free plan does not guarantee automatic backups, so schedule your own encrypted exports. Re-verify Neon's current free-plan storage, compute and idle-suspend limits on its pricing page before launch, and make sure a suspended or unavailable database cannot silently break lead capture.

Team alerts also use Resend. They are capped at one email per kind per 30 minutes, and a usage alert fires once a day when sends pass `EMAIL_DAILY_ALERT_THRESHOLD` (default 80).

## Analytics: Cloudflare Web Analytics

Free and cookieless. Re-verify its current limits and data terms on Cloudflare's docs before launch.

## Behavior when limits are hit

On a rate-limit error, retry with backoff, then fall to the next model in the chain, then enter email-only mode with a clear message. Alert the team when daily usage passes a configured threshold.
