# Privacy and data rules

Clara and the forms collect names, emails and business details. Handle them carefully.

- Collect the minimum. Never ask for passwords, payment details or government IDs. If a visitor shares something sensitive, do not repeat it, save it or log it.
- Show a short privacy notice before the first chat message. It must say that messages are processed by a third-party AI provider.
- Publish the Privacy page: what is collected, why, who processes it, how long it is kept, and how to request removal.
- Set a retention period for chats and leads (a human decision) and implement deletion on request.
- Keep personal data out of application logs and error reports.
- If a visitor says or implies they are under 18 or a student, collect no personal details and offer no booking.
- Check which privacy laws apply to Clarteon and its clients with a qualified lawyer before launch. Do not present legal conclusions as fact.
- Analytics: Cloudflare Web Analytics only (cookieless, decided October 21, 2026), loaded only when its Production token is set and named on the Privacy page. No other analytics, tracking pixels or session recording without a human decision.
- Backups hold personal data: encrypt them, keep them out of the repo and out of shared drives, and delete them on the same retention schedule as the data.
- Read the free-tier data terms of every provider that receives visitor text (the chat model provider, and the embeddings provider if embeddings are added) before sending real visitor data.
