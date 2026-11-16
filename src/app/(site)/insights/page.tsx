import type { Metadata } from "next";
import { InsightsPage } from "@/components/pages/InsightsPage";
import { getSiteConfig } from "@/lib/admin/site-config";
import { getPage, getPublished } from "@/lib/content";
import { metadataForPage } from "@/lib/metadata";
import { getPageWithData } from "@/lib/page-loader";
import { listPageSchema } from "@/lib/page-schemas";
import { resolveTeamMembers } from "@/lib/team";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("insights");
  return page ? metadataForPage(page) : {};
}

export default async function Insights() {
  const [{ data }, items, siteConfig] = await Promise.all([
    getPageWithData("insights", listPageSchema),
    getPublished("insight"),
    getSiteConfig(),
  ]);
  const team = resolveTeamMembers(siteConfig.media.teamPhotos);
  return <InsightsPage data={data} items={items} team={team} />;
}
