import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetConfigForTests } from "@/lib/config";
import { EmailNotConfiguredError, EmailSendError } from "@/lib/email/errors";
import { sendLeadEmails } from "@/lib/email/send-lead-emails";
import type { Lead, LeadStore } from "@/lib/leads/store";

const emailMocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/email/resend", () => ({
  sendEmail: emailMocks.sendEmail,
}));

const lead: Lead = {
  id: "lead-1",
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  name: "Ada Lovelace",
  email: "ada@example.com",
  need: "Manual reporting takes too long every week.",
  teamSize: "2-10",
  source: "website-form",
  createdAt: new Date("2026-10-20T12:00:00.000Z"),
};

function fakeStore(): LeadStore {
  return {
    save: vi.fn(),
    markEmailSent: vi.fn().mockResolvedValue(undefined),
    markEmailFailure: vi.fn().mockResolvedValue(undefined),
  };
}

describe("lead email orchestration", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "hello@clarteon.test";
    process.env.EMAIL_REPLY_TO = "team@clarteon.test";
    process.env.TEAM_ALERT_EMAIL = "team@clarteon.test";
    resetConfigForTests();
    emailMocks.sendEmail.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the lead and records a failure when the receipt fails", async () => {
    emailMocks.sendEmail.mockImplementation(async (message: { idempotencyKey: string }) => {
      if (message.idempotencyKey.includes("receipt")) {
        throw new EmailSendError("http_500");
      }
    });
    const store = fakeStore();

    const result = await sendLeadEmails(lead, store);

    expect(result).toEqual({ team: true, receipt: false });
    expect(store.markEmailSent).toHaveBeenCalledWith("lead-1", "team");
    expect(store.markEmailFailure).toHaveBeenCalledWith("lead-1", "receipt_http_500");
    expect(emailMocks.sendEmail).toHaveBeenCalledTimes(3);
    expect(emailMocks.sendEmail.mock.calls[2][0].idempotencyKey).toContain("lead-failure-lead-1");
  });

  it("can send both messages without a database for the email-only fallback", async () => {
    emailMocks.sendEmail.mockResolvedValue(undefined);

    const result = await sendLeadEmails(lead);

    expect(result).toEqual({ team: true, receipt: true });
    expect(emailMocks.sendEmail).toHaveBeenCalledTimes(2);
  });

  it("fails before sending when email settings are missing", async () => {
    delete process.env.TEAM_ALERT_EMAIL;
    resetConfigForTests();

    await expect(sendLeadEmails(lead, fakeStore())).rejects.toBeInstanceOf(EmailNotConfiguredError);
    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
  });
});
