import type { Metadata } from "next";
import { SolutionsPage } from "@/components/pages/SolutionsPage";
import { getPage } from "@/lib/content";
import { metadataForPage } from "@/lib/metadata";
import { getPageWithData } from "@/lib/page-loader";
import { solutionsSchema } from "@/lib/page-schemas";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("solutions");
  return page ? metadataForPage(page) : {};
}

export default async function Solutions() {
  const { data } = await getPageWithData("solutions", solutionsSchema);
  return <SolutionsPage data={data} />;
}
