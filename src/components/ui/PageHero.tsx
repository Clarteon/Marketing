import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { CoordinateGrid } from "./CoordinateGrid";
import { ElasticHighlight } from "./ElasticHighlight";
import { Section, type Tone } from "./Section";
import styles from "./ui.module.css";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  highlight?: string;
  intro?: string;
  actions?: ReactNode;
  children?: ReactNode;
  variant?: "home" | "page";
  tone?: Tone;
  showBackgroundGrid?: boolean;
  visual?: ReactNode;
}

export function PageHero({
  eyebrow,
  title,
  highlight,
  intro,
  actions,
  children,
  variant = "page",
  tone = "paper",
  showBackgroundGrid = true,
  visual,
}: PageHeroProps) {
  const isHome = variant === "home";
  const highlightIndex = highlight ? title.indexOf(highlight) : -1;
  const hasHighlight = highlightIndex >= 0;

  return (
    <Section
      tone={tone}
      className={cx(styles.hero, isHome && styles.heroHome)}
      background={showBackgroundGrid ? <CoordinateGrid tone={tone} /> : null}
    >
      <div className={cx(styles.heroInner, Boolean(visual) && styles.heroInnerWithVisual)}>
        <div className={styles.heroContent}>
          {eyebrow ? (
            isHome ? (
              <p className={styles.heroBadge}>
                <span className={styles.heroBadgeDot} aria-hidden="true" />
                {eyebrow}
              </p>
            ) : (
              <p className={styles.eyebrow}>{eyebrow}</p>
            )
          ) : null}
          <h1 className={styles.heroTitle}>
            {hasHighlight ? (
              <>
                {title.slice(0, highlightIndex)}
                <ElasticHighlight>{highlight}</ElasticHighlight>
                {title.slice(highlightIndex + highlight!.length)}
              </>
            ) : (
              title
            )}
          </h1>
          {intro ? <p className={styles.heroIntro}>{intro}</p> : null}
          {actions ? <div className={styles.heroActions}>{actions}</div> : null}
          {children}
        </div>
        {visual ? <div className={styles.heroVisual}>{visual}</div> : null}
      </div>
    </Section>
  );
}
