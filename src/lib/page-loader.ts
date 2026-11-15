import { notFound } from "next/navigation";
import type { z } from "zod";
import { getSiteConfig } from "./admin/site-config";
import type { SiteConfigPageSlug } from "./admin/site-config-defaults";
import { getPage } from "./content";
import { parsePageData } from "./page-schemas";

export async function getPageWithData<T>(slug: string, schema: z.ZodType<T>) {
  const page = await getPage(slug);

  if (!page) notFound();

  const data = parsePageData(schema, page);
  const siteConfig = await getSiteConfig();
  const override = siteConfig.pageHeroes[slug as SiteConfigPageSlug];

  if (
    override &&
    data &&
    typeof data === "object" &&
    "hero" in data &&
    data.hero &&
    typeof data.hero === "object"
  ) {
    const hero = data.hero as { title?: string; intro?: string };
    const nextHero = {
      ...hero,
      ...(override.title?.trim() ? { title: override.title.trim() } : {}),
      ...(override.intro?.trim() ? { intro: override.intro.trim() } : {}),
    };
    return {
      page,
      data: { ...data, hero: nextHero } as T,
    };
  }

  return { page, data };
}
