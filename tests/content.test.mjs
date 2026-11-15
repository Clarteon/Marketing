import { describe, expect, it } from "vitest";
import { getPage, getPublished } from "@/lib/content";
import { findPlaceholdersInText } from "../scripts/lib/placeholders.mjs";

describe("published content", () => {
  it("loads every top-level page", async () => {
    const pages = await getPublished("page");
    const slugs = pages.map((page) => page.frontMatter.slug).sort();

    expect(slugs).toEqual([
      "about",
      "contact",
      "home",
      "how-we-work",
      "insights",
      "our-work",
      "privacy",
      "solutions",
    ]);
  });

  it("keeps the approved homepage copy exact", async () => {
    const home = await getPage("home");
    if (!home) throw new Error("Missing home page");

    expect(home.frontMatter.hero.title).toBe("Technology that starts with your problem.");
    expect(home.frontMatter.hero.intro).toBe(
      "Clarteon is the technology partner that believes the right solution starts with the right question. We find the repetitive work slowing your business down, then automate it or build what you need, so you can grow.",
    );
    expect(home.frontMatter.hero.actions[0].label).toBe("Book a free discovery call");
    expect(home.frontMatter.hero.actions[1].label).toBe("Send a project brief");
    expect(home.frontMatter.hero.actions).toHaveLength(2);
  });

  it("has the required front matter on every published page", async () => {
    const pages = await getPublished("page");

    for (const page of pages) {
      expect(page.frontMatter.title, page.filePath).toBeTruthy();
      expect(page.frontMatter.slug, page.filePath).toBeTruthy();
      expect(page.frontMatter.type, page.filePath).toBe("page");
      expect(page.frontMatter.status, page.filePath).toBe("published");
      expect(page.frontMatter.summary, page.filePath).toBeTruthy();
      expect(Array.isArray(page.frontMatter.tags), page.filePath).toBe(true);
      expect(Array.isArray(page.frontMatter.synonyms), page.filePath).toBe(true);
    }
  });

  it("contains no bracket placeholders in published output", async () => {
    const pages = await getPublished("page");

    for (const page of pages) {
      expect(findPlaceholdersInText(page.body), page.filePath).toEqual([]);
      expect(findPlaceholdersInText(JSON.stringify(page.frontMatter)), page.filePath).toEqual([]);
    }
  });

  it("loads published case studies in priority order with preview images", async () => {
    const studies = await getPublished("case-study");
    const slugs = studies.map((study) => study.frontMatter.slug);

    expect(slugs).toEqual([
      "janelles-satin-bouquet",
      "v-unite-voice-ai-coach",
      "ai-customer-support-triager",
      "manual-order-processing-automation",
      "sane-private-scam-checker",
    ]);

    for (const study of studies) {
      expect(study.frontMatter.image, study.filePath).toMatch(/^\/images\/work\/.+\.webp$/);
      expect(study.frontMatter.problemBrief, study.filePath).toBeTruthy();
      expect(study.frontMatter.approachBrief, study.filePath).toBeTruthy();
      expect(study.frontMatter.outcomeBrief, study.filePath).toBeTruthy();
    }
  });

  it("returns null for unknown pages", async () => {
    expect(await getPage("does-not-exist")).toBeNull();
    expect(await getPage("../home")).toBeNull();
  });
});
