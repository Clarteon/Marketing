import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/pages/ArticlePage";
import { getPage, getPublished } from "@/lib/content";
import { JsonLd } from "@/components/ui/JsonLd";
import { metadataForPage } from "@/lib/metadata";
import { getSiteUrl } from "@/lib/site";
import { articleJsonLd } from "@/lib/structured-data";

export const dynamicParams = false;

export async function generateStaticParams() {
  const items = await getPublished("insight");
  return items.map((item) => ({ slug: item.frontMatter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug, "insight");
  return page ? metadataForPage(page) : {};
}

export default async function InsightPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug, "insight");

  if (!page) notFound();

  return (
    <>
      <JsonLd data={articleJsonLd(page, getSiteUrl())} />
      <ArticlePage page={page} eyebrow="Insight" />
    </>
  );
}
