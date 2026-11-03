# Clara system prompt reference

The executable prompt is `buildSystemPrompt` in `src/lib/chat/prompt.ts`. Edit and test that source; this reference is not loaded by the app.

The runtime prompt supplies approved company facts, the four-step process, configured call duration and hours, a stable business scope, readable Markdown, one focused question, conditional recommendations, no unsupported prices or promises, and privacy rules. Its changing date remains last.

`src/lib/chat/scope.ts` routes requests before normal generation. Unrelated requests do not receive substantive answers, retrieval or handoffs; ambiguous requests get clarification; mixed requests pass only the business request onward. Adult students are not automatically treated as minors.

`src/lib/chat/confirmation.ts` binds a review card to a session, exact arguments and ten-minute expiry. The model proposes side effects; only an explicit visitor confirmation authorizes execution. Never claim a booking, save or email based on a proposal alone.

Run the isolated chat tests, browser confirmation tests and the scenario suite after policy changes. The opt-in live scope evaluation uses synthetic text with every business integration isolated; it is separate from the full 26-scenario behavior and attacker evaluation. Never equate mocked or scope-only checks with full launch readiness.