---
name: clarteon-clara-chat
description: Build Clara, Clarteon's website AI assistant (roadmap phase P5): the /api/chat route with streaming, the Groq model client with fallback chain, tool calling for the six tools, token budgeting, message caps, the chat widget with quick-start buttons and privacy notice, degraded mode, and the system prompt. Use whenever the task involves Clara, the chatbot, the chat route, Groq, model fallback, tool calling, the chat widget or the Clara system prompt.
---

# Clara chat

Goal: a warm, plain-spoken assistant that guides visitors to a booked call or a saved lead, stays inside the free-tier limits, and cannot be talked out of her rules.

Read `.claude/rules/clara-behavior.md`, `security.md`, `privacy-and-data.md` and `free-tier-and-limits.md`. The prompt is in `references/system-prompt.md` and the tool contracts in `references/tools.md`.

## Prerequisites

Lead capture (P2), booking (P3) and the knowledge layer (P4) already work as plain server functions. Clara only calls them.

## Chat route

1. Validate the request with a schema: message length cap, history length cap, session id. Check origin, bot challenge, and rate limits per session and network address. Enforce the per-conversation message cap.
2. Build the model request: stable system prompt first, then trimmed history (summarize older turns), then the new message. Put the changing date line last in the prompt so caching works. Set a low reasoning effort and a reply length cap.
3. Call the model through one function. Groq is OpenAI-compatible (base URL `https://api.groq.com/openai/v1`). Read model names from environment variables.
4. Fallback chain on rate-limit or provider errors: retry with backoff, then the next model (gpt-oss-120b, then gpt-oss-20b, then the preview model), then email-only mode with a clear message. Log which model served each turn, without personal data.
5. Tool calling: expose exactly the six tools in `references/tools.md`. Validate every tool argument in code. Execute tools on the server and return their real results. Cap tool rounds per turn.
6. Stream the reply to the browser. Never stream raw provider errors.
7. Optional screen: run visitor messages through a prompt-injection classifier before the main model, truncating to its input limit.

## Chat widget

- Quick-start buttons: "I have a problem to solve", "What does Clarteon do?", "Book a call".
- Show the privacy notice (messages are processed by a third-party AI provider) before the first message, and require acknowledgment.
- Render messages as plain text or sanitized. Never inject model output as HTML.
- Handle slow replies, errors and the degraded mode (show the project brief form and booking section when chat is unavailable).
- Keyboard accessible, visible focus, labels for assistive tech.

## System prompt

Keep it near 1,000 tokens. Everything that never changes sits at the top. Facts in square brackets are supplied by humans and must not be invented. Changes to the prompt require rerunning the full test script (`clarteon-clara-tests`).

## Done when

All roadmap P5 exit criteria are met.
