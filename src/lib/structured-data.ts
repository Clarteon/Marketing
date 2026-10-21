import type { ContentPage } from "./content";
import { pathForPage } from "./metadata";
import { site } from "./site";

// Only facts already published on the site belong here. No address, ratings,
// founders or social profiles until they are real and approved.
export function siteJsonLd(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: site.name,
        url: `${baseUrl}/`,
        logo: `${baseUrl}/icon.svg`,
        email: site.email,
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        name: site.name,
        url: `${baseUrl}/`,
        publisher: { "@id": `${baseUrl}/#organization` },
      },
    ],
  };
}

export function articleJsonLd(page: ContentPage, baseUrl: string) {
  const { frontMatter } = page;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: frontMatter.seoTitle ?? frontMatter.title,
    description: frontMatter.seoDescription ?? frontMatter.summary,
    url: `${baseUrl}${pathForPage(page)}`,
    datePublished: frontMatter.publishedAt,
    dateModified: frontMatter.updatedAt ?? frontMatter.publishedAt,
    author: { "@id": `${baseUrl}/#organization` },
    publisher: { "@id": `${baseUrl}/#organization` },
  };
}

/** Serialize for a `<script type="application/ld+json">`, escaping `<` so content cannot close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
