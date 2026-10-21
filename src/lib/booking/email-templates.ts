import { escapeHtml, type EmailContent } from "@/lib/email/templates";
import { formatSlotDateTime } from "./format";
import type { BookingRecord } from "./types";

const SITE_URL = "https://clarteon.tech";
const CONTACT_EMAIL = "info@clarteon.tech";
const CALENDAR_EMAIL = "admin@clarteon.tech";

function safeMeetLink(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith("https://meet.google.com/")) return undefined;
  return value;
}

function bookingTimes(booking: BookingRecord): { visitor: string; calendar: string } {
  return {
    visitor: formatSlotDateTime(booking.slotStart.toISOString(), booking.timezone),
    calendar: formatSlotDateTime(booking.slotStart.toISOString(), "Asia/Manila"),
  };
}

function bookingNotes(booking: BookingRecord): string {
  return booking.notes?.trim() || "Not provided";
}

export function buildBookingVisitorEmail(booking: BookingRecord): EmailContent {
  const meetLink = safeMeetLink(booking.meetLink);
  const times = bookingTimes(booking);
  const subject = "Your Clarteon discovery call is booked";

  const text = [
    `Hi ${booking.name},`,
    "",
    "Your discovery call with Clarteon is booked.",
    "",
    `When: ${times.visitor}`,
    `Clarteon time: ${times.calendar}`,
    "",
    meetLink
      ? `Join with Google Meet: ${meetLink}`
      : "The Google Meet link is in the calendar invitation.",
    "",
    `Google also sends a separate calendar invitation from ${CALENDAR_EMAIL} for the same call.`,
    "",
    "If you need to change the time, reply to this email.",
    "",
    "You received this because you booked a discovery call at clarteon.tech.",
    "",
    "Clarteon",
    CONTACT_EMAIL,
    SITE_URL,
  ].join("\n");

  const html = [
    `<p>Hi ${escapeHtml(booking.name)},</p>`,
    "<p>Your discovery call with Clarteon is booked.</p>",
    "<p>",
    `<strong>When:</strong> ${escapeHtml(times.visitor)}<br />`,
    `<strong>Clarteon time:</strong> ${escapeHtml(times.calendar)}`,
    "</p>",
    meetLink
      ? `<p><a href="${escapeHtml(meetLink)}">Join with Google Meet</a></p>`
      : "<p>The Google Meet link is in the calendar invitation.</p>",
    `<p>Google also sends a separate calendar invitation from ${CALENDAR_EMAIL} for the same call.</p>`,
    "<p>If you need to change the time, reply to this email.</p>",
    "<p>You received this because you booked a discovery call at clarteon.tech.</p>",
    "<p>Clarteon<br />",
    `${escapeHtml(CONTACT_EMAIL)}<br />`,
    `<a href="${SITE_URL}">${SITE_URL}</a></p>`,
  ].join("\n");

  return { subject, text, html };
}

export function buildBookingTeamEmail(booking: BookingRecord): EmailContent {
  const meetLink = safeMeetLink(booking.meetLink);
  const times = bookingTimes(booking);
  const subject = "New discovery call booked";

  const text = [
    "New discovery call booked",
    "",
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    `When: ${times.visitor}`,
    `Clarteon time: ${times.calendar}`,
    `Timezone: ${booking.timezone}`,
    "",
    "What they want to discuss:",
    bookingNotes(booking),
    "",
    meetLink ? `Google Meet: ${meetLink}` : "Google Meet link: not returned yet",
    booking.calendarLink ? `Calendar event: ${booking.calendarLink}` : "",
    "",
    `Booking ID: ${booking.requestId}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = [
    "<h1>New discovery call booked</h1>",
    "<p>",
    `<strong>Name:</strong> ${escapeHtml(booking.name)}<br />`,
    `<strong>Email:</strong> ${escapeHtml(booking.email)}<br />`,
    `<strong>When:</strong> ${escapeHtml(times.visitor)}<br />`,
    `<strong>Clarteon time:</strong> ${escapeHtml(times.calendar)}<br />`,
    `<strong>Timezone:</strong> ${escapeHtml(booking.timezone)}`,
    "</p>",
    "<p><strong>What they want to discuss:</strong></p>",
    `<p>${escapeHtml(bookingNotes(booking)).replaceAll("\n", "<br />")}</p>`,
    meetLink
      ? `<p><a href="${escapeHtml(meetLink)}">Open the Google Meet room</a></p>`
      : "<p>The Google Meet link was not returned yet.</p>",
    booking.calendarLink
      ? `<p><a href="${escapeHtml(booking.calendarLink)}">Open the calendar event</a></p>`
      : "",
    `<p><strong>Booking ID:</strong> ${escapeHtml(booking.requestId)}</p>`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, text, html };
}

export function buildBookingFailureAlert(bookingId: string, failures: string[]): EmailContent {
  const summary = failures.join(", ");
  const subject = "Clarteon booking email failure";
  const text = [
    "A discovery call was booked, but at least one email could not be sent.",
    "",
    `Booking ID: ${bookingId}`,
    `Failed sends: ${summary}`,
    "",
    "No personal data is included in this alert. Open the booking record to follow up.",
  ].join("\n");

  const html = [
    "<h1>Booking email failure</h1>",
    "<p>A discovery call was booked, but at least one email could not be sent.</p>",
    `<p><strong>Booking ID:</strong> ${escapeHtml(bookingId)}<br />`,
    `<strong>Failed sends:</strong> ${escapeHtml(summary)}</p>`,
    "<p>No personal data is included in this alert. Open the booking record to follow up.</p>",
  ].join("\n");

  return { subject, text, html };
}
