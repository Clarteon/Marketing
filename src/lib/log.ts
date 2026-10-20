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
