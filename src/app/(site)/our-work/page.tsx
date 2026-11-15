import type { Metadata } from "next";
import { OurWorkPage } from "@/components/pages/OurWorkPage";
import { getPage, getPublished } from "@/lib/content";
import { metadataForPage } from "@/lib/metadata";
import { getPageWithData } from "@/lib/page-loader";
import { listPageSchema } from "@/lib/page-schemas";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("our-work");
  return page ? metadataForPage(page) : {};
}

export default async function OurWork() {
  const { page, data } = await getPageWithData("our-work", listPageSchema);
  const items = await getPublished("case-study");
  return <OurWorkPage data={data} body={page.body} items={items} />;
}
