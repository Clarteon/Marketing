import "server-only";
import { getSiteUrl } from "@/lib/site";

/**
 * Browsers send Origin on cross-origin and same-origin POST requests. Require
 * it to match the site or the deployment serving the request.
 */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originValue: string;
  try {
    originValue = new URL(origin).origin;
  } catch {
    return false;
  }

  const allowed = new Set<string>();

  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    // A malformed request URL cannot be allowed.
  }

  try {
    allowed.add(new URL(getSiteUrl()).origin);
  } catch {
    // The environment is validated elsewhere; do not widen the allowlist.
  }

  return allowed.has(originValue);
}
