const WORDS_PER_MINUTE = 220;

export function countWords(markdown: string): number {
  const plain = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>#~|-]/g, " ")
    .trim();

  if (!plain) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

export function estimateReadingMinutes(markdown: string): number {
  const words = countWords(markdown);
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function formatReadingTime(markdown: string): string {
  const minutes = estimateReadingMinutes(markdown);
  return `${minutes} min read`;
}
