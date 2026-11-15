import { describe, expect, it } from "vitest";
import { countWords, estimateReadingMinutes, formatReadingTime } from "@/lib/reading-time";

describe("reading-time utilities", () => {
  it("strips Markdown syntax, URLs, and image alt text before counting words", () => {
    const markdown = [
      "# Clear scopes",
      "",
      "Read [sample notes](/our-work) and *system guides* for automation.",
      "",
      "![Workflow sketch](/images/insights/bottleneck-mapping.webp)",
      "",
      "> Keep the scope explicit.",
    ].join("\n");

    expect(countWords(markdown)).toBe(14);
  });

  it("returns zero words and at least 1 min read for empty text", () => {
    expect(countWords("   \n\t  ")).toBe(0);
    expect(estimateReadingMinutes("")).toBe(1);
    expect(formatReadingTime("short note")).toBe("1 min read");
  });

  it("scales reading minutes by 220 words per minute", () => {
    const words = Array.from({ length: 441 }, () => "workflow").join(" ");
    expect(countWords(words)).toBe(441);
    expect(estimateReadingMinutes(words)).toBe(3);
    expect(formatReadingTime(words)).toBe("3 min read");
  });
});
