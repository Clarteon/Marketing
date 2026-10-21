import "server-only";
import { getConfig } from "@/lib/config";
import { logServerEvent } from "@/lib/log";
import type { EmailKind, Lead, LeadStore } from "@/lib/leads/store";
import { EmailNotConfiguredError, EmailSendError } from "./errors";
import { sendEmail } from "./resend";
import { buildFailureAlert, buildTeamAlert, buildVisitorReceipt } from "./templates";

export interface LeadEmailResult {
  team: boolean;
  receipt: boolean;
}

function errorCode(error: unknown): string {
  if (error instanceof EmailSendError) return error.code;
  if (error instanceof EmailNotConfiguredError) return "not_configured";
  return "unknown";
}

async function markEmailState(
  store: LeadStore | undefined,
  leadId: string,
  kind: EmailKind,
  failureCode: string | null,
): Promise<void> {
  if (!store) return;

  try {
    if (failureCode) {
      await store.markEmailFailure(leadId, `${kind}_${failureCode}`);
      return;
    }
    await store.markEmailSent(leadId, kind);
  } catch {
    console.error(JSON.stringify({ event: "lead_email_state_update_failed", leadId, kind }));
  }
}

export async function sendLeadEmails(lead: Lead, store?: LeadStore): Promise<LeadEmailResult> {
  const config = getConfig();
  const teamInbox = config.TEAM_ALERT_EMAIL;

  if (!config.RESEND_API_KEY || !config.EMAIL_FROM || !config.EMAIL_REPLY_TO || !teamInbox) {
    throw new EmailNotConfiguredError();
  }

  const result: LeadEmailResult = { team: false, receipt: false };
  const failures: string[] = [];

  const teamMessage = buildTeamAlert(lead);
  try {
    await sendEmail({
      ...teamMessage,
      to: teamInbox,
      idempotencyKey: `lead-team-${lead.id}`,
    });
    result.team = true;
    await markEmailState(store, lead.id, "team", null);
  } catch (error) {
    const code = errorCode(error);
    failures.push(`team:${code}`);
    await markEmailState(store, lead.id, "team", code);
  }

  const receiptMessage = buildVisitorReceipt(lead);
  try {
    await sendEmail({
      ...receiptMessage,
      to: lead.email,
      idempotencyKey: `lead-receipt-${lead.id}`,
    });
    result.receipt = true;
    await markEmailState(store, lead.id, "receipt", null);
  } catch (error) {
    const code = errorCode(error);
    failures.push(`receipt:${code}`);
    await markEmailState(store, lead.id, "receipt", code);
  }

  if (failures.length > 0) {
    logServerEvent("lead_email_delivery_failed", {
      leadId: lead.id,
      failures: failures.join(","),
    });

    const failureMessage = buildFailureAlert(lead.id, failures);
    try {
      await sendEmail({
        ...failureMessage,
        to: teamInbox,
        idempotencyKey: `lead-failure-${lead.id}-${failures.join("-")}`,
      });
    } catch {
      console.error(JSON.stringify({ event: "lead_failure_alert_failed", leadId: lead.id }));
    }
  }

  return result;
}
