/** A cheap, provider-independent estimate. Good enough for budgeting, not billing. */
export function estimateTokens(value: unknown): number {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return Math.max(1, Math.ceil((text?.length ?? 0) / 4));
}
