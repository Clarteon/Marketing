# Google Calendar notes

Checked October 20, 2026. Re-verify before building.

- Creating an event with a Meet link: call `events.insert` with `conferenceDataVersion=1` as a query parameter and a body containing `conferenceData.createRequest` with `conferenceSolutionKey.type` set to `hangoutsMeet` and a unique `requestId`. Without the query parameter the conference data is silently ignored. Google stopped adding Meet automatically to API-created events.
- Reading availability: use the free and busy query for the target calendar, or list events in the window.
- Quotas: 10,000 requests a minute per project and 600 per user per project by default. Standard use is free.
- Authorization: choose OAuth for the team's Google account, or a service account with domain-wide delegation on Google Workspace. Ask a human which applies to the account before building.
- Always send times in RFC 3339 format with an explicit timezone offset.
- The event should carry the visitor as an attendee so Google sends the standard invitation. Keep the visitor's notes short and free of sensitive data.
