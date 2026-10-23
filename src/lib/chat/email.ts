import { escapeHtml, type EmailContent } from "@/lib/email/templates";
import { site } from "@/lib/site";

export interface SolutionBriefEmailInput {
  email: string;
  summary: string;
  reference: string;
}

const DISCLAIMER =
  "This summary was prepared by Clara, Clarteon's AI assistant. It is not a quote, a commitment or a guarantee. A person from the team will confirm anything you decide to take forward.";

export function buildSolutionBriefVisitorEmail({ summary }: SolutionBriefEmailInput): EmailContent {
  const text = [
    "Your summary from Clara at Clarteon",
    "",
    summary,
    "",
    DISCLAIMER,
    "",
    `Reply to this email or write to ${site.email} if anything is missing.`,
  ].join("\n");

  const html = [
    "<p>Your summary from Clara at Clarteon</p>",
    `<p>${escapeHtml(summary).replaceAll("\n", "<br />")}</p>`,
    `<p>${escapeHtml(DISCLAIMER)}</p>`,
    `<p>Reply to this email or write to <a href="mailto:${site.email}">${site.email}</a> if anything is missing.</p>`,
  ].join("");

  return { subject: "Your summary from Clara at Clarteon", text, html };
}

export function buildSolutionBriefTeamEmail({
  email,
  summary,
  reference,
}: SolutionBriefEmailInput): EmailContent {
  const text = [
    "Clara sent a solution brief",
    "",
    `Visitor email: ${email}`,
    `Reference: ${reference}`,
    "",
    "Summary:",
    summary,
    "",
    DISCLAIMER,
  ].join("\n");

  const html = [
    "<p>Clara sent a solution brief</p>",
    `<p>Visitor email: ${escapeHtml(email)}<br />Reference: ${escapeHtml(reference)}</p>`,
    `<p><strong>Summary</strong><br />${escapeHtml(summary).replaceAll("\n", "<br />")}</p>`,
    `<p>${escapeHtml(DISCLAIMER)}</p>`,
  ].join("");

  return { subject: "Clara sent a solution brief", text, html };
}

export interface HandoffEmailInput {
  reason: string;
  contact?: string;
  reference: string;
}

export function buildHandoffTeamEmail({
  reason,
  contact,
  reference,
}: HandoffEmailInput): EmailContent {
  const text = [
    "Clara is asking for a person",
    "",
    `Reason: ${reason}`,
    `Contact: ${contact?.trim() || "Not provided in chat"}`,
    `Reference: ${reference}`,
    "",
    "Reply using only the contact details the visitor chose to share.",
  ].join("\n");

  const html = [
    "<p>Clara is asking for a person</p>",
    `<p><strong>Reason</strong><br />${escapeHtml(reason).replaceAll("\n", "<br />")}</p>`,
    `<p><strong>Contact</strong><br />${escapeHtml(contact?.trim() || "Not provided in chat")}</p>`,
    `<p>Reference: ${escapeHtml(reference)}</p>`,
    "<p>Reply using only the contact details the visitor chose to share.</p>",
  ].join("");

  return { subject: "Clara handoff request", text, html };
}
