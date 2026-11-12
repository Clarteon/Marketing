import type { Metadata } from "next";
import { InsightsPage } from "@/components/pages/InsightsPage";
import { getPage, getPublished } from "@/lib/content";
import { metadataForPage } from "@/lib/metadata";
import { getPageWithData } from "@/lib/page-loader";
import { listPageSchema } from "@/lib/page-schemas";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("insights");
  return page ? metadataForPage(page) : {};
}

export default async function Insights() {
  const { data } = await getPageWithData("insights", listPageSchema);
  const items = await getPublished("insight");
  return <InsightsPage data={data} items={items} />;
}
