import type { KnowledgeChunk, KnowledgeFaq } from "./types";

function clean(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeUrl(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/contact#message";
}

/**
 * Approved FAQs live in Neon, not in a file, so they need the same chunk shape
 * as the generated content index. Keeping the conversion here means the search
 * layer does not care where a chunk came from.
 */
export function faqToChunk(faq: KnowledgeFaq): KnowledgeChunk {
  const title = clean(faq.title) || clean(faq.question) || "Approved answer";
  return {
    id: `faq-${faq.slug}`,
    url: safeUrl(faq.sourceUrl),
    title,
    headingPath: ["FAQs", title],
    text: clean(`${faq.question} ${faq.answer}`),
    tags: faq.tags.map(clean).filter(Boolean),
    synonyms: faq.synonyms.map(clean).filter(Boolean),
  };
}
