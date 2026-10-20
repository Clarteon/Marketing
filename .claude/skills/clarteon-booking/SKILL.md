---
name: clarteon-booking
description: Build discovery call booking for Clarteon (roadmap phase P3) with the Google Calendar API and Google Meet links: availability from free and busy time with configurable rules, booking with a guest and a Meet link, double-booking prevention, idempotent request IDs and confirmation emails. Use whenever the task involves booking, scheduling, availability, Google Calendar, Google Meet, or the check_availability and book_call tools.
---

# Booking

Goal: a visitor can book a discovery call from a normal page, and Clara later reuses the same functions.

Read `.claude/rules/security.md` and `free-tier-and-limits.md`, and `references/google-calendar-notes.md`.

## Before you start

Ask a human for these. Do not guess:

- Google authorization setup: OAuth for the team's Google account, or a service account with domain-wide delegation on Google Workspace. Creating Meet links from a server depends on this.
- Booking rules: working hours and timezone, call length, buffer between calls, minimum notice, how far ahead visitors can book, and whose calendar receives bookings (shared team calendar or one person's).

Put all rules in the single config module.

## Functions

1. `getAvailability({ timezone, from, to })`: read free and busy time for the target calendar, subtract busy periods and buffers, apply working hours and minimum notice, return a short list of open slots with stable slot ids, shown in the visitor's timezone.
2. `bookCall({ slotId, name, email, notes })`: validate inputs, recheck that the slot is still free, create the event with the visitor as a guest and a Meet link, send confirmation emails, and return the confirmed time and link.

## Rules

- Create the Meet link explicitly: set the `conferenceDataVersion` query parameter to 1 and include a `conferenceData.createRequest` of type `hangoutsMeet` with a unique request ID. Google does not add Meet automatically to API-created events.
- Use a unique idempotency key per booking so a retry never creates a second event or Meet link.
- Recheck free and busy time right before creating the event. If the slot was taken, return a clear message and fresh slots.
- Use the narrowest calendar permission and keep tokens server-side.
- Rate limit booking attempts per visitor and per network address.
- Validate the visitor email strictly. Send confirmations only from the fixed sender.
- Reschedule and cancel start simple: the confirmation email tells the visitor to reply to change the time.
- If booking fails, show a clear message and fall back to taking the visitor's email so the team can follow up. Never claim success without a confirmed event.

## UI

Build the booking section as a normal page component: timezone detection with a manual override, a short list of slots, a name and email form, and a clear confirmation or error state. It must work with no chatbot present.

## Tests

Slot generation respects hours, buffers and notice. Busy time removes slots. Double booking is prevented. A retry with the same key does not duplicate. Provider failure produces the fallback. Time zones, including daylight saving changes, are handled.

## Done when

All roadmap P3 exit criteria are met.
