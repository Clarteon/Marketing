import "server-only";
import { getConfig } from "@/lib/config";
import { logServerEvent } from "@/lib/log";
import { EmailNotConfiguredError, EmailSendError } from "@/lib/email/errors";
import { sendEmail } from "@/lib/email/resend";
import {
  buildBookingFailureAlert,
  buildBookingTeamEmail,
  buildBookingVisitorEmail,
} from "./email-templates";
import type { BookingEmailResult, BookingRecord } from "./types";

function errorCode(error: unknown): string {
  if (error instanceof EmailSendError) return error.code;
  if (error instanceof EmailNotConfiguredError) return "not_configured";
  return "unknown";
}

export async function sendBookingEmails(booking: BookingRecord): Promise<BookingEmailResult> {
  const config = getConfig();
  const teamInbox = config.TEAM_ALERT_EMAIL;

  if (!config.RESEND_API_KEY || !config.EMAIL_FROM || !config.EMAIL_REPLY_TO || !teamInbox) {
    throw new EmailNotConfiguredError();
  }

  const result: BookingEmailResult = { visitor: false, team: false };
  const failures: string[] = [];

  const visitorMessage = buildBookingVisitorEmail(booking);
  try {
    await sendEmail({
      ...visitorMessage,
      to: booking.email,
      idempotencyKey: `booking-visitor-${booking.requestId}`,
    });
    result.visitor = true;
  } catch (error) {
    failures.push(`visitor:${errorCode(error)}`);
  }

  const teamMessage = buildBookingTeamEmail(booking);
  try {
    await sendEmail({
      ...teamMessage,
      to: teamInbox,
      idempotencyKey: `booking-team-${booking.requestId}`,
    });
    result.team = true;
  } catch (error) {
    failures.push(`team:${errorCode(error)}`);
  }

  if (failures.length > 0) {
    logServerEvent("booking_email_delivery_failed", {
      bookingId: booking.requestId,
      failures: failures.join(","),
    });

    const failureMessage = buildBookingFailureAlert(booking.requestId, failures);
    try {
      await sendEmail({
        ...failureMessage,
        to: teamInbox,
        idempotencyKey: `booking-failure-${booking.requestId}-${failures.join("-")}`,
      });
    } catch {
      logServerEvent("booking_failure_alert_failed", { bookingId: booking.requestId });
    }
  }

  return result;
}
