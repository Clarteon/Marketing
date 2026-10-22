const MAX_QUESTION_CHARS = 500;

/**
 * Keep the shape of an unanswered question without storing contact details.
 * The review queue needs enough context to write an answer, not the visitor's
 * identity. This is deliberately conservative and runs before any database
 * call.
 */
export function redactQuestion(value: string): string {
  const redacted = value
    .replace(/\u0000/g, " ")
    .replace(/\bhttps?:\/\/\S+/gi, "[link]")
    .replace(/\bwww\.\S+/gi, "[link]")
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, "[email]")
    .replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, "[number]")
    .replace(/\b\d{6,}\b/g, "[number]")
    .replace(/\s+/g, " ")
    .trim();

  if (redacted.length <= MAX_QUESTION_CHARS) return redacted;

  const cut = redacted.slice(0, MAX_QUESTION_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > MAX_QUESTION_CHARS * 0.5 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export function isUsefulQuestion(value: string): boolean {
  return /[a-z]/i.test(value) && value.trim().length >= 8;
}
