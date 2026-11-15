"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_SITE_CONFIG,
  SITE_CONFIG_PAGE_LABELS,
  SITE_CONFIG_PAGE_SLUGS,
  type SiteConfig,
  type SiteConfigPageSlug,
} from "@/lib/admin/site-config-defaults";
import { DEFAULT_TEAM_MEMBERS } from "@/lib/team";
import { cx } from "@/lib/cx";
import styles from "@/app/admin/admin.module.css";

interface SiteConfigManagerProps {
  initialConfig: SiteConfig;
  defaultHeroes: Record<SiteConfigPageSlug, { title: string; intro: string }>;
  configured: boolean;
  schemaMissing?: boolean;
}

export function SiteConfigManager({
  initialConfig,
  defaultHeroes,
  configured,
  schemaMissing = false,
}: SiteConfigManagerProps) {
  const router = useRouter();
  const [config, setConfig] = useState<SiteConfig>(initialConfig);
  const [activeHeroSlug, setActiveHeroSlug] = useState<SiteConfigPageSlug>("home");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const canWrite = configured && !schemaMissing;

  function updateSection<Field extends keyof SiteConfig["sections"]>(
    key: Field,
    value: SiteConfig["sections"][Field],
  ) {
    setConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [key]: value,
      },
    }));
  }

  function updateHeroOverride(slug: SiteConfigPageSlug, field: "title" | "intro", value: string) {
    setConfig((prev) => {
      const current = prev.pageHeroes[slug] ?? {};
      const updated = { ...current, [field]: value };
      return {
        ...prev,
        pageHeroes: {
          ...prev.pageHeroes,
          [slug]: updated,
        },
      };
    });
  }

  function updateMedia(key: Exclude<keyof SiteConfig["media"], "teamPhotos">, value: string) {
    setConfig((prev) => ({
      ...prev,
      media: {
        ...prev.media,
        [key]: value,
      },
    }));
  }

  function updateTeamPhoto(memberId: string, value: string) {
    setConfig((prev) => ({
      ...prev,
      media: {
        ...prev.media,
        teamPhotos: {
          ...prev.media.teamPhotos,
          [memberId]: value,
        },
      },
    }));
  }

  async function savePayload(nextConfig: SiteConfig) {
    if (!canWrite || saving) return;
    setSaving(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextConfig),
      });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        config?: SiteConfig;
      };
      if (!response.ok || !body.ok || !body.config) {
        setStatusMessage({
          kind: "error",
          text: "Could not save site configuration. Ensure image paths start with / or https://.",
        });
        return;
      }

      setConfig(body.config);
      setStatusMessage({
        kind: "success",
        text: "Site configuration saved and public pages revalidated.",
      });
      router.refresh();
    } catch {
      setStatusMessage({
        kind: "error",
        text: "Network error while saving site configuration.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await savePayload(config);
  }

  async function handleResetDefaults() {
    setConfig(DEFAULT_SITE_CONFIG);
    await savePayload(DEFAULT_SITE_CONFIG);
  }

  const currentHeroOverride = config.pageHeroes[activeHeroSlug] ?? {};
  const defaultHero = defaultHeroes[activeHeroSlug];

  return (
    <div className={styles.cmsWorkspace}>
      {!configured ? (
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            Site configuration storage is not configured. Showing checked-in defaults in read-only
            mode. Add <code>DATABASE_URL</code> and run <code>npm run db:init</code> to customize
            page structure, sections, and portraits from here.
          </p>
        </div>
      ) : null}

      {schemaMissing ? (
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            The <code>site_config</code> table has not been applied yet. Showing checked-in defaults
            until you run <code>npm run db:init</code>.
          </p>
        </div>
      ) : null}

      <form className={styles.cmsConfigStack} onSubmit={handleSubmit}>
        {statusMessage ? (
          <p
            className={statusMessage.kind === "success" ? styles.success : styles.error}
            role="status"
          >
            {statusMessage.text}
          </p>
        ) : null}

        <section className={styles.panel} aria-labelledby="config-sections-heading">
          <h2 id="config-sections-heading" className={styles.sectionTitle}>
            Homepage &amp; About section structure
          </h2>
          <p className={styles.cmsEditorHint}>
            Toggle major page blocks on or off and adjust key section headlines.
          </p>

          <div className={styles.cmsToggleGrid}>
            <label className={styles.cmsCheckboxRow} htmlFor="cfg-home-clara">
              <input
                id="cfg-home-clara"
                type="checkbox"
                checked={config.sections.showHomeClara}
                onChange={(event) => updateSection("showHomeClara", event.target.checked)}
                disabled={!canWrite}
              />
              <span>Home hero: Interactive Clara assistant preview</span>
            </label>

            <label className={styles.cmsCheckboxRow} htmlFor="cfg-home-problems">
              <input
                id="cfg-home-problems"
                type="checkbox"
                checked={config.sections.showHomeProblems}
                onChange={(event) => updateSection("showHomeProblems", event.target.checked)}
                disabled={!canWrite}
              />
              <span>Home: Bottleneck photo cards grid</span>
            </label>

            <label className={styles.cmsCheckboxRow} htmlFor="cfg-home-flow">
              <input
                id="cfg-home-flow"
                type="checkbox"
                checked={config.sections.showHomeFlow}
                onChange={(event) => updateSection("showHomeFlow", event.target.checked)}
                disabled={!canWrite}
              />
              <span>Home: Problem-to-fix interactive map</span>
            </label>

            <label className={styles.cmsCheckboxRow} htmlFor="cfg-home-process">
              <input
                id="cfg-home-process"
                type="checkbox"
                checked={config.sections.showHomeProcess}
                onChange={(event) => updateSection("showHomeProcess", event.target.checked)}
                disabled={!canWrite}
              />
              <span>Home: Four-step scroll process conduit</span>
            </label>

            <label className={styles.cmsCheckboxRow} htmlFor="cfg-home-work">
              <input
                id="cfg-home-work"
                type="checkbox"
                checked={config.sections.showHomeFeaturedWork}
                onChange={(event) => updateSection("showHomeFeaturedWork", event.target.checked)}
                disabled={!canWrite}
              />
              <span>Home: Featured case studies ledger</span>
            </label>

            <label className={styles.cmsCheckboxRow} htmlFor="cfg-about-org">
              <input
                id="cfg-about-org"
                type="checkbox"
                checked={config.sections.showAboutOrgChart}
                onChange={(event) => updateSection("showAboutOrgChart", event.target.checked)}
                disabled={!canWrite}
              />
              <span>About: Organizational structure hierarchy</span>
            </label>

            <label className={styles.cmsCheckboxRow} htmlFor="cfg-booking">
              <input
                id="cfg-booking"
                type="checkbox"
                checked={config.sections.showBookingSection}
                onChange={(event) => updateSection("showBookingSection", event.target.checked)}
                disabled={!canWrite}
              />
              <span>Bottom discovery-call booking band</span>
            </label>
          </div>

          <div className={styles.cmsTripleRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cfg-problems-title">
                Home problems heading
              </label>
              <input
                id="cfg-problems-title"
                className={styles.input}
                type="text"
                maxLength={160}
                value={config.sections.homeProblemsTitle}
                onChange={(event) => updateSection("homeProblemsTitle", event.target.value)}
                readOnly={!canWrite}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cfg-featured-title">
                Home featured work heading
              </label>
              <input
                id="cfg-featured-title"
                className={styles.input}
                type="text"
                maxLength={160}
                value={config.sections.homeFeaturedWorkTitle}
                onChange={(event) => updateSection("homeFeaturedWorkTitle", event.target.value)}
                readOnly={!canWrite}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cfg-org-title">
                About org chart heading
              </label>
              <input
                id="cfg-org-title"
                className={styles.input}
                type="text"
                maxLength={160}
                value={config.sections.aboutOrgTitle}
                onChange={(event) => updateSection("aboutOrgTitle", event.target.value)}
                readOnly={!canWrite}
              />
            </div>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="config-heroes-heading">
          <h2 id="config-heroes-heading" className={styles.sectionTitle}>
            Page hero copy overrides
          </h2>
          <p className={styles.cmsEditorHint}>
            Select any page to override its top hero headline or intro copy. Leave blank to keep the
            checked-in Markdown text.
          </p>

          <div className={styles.cmsPageTabs} role="tablist" aria-label="Choose page to configure">
            {SITE_CONFIG_PAGE_SLUGS.map((slug) => (
              <button
                key={slug}
                type="button"
                role="tab"
                aria-selected={activeHeroSlug === slug}
                className={cx(
                  styles.cmsPageTab,
                  activeHeroSlug === slug && styles.cmsPageTabActive,
                )}
                onClick={() => setActiveHeroSlug(slug)}
              >
                {SITE_CONFIG_PAGE_LABELS[slug]}
              </button>
            ))}
          </div>

          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cfg-hero-title">
                {SITE_CONFIG_PAGE_LABELS[activeHeroSlug]} hero title override
              </label>
              <input
                id="cfg-hero-title"
                className={styles.input}
                type="text"
                maxLength={180}
                placeholder={defaultHero?.title ?? ""}
                value={currentHeroOverride.title ?? ""}
                onChange={(event) =>
                  updateHeroOverride(activeHeroSlug, "title", event.target.value)
                }
                readOnly={!canWrite}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cfg-hero-intro">
                {SITE_CONFIG_PAGE_LABELS[activeHeroSlug]} hero intro override
              </label>
              <textarea
                id="cfg-hero-intro"
                className={cx(styles.textarea, styles.cmsShortArea)}
                maxLength={500}
                placeholder={defaultHero?.intro ?? ""}
                value={currentHeroOverride.intro ?? ""}
                onChange={(event) =>
                  updateHeroOverride(activeHeroSlug, "intro", event.target.value)
                }
                readOnly={!canWrite}
              />
            </div>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="config-team-heading">
          <h2 id="config-team-heading" className={styles.sectionTitle}>
            Team portraits &amp; site photography
          </h2>
          <p className={styles.cmsEditorHint}>
            Paste a local <code>/images/...</code> path or an <code>https://...</code> URL for any
            team portrait on the About org chart or site card photography.
          </p>

          <div className={styles.cmsTeamGrid}>
            {DEFAULT_TEAM_MEMBERS.map((member) => {
              const value = config.media.teamPhotos[member.id] ?? "";
              return (
                <div key={member.id} className={styles.cmsTeamRow}>
                  <div className={styles.cmsTeamThumb} aria-hidden="true">
                    {value ? (
                      <img src={value} alt="" className={styles.cmsTeamThumbImg} />
                    ) : (
                      <span>{member.monogram}</span>
                    )}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`cfg-team-${member.id}`}>
                      {member.name} ({member.role})
                    </label>
                    <input
                      id={`cfg-team-${member.id}`}
                      className={styles.input}
                      type="text"
                      maxLength={500}
                      placeholder="/images/team/portrait.webp or https://..."
                      value={value}
                      onChange={(event) => updateTeamPhoto(member.id, event.target.value)}
                      readOnly={!canWrite}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.cmsSectionDivider}>
            <h3 className={styles.cmsSubheading}>Homepage service cards &amp; About visual</h3>
            <div className={styles.twoColumns}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="cfg-img-workflow">
                  Card 1 (Operations photo)
                </label>
                <input
                  id="cfg-img-workflow"
                  className={styles.input}
                  type="text"
                  maxLength={500}
                  value={config.media.serviceWorkflow}
                  onChange={(event) => updateMedia("serviceWorkflow", event.target.value)}
                  readOnly={!canWrite}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="cfg-img-discovery">
                  Card 2 (Conversations photo)
                </label>
                <input
                  id="cfg-img-discovery"
                  className={styles.input}
                  type="text"
                  maxLength={500}
                  value={config.media.serviceDiscovery}
                  onChange={(event) => updateMedia("serviceDiscovery", event.target.value)}
                  readOnly={!canWrite}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="cfg-img-api">
                  Card 3 (Integrations photo)
                </label>
                <input
                  id="cfg-img-api"
                  className={styles.input}
                  type="text"
                  maxLength={500}
                  value={config.media.serviceApiCode}
                  onChange={(event) => updateMedia("serviceApiCode", event.target.value)}
                  readOnly={!canWrite}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="cfg-img-software">
                  Card 4 (Custom software photo)
                </label>
                <input
                  id="cfg-img-software"
                  className={styles.input}
                  type="text"
                  maxLength={500}
                  value={config.media.serviceSoftwareBuild}
                  onChange={(event) => updateMedia("serviceSoftwareBuild", event.target.value)}
                  readOnly={!canWrite}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="cfg-img-about">
                  About page feature photo
                </label>
                <input
                  id="cfg-img-about"
                  className={styles.input}
                  type="text"
                  maxLength={500}
                  value={config.media.aboutClarity}
                  onChange={(event) => updateMedia("aboutClarity", event.target.value)}
                  readOnly={!canWrite}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="cfg-img-insights">
                  Insights fallback visual
                </label>
                <input
                  id="cfg-img-insights"
                  className={styles.input}
                  type="text"
                  maxLength={500}
                  value={config.media.insightsNotes}
                  onChange={(event) => updateMedia("insightsNotes", event.target.value)}
                  readOnly={!canWrite}
                />
              </div>
            </div>
          </div>
        </section>

        <div className={styles.cmsActionRow}>
          <button type="submit" className={styles.primaryButton} disabled={!canWrite || saving}>
            {saving ? "Saving..." : "Save site configuration"}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleResetDefaults}
            disabled={!canWrite || saving}
          >
            Reset to defaults
          </button>
        </div>
      </form>
    </div>
  );
}
