import "server-only";
import { getConfig } from "@/lib/config";
import { sendEmail } from "@/lib/email/resend";
import { logServerEvent } from "@/lib/log";

export type AlertKind =
  "lead_save_failed" | "lead_store_unavailable" | "booking_failed" | "usage_threshold";

export type AlertFields = Record<string, string | number | boolean>;

const ALERT_COOLDOWN_MS = 30 * 60 * 1_000;
const safeValue = /^[A-Za-z0-9_.:-]{1,80}$/;

const summaries: Record<AlertKind, string> = {
  lead_save_failed: "A project brief could not be saved to the lead database.",
  lead_store_unavailable: "The lead database is not configured or unreachable.",
  booking_failed: "A discovery-call booking failed.",
  usage_threshold: "A daily usage threshold was passed.",
};

/** Keep only ids, codes and counts. Anything that could be visitor text is dropped. */
export function sanitizeAlertFields(fields: AlertFields): AlertFields {
  return Object.fromEntries(
    Object.entries(fields).filter(
      ([key, value]) => safeValue.test(key) && (typeof value !== "string" || safeValue.test(value)),
    ),
  );
}

/**
 * Email the team about an operational failure. Never throws. One email per kind
 * per 30-minute window: the bucketed idempotency key lets Resend drop repeats
 * across server instances.
 */
export async function alertTeam(
  kind: AlertKind,
  fields: AlertFields = {},
  now = Date.now(),
): Promise<boolean> {
  const safe = sanitizeAlertFields(fields);
  const to = (() => {
    try {
      return getConfig().TEAM_ALERT_EMAIL;
    } catch {
      return undefined;
    }
  })();

  if (!to) {
    logServerEvent("alert_not_configured", { kind });
    return false;
  }

  const bucket = Math.floor(now / ALERT_COOLDOWN_MS);
  const lines = Object.entries(safe).map(([key, value]) => `${key}: ${value}`);
  const text = [summaries[kind], "", ...lines, "", "Check the server logs for this event."].join(
    "\n",
  );

  try {
    await sendEmail(
      {
        to,
        subject: `[Clarteon alert] ${kind}`,
        text,
        html: `<pre>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`,
        idempotencyKey: `alert-${kind}-${bucket}`,
      },
      { maxAttempts: 2 },
    );
    logServerEvent("alert_sent", { kind });
    return true;
  } catch {
    logServerEvent("alert_failed", { kind });
    return false;
  }
}

const usage = new Map<string, { day: string; count: number; alerted: boolean }>();

/**
 * Count a unit of daily usage and alert once when it passes the threshold.
 * shortcut: counts per server instance, so it under-counts across instances;
 * move to the shared store planned for rate limits in P6.
 */
export function recordUsage(metric: string, threshold: number, now = new Date()): number {
  const day = now.toISOString().slice(0, 10);
  const current = usage.get(metric);
  const entry = current?.day === day ? current : { day, count: 0, alerted: false };
  entry.count += 1;
  usage.set(metric, entry);

  if (!entry.alerted && entry.count >= threshold) {
    entry.alerted = true;
    void alertTeam("usage_threshold", { metric, count: entry.count, threshold, day });
  }
  return entry.count;
}

export function resetUsageForTests(): void {
  usage.clear();
}
