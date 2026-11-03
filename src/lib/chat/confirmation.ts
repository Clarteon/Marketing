import "server-only";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { decodeSlotId } from "@/lib/booking/slots";
import { formatSlotDateTime } from "@/lib/booking/format";
import { secretsMatch } from "@/lib/security/secrets";
import {
  availabilityArgsSchema,
  bookCallArgsSchema,
  handoffArgsSchema,
  saveLeadArgsSchema,
  solutionBriefArgsSchema,
} from "./schema";

export const actionSchemas = {
  save_lead: saveLeadArgsSchema,
  book_call: bookCallArgsSchema,
  send_solution_brief: solutionBriefArgsSchema,
  handoff_to_team: handoffArgsSchema,
};
export type ActionName = keyof typeof actionSchemas;
export function isAction(name: string): name is ActionName {
  return Object.hasOwn(actionSchemas, name);
}

export function hasSensitiveContent(value: unknown): boolean {
  return /\b(password|passcode|pin|otp|one[- ]time code)\s*(?:is|:|=)\s*\S+|\b(credit card|card number|cvv|cvc|ssn|social security|bank account|routing number)\b|\b(?:\d[ -]?){13,19}\b/i.test(
    JSON.stringify(value),
  );
}

const payloadSchema = z.object({
  sid: z.uuid(),
  exp: z.number(),
  action: z.enum(["save_lead", "book_call", "send_solution_brief", "handoff_to_team"]),
  args: z.record(z.string(), z.unknown()),
  timezone: availabilityArgsSchema.shape.timezone.optional(),
});
export type ConfirmedAction = z.infer<typeof payloadSchema>;
export interface ActionConfirmation {
  token: string;
  description: string;
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`clara:confirmation:v1:${payload}`)
    .digest("base64url");
}

export function proposeAction(
  input: Omit<ConfirmedAction, "exp">,
  secret: string,
  now = Date.now(),
): ActionConfirmation {
  const parsed = actionSchemas[input.action].parse(input.args);
  if (hasSensitiveContent(parsed)) throw new Error("sensitive_action");
  const args = parsed as Record<string, unknown>;
  let description: string;
  switch (input.action) {
    case "book_call": {
      if (!input.timezone) throw new Error("timezone_required");
      const slot = decodeSlotId(String(args.slot_id));
      description = `Book a discovery call\n${formatSlotDateTime(slot.start.toISOString(), input.timezone)} (${input.timezone})\nName: ${args.name}\nEmail: ${args.email}\nNotes: ${args.notes || "None"}`;
      break;
    }
    case "save_lead":
      description = `Save these details and send the lead notifications\nName: ${args.name}\nEmail: ${args.email}\nCompany: ${args.company || "Not provided"}\nProblem: ${args.problem_summary || "Not provided"}\nTeam size: ${args.team_size || "Not provided"}\nTools: ${args.tools || "Not provided"}\nUrgency: ${args.urgency || "Not provided"}`;
      break;
    case "send_solution_brief":
      description = `Email this summary to ${args.email} and notify the Clarteon team\n\n${args.summary}`;
      break;
    case "handoff_to_team":
      description = `Send this request to the Clarteon team\nContact: ${args.contact || "Not provided"}\n\n${args.reason}`;
      break;
  }
  const payload = Buffer.from(JSON.stringify({ ...input, args, exp: now + 10 * 60_000 })).toString(
    "base64url",
  );
  return { token: `${payload}.${signature(payload, secret)}`, description };
}

export function readConfirmedAction(
  token: string,
  sid: string,
  secret: string,
  now = Date.now(),
): ConfirmedAction | undefined {
  const [payload, signed, extra] = token.split(".");
  if (!payload || !signed || extra || !secretsMatch(signed, signature(payload, secret))) return;
  try {
    const result = payloadSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString()));
    if (result.sid !== sid || result.exp <= now || result.exp > now + 10 * 60_000) return;
    result.args = actionSchemas[result.action].parse(result.args) as Record<string, unknown>;
    return result;
  } catch {
    return;
  }
}

export function actionReply(action: ActionName, result: Record<string, unknown>): string {
  if (!result.ok)
    return result.error === "slot_unavailable"
      ? "That time is no longer available. Please ask me to check fresh times; nothing was confirmed."
      : "That action did not complete. Please try again or contact info@clarteon.tech.";
  switch (action) {
    case "book_call":
      return `Your discovery call is confirmed${result.label ? ` for **${result.label}**` : ""}.${typeof result.meet_link === "string" && result.meet_link.startsWith("https://meet.google.com/") ? `\n\n[Join with Google Meet](${result.meet_link})` : ""}\n\n${result.confirmation_email_sent ? "The confirmation email was sent." : "The confirmation email was not sent; please keep these meeting details."}`;
    case "save_lead":
      return `Your details were saved.${result.team_notified ? " The team was notified." : " The team notification did not send."}`;
    case "send_solution_brief":
      return `Your summary email was sent.${result.team_notified ? " The team was notified." : " The team notification did not send."}`;
    case "handoff_to_team":
      return "Your request was sent to the Clarteon team.";
  }
}
