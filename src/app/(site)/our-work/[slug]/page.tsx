import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/pages/ArticlePage";
import { JsonLd } from "@/components/ui/JsonLd";
import { getPublicProjectBySlug } from "@/lib/admin/projects";
import { getPublished } from "@/lib/content";
import { metadataForPage } from "@/lib/metadata";
import { getSiteUrl } from "@/lib/site";
import { articleJsonLd } from "@/lib/structured-data";

export const dynamicParams = true;

export async function generateStaticParams() {
  const items = await getPublished("case-study");
  return items.map((item) => ({ slug: item.frontMatter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicProjectBySlug(slug);
  return page ? metadataForPage(page) : {};
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublicProjectBySlug(slug);

  if (!page) notFound();

  return (
    <>
      <JsonLd data={articleJsonLd(page, getSiteUrl())} />
      <ArticlePage page={page} />
    </>
  );
}
