import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetConfigForTests } from "@/lib/config";
import { EmailSendError } from "@/lib/email/errors";
import { sendBookingEmails } from "@/lib/booking/send-booking-emails";
import type { BookingRecord } from "@/lib/booking/types";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/email/resend", () => ({
  sendEmail: mocks.sendEmail,
}));

const booking: BookingRecord = {
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  slotStart: new Date("2026-10-20T01:00:00.000Z"),
  slotEnd: new Date("2026-10-20T01:30:00.000Z"),
  name: "Ada Lovelace",
  email: "ada@example.com",
  notes: "Manual reporting takes too long.",
  timezone: "Asia/Manila",
  status: "confirmed",
  googleEventId: "event-1",
  meetLink: "https://meet.google.com/abc-defg-hij",
  calendarLink: "https://calendar.google.com/event?eid=x",
  createdAt: new Date("2026-10-19T00:00:00.000Z"),
  confirmedAt: new Date("2026-10-19T00:05:00.000Z"),
};

describe("booking email orchestration", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Clarteon <info@clarteon.tech>";
    process.env.EMAIL_REPLY_TO = "info@clarteon.tech";
    process.env.TEAM_ALERT_EMAIL = "team@example.com";
    resetConfigForTests();

    mocks.sendEmail.mockReset();
    mocks.sendEmail.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the visitor confirmation and the team alert", async () => {
    const result = await sendBookingEmails(booking);

    expect(result).toEqual({ visitor: true, team: true });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);

    const visitorMessage = mocks.sendEmail.mock.calls[0][0];
    expect(visitorMessage.to).toBe("ada@example.com");
    expect(visitorMessage.idempotencyKey).toBe(`booking-visitor-${booking.requestId}`);
    expect(visitorMessage.text).toContain("https://meet.google.com/abc-defg-hij");
    expect(visitorMessage.text).toContain("admin@clarteon.tech");
    expect(visitorMessage.text).toContain("You received this because you booked a discovery call");

    const teamMessage = mocks.sendEmail.mock.calls[1][0];
    expect(teamMessage.to).toBe("team@example.com");
    expect(teamMessage.idempotencyKey).toBe(`booking-team-${booking.requestId}`);
    expect(teamMessage.text).toContain("Ada Lovelace");
  });

  it("reports a failed visitor email and still sends the team alert", async () => {
    mocks.sendEmail
      .mockRejectedValueOnce(new EmailSendError("http_500"))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const result = await sendBookingEmails(booking);

    expect(result).toEqual({ visitor: false, team: true });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(3);
    expect(mocks.sendEmail.mock.calls[2][0].subject).toContain("failure");
  });
});
