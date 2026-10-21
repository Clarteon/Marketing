const RESEND_URL = "https://api.resend.com/emails";
const REQUIRED = ["RESEND_API_KEY", "EMAIL_FROM", "EMAIL_REPLY_TO", "TEAM_ALERT_EMAIL"];

/**
 * Send one test alert to TEAM_ALERT_EMAIL through Resend, in the same format as
 * alertTeam in src/lib/alerts.ts. Returns a result instead of throwing, and never
 * includes the key or addresses in it.
 */
export async function sendTestAlert(env, { fetchImpl = fetch, now = new Date() } = {}) {
  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length > 0) return { ok: false, reason: "missing_env", missing };

  const text = [
    "This is a test alert from npm run alert:test. No action is needed.",
    "",
    `sent_at: ${now.toISOString()}`,
    "",
    "Check the server logs for this event.",
  ].join("\n");

  let response;
  try {
    response = await fetchImpl(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `alert-test-${now.getTime()}`,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [env.TEAM_ALERT_EMAIL],
        subject: "[Clarteon alert] test",
        text,
        html: `<pre>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`,
        reply_to: env.EMAIL_REPLY_TO,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, reason: "network" };
  }

  if (!response.ok) return { ok: false, reason: `http_${response.status}` };
  const body = await response.json().catch(() => ({}));
  return { ok: true, id: typeof body.id === "string" ? body.id : undefined };
}
