import { describe, expect, it, vi } from "vitest";
import { sendTestAlert } from "../scripts/lib/test-alert.mjs";

const env = {
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "Clarteon <info@example.com>",
  EMAIL_REPLY_TO: "info@example.com",
  TEAM_ALERT_EMAIL: "team@example.com",
};
const now = new Date("2026-10-21T12:00:00.000Z");

describe("sendTestAlert", () => {
  it("sends one alert-format email to the team address", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: "email-1" })));

    const result = await sendTestAlert(env, { fetchImpl, now });

    expect(result).toEqual({ ok: true, id: "email-1" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      from: env.EMAIL_FROM,
      to: ["team@example.com"],
      subject: "[Clarteon alert] test",
      reply_to: env.EMAIL_REPLY_TO,
    });
    expect(body.text).toContain("sent_at: 2026-10-21T12:00:00.000Z");
  });

  it("does not call Resend when configuration is missing", async () => {
    const fetchImpl = vi.fn();

    const result = await sendTestAlert({ ...env, TEAM_ALERT_EMAIL: "" }, { fetchImpl, now });

    expect(result).toEqual({ ok: false, reason: "missing_env", missing: ["TEAM_ALERT_EMAIL"] });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports the HTTP status without the key or addresses", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 403 }));

    const result = await sendTestAlert(env, { fetchImpl, now });

    expect(result).toEqual({ ok: false, reason: "http_403" });
    expect(JSON.stringify(result)).not.toContain("re_test");
  });

  it("reports network failures", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    expect(await sendTestAlert(env, { fetchImpl, now })).toEqual({ ok: false, reason: "network" });
  });
});
