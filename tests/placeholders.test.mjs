import { describe, expect, it } from "vitest";
import { findPlaceholdersInText, isPublishedMarkdown } from "../scripts/lib/placeholders.mjs";

describe("findPlaceholdersInText", () => {
  it("finds all-caps bracket placeholders", () => {
    const findings = findPlaceholdersInText("Founder: [FOUNDER NAMES AND BIOS]");

    expect(findings).toEqual([{ line: 1, match: "[FOUNDER NAMES AND BIOS]" }]);
  });

  it("reports the line number", () => {
    const findings = findPlaceholdersInText("line one\nline two [CONTACT EMAIL]");

    expect(findings).toEqual([{ line: 2, match: "[CONTACT EMAIL]" }]);
  });

  it("ignores Markdown links and TypeScript syntax", () => {
    const text = "[Privacy](/privacy)\nconst value: [key: string] = [];";

    expect(findPlaceholdersInText(text)).toEqual([]);
  });
});

describe("isPublishedMarkdown", () => {
  it("accepts published front matter", () => {
    expect(isPublishedMarkdown("---\ntitle: Home\nstatus: published\n---\nBody")).toBe(true);
  });

  it("rejects draft front matter", () => {
    expect(isPublishedMarkdown("---\ntitle: Home\nstatus: draft\n---\nBody")).toBe(false);
  });

  it("rejects files without front matter", () => {
    expect(isPublishedMarkdown("Body only")).toBe(false);
  });
});
