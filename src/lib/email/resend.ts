import "server-only";
import { z } from "zod";
import { recordUsage } from "@/lib/alerts";
import { getConfig } from "@/lib/config";
import { EmailNotConfiguredError, EmailSendError } from "./errors";

const RESEND_URL = "https://api.resend.com/emails";
const recipientSchema = z.email();

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}

export interface SendEmailOptions {
  maxAttempts?: number;
  retryBaseMs?: number;
  timeoutMs?: number;
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelay(response: Response, fallbackMs: number): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1_000, 5_000);
  }
  return fallbackMs;
}

export async function sendEmail(
  message: OutboundEmail,
  options: SendEmailOptions = {},
): Promise<void> {
  const { maxAttempts = 3, retryBaseMs = 400, timeoutMs = 10_000 } = options;
  const config = getConfig();
  const apiKey = config.RESEND_API_KEY;
  const from = config.EMAIL_FROM;
  const replyTo = config.EMAIL_REPLY_TO;

  if (!apiKey || !from || !replyTo) throw new EmailNotConfiguredError();
  if (!recipientSchema.safeParse(message.to).success) {
    throw new EmailSendError("invalid_recipient");
  }

  const payload = {
    from,
    to: [message.to],
    subject: message.subject,
    text: message.text,
    html: message.html,
    reply_to: replyTo,
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      if (attempt >= maxAttempts) throw new EmailSendError("network");
      await delay(retryBaseMs * attempt);
      continue;
    }

    if (response.ok) {
      recordUsage("email", config.EMAIL_DAILY_ALERT_THRESHOLD);
      return;
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < maxAttempts) {
      await delay(retryDelay(response, retryBaseMs * attempt));
      continue;
    }

    throw new EmailSendError(`http_${response.status}`);
  }

  throw new EmailSendError("unknown");
}
