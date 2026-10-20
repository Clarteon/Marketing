import type { MetadataRoute } from "next";
import { getPublished } from "@/lib/content";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const pages = await getPublished("page");
  const insights = await getPublished("insight");
  const caseStudies = await getPublished("case-study");

  const pageEntries: MetadataRoute.Sitemap = pages.map((page) => {
    const path = page.frontMatter.slug === "home" ? "" : `/${page.frontMatter.slug}`;
    return {
      url: `${base}${path}`,
      changeFrequency: "monthly",
      priority: page.frontMatter.slug === "home" ? 1 : 0.7,
    };
  });

  const insightEntries: MetadataRoute.Sitemap = insights.map((page) => ({
    url: `${base}/insights/${page.frontMatter.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const caseStudyEntries: MetadataRoute.Sitemap = caseStudies.map((page) => ({
    url: `${base}/our-work/${page.frontMatter.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...pageEntries, ...insightEntries, ...caseStudyEntries];
}
