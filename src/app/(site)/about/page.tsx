import type { Metadata } from "next";
import { AboutPage } from "@/components/pages/AboutPage";
import { getPage } from "@/lib/content";
import { metadataForPage } from "@/lib/metadata";
import { getPageWithData } from "@/lib/page-loader";
import { simplePageSchema } from "@/lib/page-schemas";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("about");
  return page ? metadataForPage(page) : {};
}

export default async function About() {
  const { page, data } = await getPageWithData("about", simplePageSchema);
  return <AboutPage data={data} body={page.body} />;
}
