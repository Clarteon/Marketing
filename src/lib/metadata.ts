import type { Metadata } from "next";
import type { ContentPage } from "./content";

// Page-level openGraph replaces the root one, so the default share image is repeated here.
const shareImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Clarteon: Technology that starts with your problem.",
};

export function pathForPage(page: ContentPage): string {
  const { slug, type } = page.frontMatter;

  if (type === "insight") return `/insights/${slug}`;
  if (type === "case-study") return `/our-work/${slug}`;
  if (type === "faq") return `/faqs/${slug}`;
  return slug === "home" ? "/" : `/${slug}`;
}

export function metadataForPage(page: ContentPage): Metadata {
  const { frontMatter } = page;
  const title = frontMatter.seoTitle ?? frontMatter.title;
  const description = frontMatter.seoDescription ?? frontMatter.summary;
  const path = pathForPage(page);
  const isArticle = frontMatter.type === "insight" || frontMatter.type === "case-study";
  const socialTitle = `${title} | Clarteon`;
  const documentTitle =
    frontMatter.type === "page" && frontMatter.slug === "home" ? { absolute: socialTitle } : title;

  return {
    title: documentTitle,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      siteName: "Clarteon",
      locale: "en",
      images: [shareImage],
      ...(isArticle
        ? {
            type: "article",
            publishedTime: frontMatter.publishedAt,
            modifiedTime: frontMatter.updatedAt ?? frontMatter.publishedAt,
          }
        : { type: "website" }),
    },
    twitter: {
      card: "summary_large_image",
      images: [shareImage],
      title: socialTitle,
      description,
    },
  };
}
