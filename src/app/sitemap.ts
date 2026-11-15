import type { MetadataRoute } from "next";
import { listPublicProjects } from "@/lib/admin/projects";
import { getPublished, type ContentPage } from "@/lib/content";
import { pathForPage } from "@/lib/metadata";
import { getSiteUrl } from "@/lib/site";

function entry(page: ContentPage, base: string, priority: number): MetadataRoute.Sitemap[number] {
  const path = pathForPage(page);
  const lastModified = page.frontMatter.updatedAt ?? page.frontMatter.publishedAt;
  return {
    url: path === "/" ? base : `${base}${path}`,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: "monthly",
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [pages, insights, caseStudies] = await Promise.all([
    getPublished("page"),
    getPublished("insight"),
    listPublicProjects(),
  ]);

  return [
    ...pages.map((page) => entry(page, base, page.frontMatter.slug === "home" ? 1 : 0.7)),
    ...insights.map((page) => entry(page, base, 0.6)),
    ...caseStudies.map((page) => entry(page, base, 0.6)),
  ];
}
