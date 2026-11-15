import type { Metadata } from "next";
import { AboutPage } from "@/components/pages/AboutPage";
import { getSiteConfig } from "@/lib/admin/site-config";
import { getPage } from "@/lib/content";
import { metadataForPage } from "@/lib/metadata";
import { getPageWithData } from "@/lib/page-loader";
import { simplePageSchema } from "@/lib/page-schemas";
import { resolveTeamMembers } from "@/lib/team";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("about");
  return page ? metadataForPage(page) : {};
}

export default async function About() {
  const [{ page, data }, siteConfig] = await Promise.all([
    getPageWithData("about", simplePageSchema),
    getSiteConfig(),
  ]);
  const team = resolveTeamMembers(siteConfig.media.teamPhotos);

  return (
    <AboutPage
      data={data}
      body={page.body}
      team={team}
      aboutClarityPhoto={siteConfig.media.aboutClarity}
      showOrgChart={siteConfig.sections.showAboutOrgChart}
      orgTitle={siteConfig.sections.aboutOrgTitle}
      showBookingSection={siteConfig.sections.showBookingSection}
    />
  );
}
