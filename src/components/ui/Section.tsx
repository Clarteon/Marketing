import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./ui.module.css";

export type Tone = "paper" | "stone" | "ink" | "lime";
export type Width = "default" | "narrow";

interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  tone?: Tone;
  width?: Width;
  background?: ReactNode;
  children: ReactNode;
}

const toneClass: Record<Tone, string> = {
  paper: styles.tonePaper,
  stone: styles.toneStone,
  ink: styles.toneInk,
  lime: styles.toneLime,
};

export function Section({
  tone = "paper",
  width = "default",
  background,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cx(styles.section, toneClass[tone], className)} {...props}>
      {background}
      <div className={cx(styles.sectionInner, width === "narrow" && styles.widthNarrow)}>
        {children}
      </div>
    </section>
  );
}
