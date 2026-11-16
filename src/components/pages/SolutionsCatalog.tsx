"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { SolutionsData } from "@/lib/page-schemas";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/Button";
import { ScrollReveal, type ScrollRevealVariant } from "@/components/ui/ScrollReveal";
import { Section } from "@/components/ui/Section";
import styles from "./pages.module.css";

const themeEntrances: ScrollRevealVariant[] = ["slide", "wipe", "settle", "rise", "focus"];

const problemMedia: Record<string, { src: string; alt: string }> = {
  "Repeated data entry": {
    src: "/images/editorial/sol-data-entry.jpg",
    alt: "Person entering records across spreadsheets and business tools on a wooden desk",
  },
  "Spreadsheets as software": {
    src: "/images/editorial/sol-spreadsheets.jpg",
    alt: "Laptop open to a multi-column business spreadsheet beside a pen and notebook",
  },
  "Approvals that wait": {
    src: "/images/editorial/sol-approvals.webp",
    alt: "Closed notebook, pen, phone, and espresso waiting on a quiet timber table",
  },
  "The same questions": {
    src: "/images/editorial/sol-same-questions.webp",
    alt: "Typing responses on a laptop keyboard next to a mobile phone and printed notes",
  },
  "Leads that go cold": {
    src: "/images/editorial/sol-leads-cold.jpg",
    alt: "Idle smartphone resting beside a laptop computer and espresso cup",
  },
  "Handoffs that lose context": {
    src: "/images/editorial/sol-handoffs.jpg",
    alt: "Two teammates sitting across a table to keep client handoff notes aligned",
  },
  "Tools that do not talk": {
    src: "/images/editorial/sol-tools-apart.jpg",
    alt: "Two separate computer displays standing side by side on a clean studio desk",
  },
  "Reporting that eats a day": {
    src: "/images/editorial/sol-reporting.jpg",
    alt: "Close-up of a laptop screen displaying live activity trends and performance charts",
  },
  "Reports no one trusts": {
    src: "/images/editorial/sol-reports-trust.webp",
    alt: "Laptop display showing chart figures beside an idle phone on a bright desk",
  },
  "Visitors cannot find the answer": {
    src: "/images/editorial/sol-site-clarity.webp",
    alt: "Laptop resting next to hand-drawn webpage wireframe sketches in an open notebook",
  },
  "Interest does not become a conversation": {
    src: "/images/editorial/sol-traffic-booking.jpg",
    alt: "Open weekly booking calendar planner laid out beside a laptop and smartphone",
  },
  "Updates need a developer": {
    src: "/images/editorial/sol-content-updates.jpg",
    alt: "Laptop displaying structured web template code next to a black ceramic mug",
  },
};

function getThemeLayoutClass(index: number) {
  switch (index % 4) {
    case 0:
      return styles.solutionLayoutSplitStack;
    case 1:
      return styles.solutionLayoutTriptych;
    case 2:
      return styles.solutionLayoutBannerDual;
    default:
      return styles.solutionLayoutDualClosing;
  }
}

export function SolutionsCatalog({ themes }: { themes: SolutionsData["themes"] }) {
  const [activeTheme, setActiveTheme] = useState<string>("all");

  const themeIds = useMemo(() => new Set(themes.map((theme) => theme.id)), [themes]);
  const totalProblems = useMemo(
    () => themes.reduce((sum, theme) => sum + theme.problems.length, 0),
    [themes],
  );

  useEffect(() => {
    const ensureTargetVisible = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash && themeIds.has(hash)) {
        setActiveTheme("all");
      }
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest("a[href^='#']");
      const href = target?.getAttribute("href");
      if (!href) return;
      const hash = href.slice(1);
      if (!themeIds.has(hash)) return;
      setActiveTheme("all");
      window.requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      });
    };

    window.addEventListener("hashchange", ensureTargetVisible);
    document.addEventListener("click", handleDocumentClick);
    return () => {
      window.removeEventListener("hashchange", ensureTargetVisible);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [themeIds]);

  const visibleThemes =
    activeTheme === "all" ? themes : themes.filter((theme) => theme.id === activeTheme);

  return (
    <>
      <div className={styles.solutionsFilterShell}>
        <div className={styles.solutionsFilterInner}>
          <div
            className={styles.workFilterBar}
            role="group"
            aria-label="Filter solutions by problem area"
          >
            <span className={styles.workFilterLabel}>Filter by problem area</span>
            <div className={styles.workFilterControls}>
              <button
                type="button"
                className={
                  activeTheme === "all"
                    ? `${styles.workFilterButton} ${styles.workFilterButtonActive}`
                    : styles.workFilterButton
                }
                aria-pressed={activeTheme === "all"}
                onClick={() => setActiveTheme("all")}
              >
                <span>All problem areas</span>
                <span className={styles.workFilterCount}>{totalProblems}</span>
              </button>

              {themes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    activeTheme === item.id
                      ? `${styles.workFilterButton} ${styles.workFilterButtonActive}`
                      : styles.workFilterButton
                  }
                  aria-pressed={activeTheme === item.id}
                  onClick={() => setActiveTheme(item.id)}
                >
                  <span>{item.title}</span>
                  <span className={styles.workFilterCount}>{item.problems.length}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {visibleThemes.map((theme, index) => {
        const originalIndex = themes.findIndex((candidate) => candidate.id === theme.id);
        const sectionTone = index % 2 === 1 ? "stone" : "paper";
        const layoutClass = getThemeLayoutClass(originalIndex >= 0 ? originalIndex : index);
        const entrance =
          themeEntrances[(originalIndex >= 0 ? originalIndex : index) % themeEntrances.length];

        return (
          <Section
            key={theme.id}
            id={theme.id}
            tone={sectionTone}
            aria-labelledby={`${theme.id}-title`}
          >
            <ScrollReveal variant={entrance} className={styles.solutionThemeHeader}>
              <div className={styles.solutionThemeTitleCol}>
                <h2 id={`${theme.id}-title`} className={styles.sectionTitle}>
                  {theme.title}
                </h2>
              </div>

              <div className={styles.solutionThemeMetaCol}>
                <p className={styles.sectionIntro}>{theme.intro}</p>
                <div className={styles.solutionThemeAction}>
                  <Button href="/contact#book" variant="secondary">
                    Talk through this problem
                  </Button>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal
              stagger
              variant={entrance}
              className={cx(styles.solutionThemeLayout, layoutClass)}
            >
              {theme.problems.map((problem, problemIndex) => {
                const media = problemMedia[problem.title];
                const approaches = problem.solution
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <article
                    key={problem.title}
                    className={cx(
                      styles.solutionFeatureCard,
                      problemIndex === 0 && styles.solutionFeaturePrimary,
                      problemIndex === 2 && styles.solutionFeatureClosing,
                    )}
                  >
                    {media ? (
                      <div className={styles.solutionMediaWrap}>
                        <Image
                          src={media.src}
                          alt={media.alt}
                          fill
                          priority={index === 0 && problemIndex === 0}
                          sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 48vw"
                          className={styles.solutionMediaImg}
                        />
                      </div>
                    ) : null}
                    <div className={styles.solutionCardContent}>
                      <h3 className={cx(styles.problemTitle, styles.solutionCardTitle)}>
                        {problem.title}
                      </h3>
                      <p className={styles.problemBody}>{problem.body}</p>
                      <p className={styles.solutionApproachLine}>
                        <span className={styles.solutionApproachPrefix}>Often solved with</span>{" "}
                        <span className={styles.solutionApproachList}>{approaches}</span>
                      </p>
                    </div>
                  </article>
                );
              })}
            </ScrollReveal>
          </Section>
        );
      })}
    </>
  );
}
