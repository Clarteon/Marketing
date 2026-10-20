import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Section } from "./Section";
import styles from "./ui.module.css";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  intro?: string;
  actions?: ReactNode;
  children?: ReactNode;
  variant?: "home" | "page";
}

export function PageHero({
  eyebrow,
  title,
  intro,
  actions,
  children,
  variant = "page",
}: PageHeroProps) {
  return (
    <Section className={cx(styles.hero, variant === "home" && styles.heroHome)}>
      <div className={styles.heroInner}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.heroTitle}>{title}</h1>
        {intro ? <p className={styles.heroIntro}>{intro}</p> : null}
        {actions ? <div className={styles.heroActions}>{actions}</div> : null}
        {children}
      </div>
    </Section>
  );
}
