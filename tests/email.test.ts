import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetConfigForTests } from "@/lib/config";
import { EmailSendError } from "@/lib/email/errors";
import { sendEmail } from "@/lib/email/resend";

function response(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
  } as Response;
}

describe("Resend email sender", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "hello@clarteon.test";
    process.env.EMAIL_REPLY_TO = "team@clarteon.test";
    process.env.TEAM_ALERT_EMAIL = "team@clarteon.test";
    resetConfigForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends from the fixed sender to one visitor address", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200));
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({
      to: "ada@example.com",
      subject: "We received your project brief",
      text: "Hello",
      html: "<p>Hello</p>",
      idempotencyKey: "lead-receipt-lead-1",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const payload = JSON.parse(init.body);
    expect(payload.from).toBe("hello@clarteon.test");
    expect(payload.to).toEqual(["ada@example.com"]);
    expect(payload.reply_to).toBe("team@clarteon.test");
    expect(init.headers["Idempotency-Key"]).toBe("lead-receipt-lead-1");
  });

  it("retries a transient provider failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(500))
      .mockResolvedValueOnce(response(200));
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail(
      {
        to: "ada@example.com",
        subject: "Subject",
        text: "Text",
        html: "<p>Text</p>",
        idempotencyKey: "key",
      },
      { retryBaseMs: 0 },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a permanent provider rejection", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(422));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendEmail(
        {
          to: "ada@example.com",
          subject: "Subject",
          text: "Text",
          html: "<p>Text</p>",
          idempotencyKey: "key",
        },
        { retryBaseMs: 0 },
      ),
    ).rejects.toMatchObject({ code: "http_422" });

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects an address list before calling the provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendEmail({
        to: "ada@example.com, attacker@example.com",
        subject: "Subject",
        text: "Text",
        html: "<p>Text</p>",
        idempotencyKey: "key",
      }),
    ).rejects.toBeInstanceOf(EmailSendError);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
