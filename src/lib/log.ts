import "server-only";

/**
 * Structured server logging. Never pass names, emails, messages, tokens or any
 * other visitor data in the fields.
 */
export function logServerEvent(
  event: string,
  fields: Record<string, string | number | boolean> = {},
): void {
  console.error(JSON.stringify({ event, ...fields, timestamp: new Date().toISOString() }));
}

const loggedFallbacks = new Set<string>();

function isExpectedPublicDbFallback(error: unknown): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  const message = error instanceof Error ? error.message : String(error);
  return code === "42P01" || /does not exist/i.test(message);
}

export function logPublicFallback(event: string, error: unknown): void {
  const code = error instanceof Error ? error.name : "unknown";
  if (isExpectedPublicDbFallback(error)) {
    if (loggedFallbacks.has(event)) return;
    loggedFallbacks.add(event);
    console.info(
      JSON.stringify({ event, code, mode: "fallback", timestamp: new Date().toISOString() }),
    );
    return;
  }
  logServerEvent(event, { code });
}
