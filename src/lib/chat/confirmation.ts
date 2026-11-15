import "server-only";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { decodeSlotId, validateSlot } from "@/lib/booking/slots";
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
const bookingOfferSchema = z.object({
  sid: z.uuid(),
  exp: z.number(),
  timezone: availabilityArgsSchema.shape.timezone,
  slots: z.array(bookCallArgsSchema.shape.slot_id).max(3),
});
const CONFIRMATION_TTL_MS = 10 * 60_000;
export type ConfirmedAction = z.infer<typeof payloadSchema>;
export interface ActionConfirmation {
  token: string;
  description: string;
  action: ActionName;
}

type TokenPurpose = "confirmation" | "booking-offer";

function signature(payload: string, secret: string, purpose: TokenPurpose): string {
  return createHmac("sha256", secret).update(`clara:${purpose}:v1:${payload}`).digest("base64url");
}

function signPayload(value: object, secret: string, purpose: TokenPurpose): string {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${signature(payload, secret, purpose)}`;
}

function readPayload(token: string, secret: string, purpose: TokenPurpose): unknown {
  const [payload, signed, extra] = token.split(".");
  if (
    !payload ||
    !signed ||
    extra !== undefined ||
    !secretsMatch(signed, signature(payload, secret, purpose))
  )
    return;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return;
  }
}

function isCurrentToken(value: { sid: string; exp: number }, sid: string, now: number): boolean {
  return value.sid === sid && value.exp > now && value.exp <= now + CONFIRMATION_TTL_MS;
}

export function signBookingOffer(
  sid: string,
  timezone: string,
  slots: string[],
  secret: string,
  now: number,
): string {
  return signPayload(
    { sid, timezone, slots, exp: now + CONFIRMATION_TTL_MS },
    secret,
    "booking-offer",
  );
}

export function matchesBookingOffer(
  token: string,
  sid: string,
  timezone: string,
  slotId: string,
  secret: string,
  now: number,
): boolean {
  const offer = bookingOfferSchema.safeParse(readPayload(token, secret, "booking-offer"));
  return (
    offer.success &&
    isCurrentToken(offer.data, sid, now) &&
    offer.data.timezone === timezone &&
    offer.data.slots.includes(slotId)
  );
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
      validateSlot(slot, new Date(now));
      description = `Book a discovery call\n${formatSlotDateTime(slot.start.toISOString(), input.timezone)} (${input.timezone})\nName: ${args.name}\nEmail: ${args.email}${args.notes ? `\nNotes: ${args.notes}` : ""}`;
      break;
    }
    case "save_lead":
      description = `Save these details and send the lead notifications\nName: ${args.name}\nEmail: ${args.email}\nCompany: ${args.company || "Not provided"}\nProblem: ${args.problem_summary || "Not provided"}\nTeam size: ${args.team_size || "Not provided"}\nTools: ${args.tools || "Not provided"}\nUrgency: ${args.urgency || "Not provided"}`;
      break;
    case "send_solution_brief":
      description = `Email this summary to ${args.email} and notify the Clarteon team\n\n${args.summary}`;
      break;
    case "handoff_to_team":
      description = `Send this question to the Clarteon team for an email reply\nReply email: ${args.contact}\nQuestion or problem: ${args.reason}`;
      break;
  }
  const token = signPayload(
    { ...input, args, exp: now + CONFIRMATION_TTL_MS },
    secret,
    "confirmation",
  );
  return { token, description, action: input.action };
}

export function readConfirmedAction(
  token: string,
  sid: string,
  secret: string,
  now = Date.now(),
): ConfirmedAction | undefined {
  try {
    const result = payloadSchema.parse(readPayload(token, secret, "confirmation"));
    if (!isCurrentToken(result, sid, now)) return;
    result.args = actionSchemas[result.action].parse(result.args) as Record<string, unknown>;
    return result;
  } catch {
    return;
  }
}

export function actionReply(action: ActionName, result: Record<string, unknown>): string {
  if (!result.ok) {
    if (action !== "book_call") {
      return "That action did not complete. Please try again or contact info@clarteon.tech.";
    }
    if (result.error === "slot_unavailable") {
      return Array.isArray(result.slots) && result.slots.length
        ? "That time is no longer available. Pick another time below."
        : "That time is no longer available. [See more times](/contact#book) or [email the team](mailto:info@clarteon.tech).";
    }
    if (result.error === "booking_failed" || result.error === "calendar_unavailable") {
      return "I couldn’t confirm your call. You can retry this booking or [email the team](mailto:info@clarteon.tech).";
    }
    return "I couldn’t confirm your call. [Email the team](mailto:info@clarteon.tech) to arrange a time.";
  }
  switch (action) {
    case "book_call":
      return `Your discovery call is confirmed${result.label ? ` for **${result.label}**` : ""}.${typeof result.meet_link === "string" && result.meet_link.startsWith("https://meet.google.com/") ? `\n\n[Join with Google Meet](${result.meet_link})` : ""}\n\n${result.confirmation_email_sent ? "The confirmation email was sent." : "The confirmation email was not sent; please keep these meeting details."}`;
    case "save_lead":
      return `Your details were saved.${result.team_notified ? " The team was notified." : " The team notification did not send."}`;
    case "send_solution_brief":
      return `Your summary email was sent.${result.team_notified ? " The team was notified." : " The team notification did not send."}`;
    case "handoff_to_team":
      return "I’ve sent your question to the Clarteon team. A team member will follow up by email.";
  }
}
