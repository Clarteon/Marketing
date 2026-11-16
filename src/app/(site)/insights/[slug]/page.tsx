import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/pages/ArticlePage";
import { JsonLd } from "@/components/ui/JsonLd";
import { getSiteConfig } from "@/lib/admin/site-config";
import { getPage, getPublished } from "@/lib/content";
import { metadataForPage } from "@/lib/metadata";
import { getSiteUrl } from "@/lib/site";
import { articleJsonLd } from "@/lib/structured-data";
import { resolveTeamMembers } from "@/lib/team";

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
  const [page, siteConfig] = await Promise.all([getPage(slug, "insight"), getSiteConfig()]);

  if (!page) notFound();

  const team = resolveTeamMembers(siteConfig.media.teamPhotos);

  return (
    <>
      <JsonLd data={articleJsonLd(page, getSiteUrl())} />
      <ArticlePage page={page} team={team} />
    </>
  );
}
