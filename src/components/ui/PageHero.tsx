import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { CoordinateGrid } from "./CoordinateGrid";
import { ElasticHighlight } from "./ElasticHighlight";
import { Section, type Tone } from "./Section";
import styles from "./ui.module.css";

interface PageHeroProps {
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
  let wordIndex = 0;
  const animateWords = (text: string) =>
    text.split(/(\s+)/).map((part) =>
      part.trim() ? (
        <span
          key={wordIndex}
          className={styles.heroWord}
          style={{ "--i": wordIndex++ } as CSSProperties}
        >
          {part}
        </span>
      ) : (
        part
      ),
    );

  return (
    <Section
      tone={tone}
      className={cx(styles.hero, isHome && styles.heroHome)}
      background={showBackgroundGrid ? <CoordinateGrid tone={tone} /> : null}
    >
      <div className={cx(styles.heroInner, Boolean(visual) && styles.heroInnerWithVisual)}>
        <div className={styles.heroContent}>
          <h1
            className={styles.heroTitle}
            style={{ "--words": title.trim().split(/\s+/).length } as CSSProperties}
          >
            {hasHighlight ? (
              <>
                {animateWords(title.slice(0, highlightIndex))}
                <span className={styles.heroWord} style={{ "--i": wordIndex++ } as CSSProperties}>
                  <ElasticHighlight>{highlight}</ElasticHighlight>
                </span>
                {animateWords(title.slice(highlightIndex + highlight!.length))}
              </>
            ) : (
              animateWords(title)
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
