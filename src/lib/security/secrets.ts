import { createHash, timingSafeEqual } from "node:crypto";

/** Compare two strings without leaking their length or a prefix match. */
export function secretsMatch(input: string, expected: string): boolean {
  const inputHash = createHash("sha256").update(input).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(inputHash, expectedHash);
}
