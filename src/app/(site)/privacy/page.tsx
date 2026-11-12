import type { Metadata } from "next";
import { PrivacyPage } from "@/components/pages/PrivacyPage";
import { getPage } from "@/lib/content";
import { metadataForPage } from "@/lib/metadata";
import { getPageWithData } from "@/lib/page-loader";
import { simplePageSchema } from "@/lib/page-schemas";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("privacy");
  return page ? metadataForPage(page) : {};
}

export default async function Privacy() {
  const { page, data } = await getPageWithData("privacy", simplePageSchema);
  return <PrivacyPage data={data} body={page.body} />;
}
