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
