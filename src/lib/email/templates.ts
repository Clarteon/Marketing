import { teamSizeLabels } from "@/lib/leads/constants";
import type { Lead } from "@/lib/leads/store";

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function withLineBreaks(value: string): string {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function teamSizeText(lead: Lead): string {
  return lead.teamSize ? teamSizeLabels[lead.teamSize] : "Not provided";
}

export function buildTeamAlert(lead: Lead): EmailContent {
  const subject = "New project brief from the Clarteon website";
  const text = [
    "New project brief",
    "",
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Company: ${lead.company ?? "Not provided"}`,
    `Team size: ${teamSizeText(lead)}`,
    "",
    "What is slowing them down:",
    lead.need,
    "",
    `Source: ${lead.source}`,
    `Submitted: ${lead.createdAt.toISOString()}`,
    `Lead ID: ${lead.id}`,
  ].join("\n");

  const html = [
    "<h1>New project brief</h1>",
    "<p>",
    `<strong>Name:</strong> ${escapeHtml(lead.name)}<br />`,
    `<strong>Email:</strong> ${escapeHtml(lead.email)}<br />`,
    `<strong>Company:</strong> ${escapeHtml(lead.company ?? "Not provided")}<br />`,
    `<strong>Team size:</strong> ${escapeHtml(teamSizeText(lead))}`,
    "</p>",
    "<p><strong>What is slowing them down:</strong></p>",
    `<p>${withLineBreaks(lead.need)}</p>`,
    "<p>",
    `<strong>Source:</strong> ${escapeHtml(lead.source)}<br />`,
    `<strong>Submitted:</strong> ${escapeHtml(lead.createdAt.toISOString())}<br />`,
    `<strong>Lead ID:</strong> ${escapeHtml(lead.id)}`,
    "</p>",
  ].join("\n");

  return { subject, text, html };
}

export function buildVisitorReceipt(lead: Lead): EmailContent {
  const subject = "We received your project brief";
  const text = [
    `Hi ${lead.name},`,
    "",
    "Thanks for telling us what is slowing you down. A person on the Clarteon team will read your project brief and reply to this email.",
    "",
    "If you want to add anything, reply to this message.",
    "",
    "Clarteon",
  ].join("\n");

  const html = [
    `<p>Hi ${escapeHtml(lead.name)},</p>`,
    "<p>Thanks for telling us what is slowing you down. A person on the Clarteon team will read your project brief and reply to this email.</p>",
    "<p>If you want to add anything, reply to this message.</p>",
    "<p>Clarteon</p>",
  ].join("\n");

  return { subject, text, html };
}

export function buildFailureAlert(leadId: string, failures: string[]): EmailContent {
  const subject = "Clarteon lead email failure";
  const summary = failures.join(", ");
  const text = [
    "A project brief was saved, but at least one email could not be sent.",
    "",
    `Lead ID: ${leadId}`,
    `Failed sends: ${summary}`,
    "",
    "No personal data is included in this alert. Open the lead record to follow up.",
  ].join("\n");

  const html = [
    "<h1>Lead email failure</h1>",
    "<p>A project brief was saved, but at least one email could not be sent.</p>",
    `<p><strong>Lead ID:</strong> ${escapeHtml(leadId)}<br />`,
    `<strong>Failed sends:</strong> ${escapeHtml(summary)}</p>`,
    "<p>No personal data is included in this alert. Open the lead record to follow up.</p>",
  ].join("\n");

  return { subject, text, html };
}
