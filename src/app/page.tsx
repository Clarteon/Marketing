import type { Metadata } from "next";
import { HomePage } from "@/components/pages/HomePage";
import { getPage } from "@/lib/content";
import { metadataForPage } from "@/lib/metadata";
import { getPageWithData } from "@/lib/page-loader";
import { homeSchema } from "@/lib/page-schemas";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("home");
  return page ? metadataForPage(page) : {};
}

export default async function Home() {
  const { data } = await getPageWithData("home", homeSchema);
  return <HomePage data={data} />;
}
