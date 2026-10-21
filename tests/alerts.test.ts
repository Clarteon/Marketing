import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { alertTeam, recordUsage, resetUsageForTests, sanitizeAlertFields } from "@/lib/alerts";
import { resetConfigForTests } from "@/lib/config";

function ok(): Response {
  return { ok: true, status: 200, headers: new Headers() } as Response;
}

function sentBodies(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.map(([, init]) => ({
    body: JSON.parse((init as RequestInit).body as string),
    key: ((init as RequestInit).headers as Record<string, string>)["Idempotency-Key"],
  }));
}

describe("team alerts", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "hello@clarteon.test";
    process.env.EMAIL_REPLY_TO = "team@clarteon.test";
    process.env.TEAM_ALERT_EMAIL = "alerts@clarteon.test";
    process.env.EMAIL_DAILY_ALERT_THRESHOLD = "3";
    resetConfigForTests();
    resetUsageForTests();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.EMAIL_DAILY_ALERT_THRESHOLD;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("emails the team inbox for a failed booking, with codes only", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal("fetch", fetchMock);

    expect(await alertTeam("booking_failed", { code: "calendar_timeout" })).toBe(true);

    const [{ body }] = sentBodies(fetchMock);
    expect(body.to).toEqual(["alerts@clarteon.test"]);
    expect(body.subject).toBe("[Clarteon alert] booking_failed");
    expect(body.text).toContain("code: calendar_timeout");
  });

  it("uses one idempotency key per kind per 30 minutes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal("fetch", fetchMock);
    const t = Date.UTC(2026, 9, 21, 10, 0);

    await alertTeam("lead_save_failed", {}, t);
    await alertTeam("lead_save_failed", {}, t + 10 * 60_000);
    await alertTeam("lead_save_failed", {}, t + 31 * 60_000);

    const keys = sentBodies(fetchMock).map((call) => call.key);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it("drops anything that could be visitor text", () => {
    expect(
      sanitizeAlertFields({
        code: "http_500",
        email: "ada@example.com",
        message: "Please call me on 0917 123 4567",
        count: 3,
      }),
    ).toEqual({ code: "http_500", count: 3 });
  });

  it("never throws when the provider fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await alertTeam("lead_store_unavailable")).toBe(false);
  });

  it("does nothing without a team inbox", async () => {
    delete process.env.TEAM_ALERT_EMAIL;
    resetConfigForTests();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await alertTeam("booking_failed")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("alerts once when daily usage passes the threshold, and resets the next day", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal("fetch", fetchMock);
    const day = new Date("2026-10-21T08:00:00Z");

    recordUsage("email", 3, day);
    recordUsage("email", 3, day);
    expect(fetchMock).not.toHaveBeenCalled();
    recordUsage("email", 3, day);
    recordUsage("email", 3, day);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(sentBodies(fetchMock)[0].body.subject).toBe("[Clarteon alert] usage_threshold");

    expect(recordUsage("email", 3, new Date("2026-10-22T08:00:00Z"))).toBe(1);
  });
});
