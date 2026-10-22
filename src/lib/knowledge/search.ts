import type { KnowledgeChunk, KnowledgeSearchResult } from "./types";

/**
 * Small English/Filipino stopword list. Clara is asked to search in English
 * keywords, but visitors often type full English or Taglish questions.
 */
const STOPWORDS = new Set([
  "a",
  "about",
  "all",
  "also",
  "an",
  "and",
  "ang",
  "ano",
  "any",
  "are",
  "as",
  "at",
  "ay",
  "ba",
  "be",
  "bakit",
  "but",
  "by",
  "can",
  "could",
  "din",
  "do",
  "does",
  "for",
  "from",
  "get",
  "got",
  "have",
  "help",
  "hindi",
  "how",
  "i",
  "if",
  "ikaw",
  "in",
  "into",
  "is",
  "it",
  "ito",
  "iyon",
  "ka",
  "kailan",
  "kami",
  "kayo",
  "ko",
  "know",
  "kung",
  "lang",
  "like",
  "ma",
  "magkano",
  "many",
  "may",
  "me",
  "might",
  "mga",
  "mo",
  "more",
  "most",
  "much",
  "my",
  "na",
  "namin",
  "nang",
  "natin",
  "need",
  "ng",
  "ni",
  "ninyo",
  "no",
  "not",
  "of",
  "ok",
  "okay",
  "on",
  "oo",
  "or",
  "our",
  "pa",
  "paano",
  "para",
  "please",
  "po",
  "rin",
  "sa",
  "saan",
  "salamat",
  "say",
  "should",
  "si",
  "sila",
  "sino",
  "so",
  "some",
  "tayo",
  "tell",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "too",
  "us",
  "very",
  "want",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "would",
  "yan",
  "yes",
  "you",
  "your",
  "yung",
]);

const GENERIC_QUERY_TERMS = new Set([
  "build",
  "do",
  "does",
  "get",
  "help",
  "make",
  "need",
  "offer",
  "provide",
  "use",
  "want",
  "work",
]);

const FIELD_WEIGHTS = {
  title: 6,
  heading: 3,
  tags: 4,
  text: 1,
} as const;

const SNIPPET_LENGTH = 300;
const MIN_SCORE = 1.5;

interface Posting {
  chunkIndex: number;
  score: number;
}

export interface SearchIndex {
  chunks: KnowledgeChunk[];
  postings: Map<string, Posting[]>;
  titleText: string[];
  textText: string[];
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith("s") && !token.endsWith("ss") && !token.endsWith("us")) {
    return token.slice(0, -1);
  }
  return token;
}

export function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token))
    .map(stem);
}

function addPosting(
  postings: Map<string, Posting[]>,
  token: string,
  chunkIndex: number,
  score: number,
) {
  const existing = postings.get(token);
  if (existing) {
    const posting = existing.find((item) => item.chunkIndex === chunkIndex);
    if (posting) posting.score += score;
    else existing.push({ chunkIndex, score });
    return;
  }
  postings.set(token, [{ chunkIndex, score }]);
}

function addField(
  postings: Map<string, Posting[]>,
  value: string,
  weight: number,
  chunkIndex: number,
) {
  const counts = new Map<string, number>();
  for (const token of tokenize(value)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  for (const [token, count] of counts) {
    const score = weight * (1 + Math.log1p(Math.min(count, 6)));
    addPosting(postings, token, chunkIndex, score);
  }
}

export function createSearchIndex(chunks: KnowledgeChunk[]): SearchIndex {
  const postings = new Map<string, Posting[]>();
  const titleText: string[] = [];
  const textText: string[] = [];

  chunks.forEach((chunk, chunkIndex) => {
    const heading = chunk.headingPath.join(" ");
    const tags = [...chunk.tags, ...chunk.synonyms].join(" ");

    addField(postings, chunk.title, FIELD_WEIGHTS.title, chunkIndex);
    addField(postings, heading, FIELD_WEIGHTS.heading, chunkIndex);
    addField(postings, tags, FIELD_WEIGHTS.tags, chunkIndex);
    addField(postings, chunk.text, FIELD_WEIGHTS.text, chunkIndex);

    titleText.push(normalize(`${chunk.title} ${heading}`));
    textText.push(normalize(chunk.text));
  });

  return { chunks, postings, titleText, textText };
}

function makeSnippet(text: string, queryTerms: string[]): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= SNIPPET_LENGTH) return clean;

  const lower = clean.toLowerCase();
  let firstMatch = -1;
  for (const term of queryTerms) {
    const index = lower.indexOf(term);
    if (index >= 0 && (firstMatch === -1 || index < firstMatch)) firstMatch = index;
  }

  if (firstMatch === -1) return `${clean.slice(0, SNIPPET_LENGTH).trimEnd()}…`;

  let start = Math.max(0, firstMatch - 90);
  let end = Math.min(clean.length, start + SNIPPET_LENGTH);
  if (end - start < SNIPPET_LENGTH) start = Math.max(0, end - SNIPPET_LENGTH);

  if (start > 0) {
    const nextSpace = clean.indexOf(" ", start);
    if (nextSpace > -1 && nextSpace < firstMatch) start = nextSpace + 1;
  }
  if (end < clean.length) {
    const previousSpace = clean.lastIndexOf(" ", end);
    if (previousSpace > firstMatch) end = previousSpace;
  }

  const snippet = `${start > 0 ? "…" : ""}${clean.slice(start, end).trim()}${
    end < clean.length ? "…" : ""
  }`;
  return snippet.length > SNIPPET_LENGTH
    ? `${snippet.slice(0, SNIPPET_LENGTH - 1).trimEnd()}…`
    : snippet;
}

/**
 * Return up to three results. Relevance is deliberately conservative: a query
 * with no real keyword overlap returns nothing so Clara can say she is not sure.
 */
export function searchKnowledgeIndex(
  index: SearchIndex,
  query: string,
  limit = 3,
): KnowledgeSearchResult[] {
  const allTerms = [...new Set(tokenize(query))];
  if (allTerms.length === 0) return [];
  // A generic verb such as "build" should not drown out the specific word in
  // "build a website" or "do you build chatbots".
  const specificTerms = allTerms.filter((term) => !GENERIC_QUERY_TERMS.has(term));
  const terms = specificTerms.length > 0 ? specificTerms : allTerms;

  const scores = new Map<number, number>();
  const matchedTerms = new Map<number, number>();

  for (const term of terms) {
    const postings = index.postings.get(term);
    if (!postings) continue;
    // Rare terms are more useful than words that appear on many pages.
    const idf = Math.log(1 + index.chunks.length / postings.length);
    for (const posting of postings) {
      scores.set(posting.chunkIndex, (scores.get(posting.chunkIndex) ?? 0) + posting.score * idf);
      matchedTerms.set(posting.chunkIndex, (matchedTerms.get(posting.chunkIndex) ?? 0) + 1);
    }
  }

  const queryPhrase = normalize(query);
  const minMatches = terms.length >= 3 ? 2 : 1;
  const ranked = [...scores.entries()]
    .filter(([chunkIndex, score]) => {
      const matches = matchedTerms.get(chunkIndex) ?? 0;
      if (matches < minMatches || score < MIN_SCORE) return false;
      const phraseMatch =
        queryPhrase.length >= 4 &&
        (index.titleText[chunkIndex].includes(queryPhrase) ||
          index.textText[chunkIndex].includes(queryPhrase));
      return phraseMatch || score >= MIN_SCORE;
    })
    .map(([chunkIndex, score]) => {
      let finalScore = score;
      if (queryPhrase.length >= 4) {
        if (index.titleText[chunkIndex].includes(queryPhrase)) finalScore += 10;
        else if (index.textText[chunkIndex].includes(queryPhrase)) finalScore += 4;
      }
      if ((matchedTerms.get(chunkIndex) ?? 0) === terms.length) finalScore += 1;
      return { chunkIndex, score: finalScore };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        index.chunks[a.chunkIndex].id.localeCompare(index.chunks[b.chunkIndex].id),
    );

  const selected: typeof ranked = [];
  const seenUrls = new Set<string>();
  for (const candidate of ranked) {
    const url = index.chunks[candidate.chunkIndex].url;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    selected.push(candidate);
    if (selected.length >= limit) break;
  }

  return selected.map(({ chunkIndex }) => {
    const chunk = index.chunks[chunkIndex];
    return {
      title: chunk.title,
      url: chunk.url,
      snippet: makeSnippet(chunk.text, terms),
    };
  });
}

export function searchChunks(
  chunks: KnowledgeChunk[],
  query: string,
  limit = 3,
): KnowledgeSearchResult[] {
  return searchKnowledgeIndex(createSearchIndex(chunks), query, limit);
}
