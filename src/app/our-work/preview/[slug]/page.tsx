import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/pages/ArticlePage";
import { getPage } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CaseStudyPreview({ params }: { params: Promise<{ slug: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { slug } = await params;
  const page = await getPage(slug, "case-study", { includeDrafts: true });

  if (!page) notFound();

  return <ArticlePage page={page} />;
}
