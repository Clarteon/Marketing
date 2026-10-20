import type { Metadata } from "next";
import type { ContentPage } from "./content";

function pathForPage(page: ContentPage): string {
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
      type: isArticle ? "article" : "website",
    },
    twitter: {
      card: "summary",
      title: socialTitle,
      description,
    },
  };
}
