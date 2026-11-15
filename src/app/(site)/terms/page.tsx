import type { Metadata } from "next";
import { PrivacyPage } from "@/components/pages/PrivacyPage";
import { getPage } from "@/lib/content";
import { metadataForPage } from "@/lib/metadata";
import { getPageWithData } from "@/lib/page-loader";
import { simplePageSchema } from "@/lib/page-schemas";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("terms");
  return page ? metadataForPage(page) : {};
}

export default async function Terms() {
  const { page, data } = await getPageWithData("terms", simplePageSchema);
  return <PrivacyPage data={data} body={page.body} />;
}
