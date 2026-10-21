import { describe, expect, it } from "vitest";
import type { ContentPage, FrontMatter } from "@/lib/content";
import { metadataForPage } from "@/lib/metadata";

function makePage(overrides: Partial<FrontMatter> = {}): ContentPage {
  return {
    frontMatter: {
      title: "Title",
      slug: "slug",
      type: "page",
      status: "published",
      summary: "Summary",
      tags: [],
      synonyms: [],
      ...overrides,
    },
    body: "",
    filePath: "content/pages/slug.md",
  };
}

describe("metadataForPage", () => {
  it("gives the home page an absolute branded title", () => {
    const metadata = metadataForPage(
      makePage({ title: "Technology that starts with your problem.", slug: "home" }),
    );

    expect(metadata.title).toEqual({
      absolute: "Technology that starts with your problem. | Clarteon",
    });
    expect(metadata.alternates?.canonical).toBe("/");
  });

  it("builds top-level page canonicals from the slug", () => {
    const metadata = metadataForPage(makePage({ title: "About", slug: "about" }));

    expect(metadata.title).toBe("About");
    expect(metadata.alternates?.canonical).toBe("/about");
    expect(metadata.openGraph).toMatchObject({ type: "website" });
  });

  it("puts insight canonicals under /insights", () => {
    const metadata = metadataForPage(
      makePage({ title: "A useful article", slug: "useful-article", type: "insight" }),
    );

    expect(metadata.alternates?.canonical).toBe("/insights/useful-article");
    expect(metadata.openGraph).toMatchObject({ type: "article" });
  });

  it("adds article dates and a large share card", () => {
    const metadata = metadataForPage(
      makePage({ type: "insight", publishedAt: "2026-10-01", updatedAt: "2026-10-15" }),
    );

    expect(metadata.openGraph).toMatchObject({
      publishedTime: "2026-10-01",
      modifiedTime: "2026-10-15",
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({ url: "/opengraph-image" }),
    ]);
  });

  it("puts case study canonicals under /our-work", () => {
    const metadata = metadataForPage(
      makePage({ title: "A client story", slug: "client-story", type: "case-study" }),
    );

    expect(metadata.alternates?.canonical).toBe("/our-work/client-story");
    expect(metadata.openGraph).toMatchObject({ type: "article" });
  });

  it("prefers SEO overrides when present", () => {
    const metadata = metadataForPage(
      makePage({
        title: "Page title",
        seoTitle: "Search title",
        summary: "Page summary",
        seoDescription: "Search description",
      }),
    );

    expect(metadata.title).toBe("Search title");
    expect(metadata.description).toBe("Search description");
    expect(metadata.openGraph?.title).toBe("Search title | Clarteon");
  });
});
