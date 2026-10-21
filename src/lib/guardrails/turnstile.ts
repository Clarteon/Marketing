import "server-only";
import { TURNSTILE_ACTION } from "@/lib/leads/constants";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyResponse {
  success?: boolean;
  action?: string;
  "error-codes"?: string[];
}

export class TurnstileUnavailableError extends Error {
  constructor(message = "The bot check is not available right now.") {
    super(message);
    this.name = "TurnstileUnavailableError";
  }
}

export async function verifyTurnstile(
  token: string,
  remoteIp: string,
  secret: string,
  expectedAction = TURNSTILE_ACTION,
): Promise<boolean> {
  if (!secret) throw new TurnstileUnavailableError("Turnstile is not configured.");

  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp && remoteIp !== "unknown") form.set("remoteip", remoteIp);

  let response: Response;
  try {
    response = await fetch(VERIFY_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new TurnstileUnavailableError();
  }

  if (!response.ok) throw new TurnstileUnavailableError();

  let result: SiteverifyResponse;
  try {
    result = (await response.json()) as SiteverifyResponse;
  } catch {
    throw new TurnstileUnavailableError();
  }

  return (
    result.success === true && (result.action === undefined || result.action === expectedAction)
  );
}
