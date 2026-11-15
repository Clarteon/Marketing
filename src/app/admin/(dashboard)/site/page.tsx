import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteConfigManager } from "@/components/admin/SiteConfigManager";
import { isAdminPageAuthenticated } from "@/lib/admin/auth";
import { getAdminSiteConfigState } from "@/lib/admin/site-config";
import { SITE_CONFIG_PAGE_SLUGS, type SiteConfigPageSlug } from "@/lib/admin/site-config-defaults";
import { getPage } from "@/lib/content";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Site configuration",
  robots: { index: false, follow: false },
};

async function loadDefaultHeroes(): Promise<
  Record<SiteConfigPageSlug, { title: string; intro: string }>
> {
  const entries = await Promise.all(
    SITE_CONFIG_PAGE_SLUGS.map(async (slug) => {
      const page = await getPage(slug);
      const rawHero = (
        page?.frontMatter as { hero?: { title?: string; intro?: string } } | undefined
      )?.hero;
      return [
        slug,
        {
          title: rawHero?.title ?? "",
          intro: rawHero?.intro ?? "",
        },
      ] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<
    SiteConfigPageSlug,
    { title: string; intro: string }
  >;
}

export default async function AdminSiteConfigPage() {
  if (!(await isAdminPageAuthenticated())) redirect("/admin/login");

  const [{ configured, schemaMissing, config }, defaultHeroes] = await Promise.all([
    getAdminSiteConfigState(),
    loadDefaultHeroes(),
  ]);

  return (
    <main className={styles.page} id="main">
      <div className={styles.reviewHeader}>
        <div>
          <p className={styles.eyebrow}>Clarteon admin</p>
          <h1 className={styles.title}>Site configuration</h1>
          <p className={styles.intro}>
            Control section visibility, page hero copy, team member portraits, and editorial
            photography.
          </p>
        </div>
      </div>

      <SiteConfigManager
        initialConfig={config}
        defaultHeroes={defaultHeroes}
        configured={configured}
        schemaMissing={schemaMissing}
      />
    </main>
  );
}
