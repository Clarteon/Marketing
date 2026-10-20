import type { Metadata } from "next";
import { HowWeWorkPage } from "@/components/pages/HowWeWorkPage";
import { getPage } from "@/lib/content";
import { metadataForPage } from "@/lib/metadata";
import { getPageWithData } from "@/lib/page-loader";
import { howWeWorkSchema } from "@/lib/page-schemas";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("how-we-work");
  return page ? metadataForPage(page) : {};
}

export default async function HowWeWork() {
  const { data } = await getPageWithData("how-we-work", howWeWorkSchema);
  return <HowWeWorkPage data={data} />;
}
