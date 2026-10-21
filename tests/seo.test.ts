import { describe, expect, it } from "vitest";
import { contentTypes, frontMatterSchema, getPublished, type ContentPage } from "@/lib/content";
import { articleJsonLd, serializeJsonLd, siteJsonLd } from "@/lib/structured-data";

const base = "https://clarteon.tech";

async function allPublished(): Promise<ContentPage[]> {
  return (await Promise.all(contentTypes.map((type) => getPublished(type)))).flat();
}

describe("published content SEO", () => {
  it("gives every page a unique search title of at most 60 characters with the brand", async () => {
    const titles = (await allPublished()).map((page) => {
      const title = page.frontMatter.seoTitle ?? page.frontMatter.title;
      expect(`${title} | Clarteon`.length, page.filePath).toBeLessThanOrEqual(60);
      return title;
    });

    expect(new Set(titles).size).toBe(titles.length);
  });

  it("gives every page a unique description of 50 to 160 characters", async () => {
    const descriptions = (await allPublished()).map((page) => {
      const description = page.frontMatter.seoDescription ?? page.frontMatter.summary;
      expect(description.length, page.filePath).toBeGreaterThanOrEqual(50);
      expect(description.length, page.filePath).toBeLessThanOrEqual(160);
      return description;
    });

    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});

describe("front matter dates", () => {
  const article = {
    title: "T",
    slug: "t",
    type: "insight",
    status: "published",
    summary: "S",
  };

  it("requires publishedAt on published articles", () => {
    expect(frontMatterSchema.safeParse(article).success).toBe(false);
    expect(frontMatterSchema.safeParse({ ...article, publishedAt: "2026-10-21" }).success).toBe(
      true,
    );
    expect(frontMatterSchema.safeParse({ ...article, status: "draft" }).success).toBe(true);
  });

  it("rejects dates that are not YYYY-MM-DD", () => {
    expect(frontMatterSchema.safeParse({ ...article, publishedAt: "21/10/2026" }).success).toBe(
      false,
    );
  });
});

describe("structured data", () => {
  it("describes the organization and website with published facts only", () => {
    const graph = siteJsonLd(base)["@graph"];

    expect(graph[0]).toEqual({
      "@type": "Organization",
      "@id": `${base}/#organization`,
      name: "Clarteon",
      url: `${base}/`,
      logo: `${base}/icon.svg`,
      email: "info@clarteon.tech",
    });
    expect(graph[1]).toMatchObject({ "@type": "WebSite", name: "Clarteon", url: `${base}/` });
  });

  it("builds an article with canonical URL and dates", () => {
    const page: ContentPage = {
      frontMatter: frontMatterSchema.parse({
        title: "A client story",
        slug: "client-story",
        type: "case-study",
        status: "published",
        summary: "Summary",
        publishedAt: "2026-10-01",
      }),
      body: "",
      filePath: "content/case-studies/client-story.md",
    };

    expect(articleJsonLd(page, base)).toMatchObject({
      "@type": "Article",
      headline: "A client story",
      url: `${base}/our-work/client-story`,
      datePublished: "2026-10-01",
      dateModified: "2026-10-01",
    });
  });

  it("escapes < so content cannot close the script tag", () => {
    expect(serializeJsonLd({ text: "</script><script>alert(1)</script>" })).not.toContain("<");
  });
});
