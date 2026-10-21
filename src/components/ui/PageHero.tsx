import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Section } from "./Section";
import styles from "./ui.module.css";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  highlight?: string;
  intro?: string;
  actions?: ReactNode;
  children?: ReactNode;
  variant?: "home" | "page";
}

export function PageHero({
  eyebrow,
  title,
  highlight,
  intro,
  actions,
  children,
  variant = "page",
}: PageHeroProps) {
  const isHome = variant === "home";
  const highlightIndex = highlight ? title.indexOf(highlight) : -1;
  const hasHighlight = highlightIndex >= 0;

  return (
    <Section className={cx(styles.hero, isHome && styles.heroHome)}>
      <div className={styles.heroInner}>
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
              <span className={styles.highlight}>{highlight}</span>
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
    </Section>
  );
}
