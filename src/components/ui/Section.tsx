import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "@/lib/cx";
import styles from "./ui.module.css";

export type Tone = "paper" | "stone" | "ink" | "lime";
export type Width = "default" | "narrow";

interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  tone?: Tone;
  width?: Width;
  background?: ReactNode;
  children: ReactNode;
  ref?: Ref<HTMLElement>;
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
  ref,
  ...props
}: SectionProps) {
  return (
    <section ref={ref} className={cx(styles.section, toneClass[tone], className)} {...props}>
      {background}
      <div className={cx(styles.sectionInner, width === "narrow" && styles.widthNarrow)}>
        {children}
      </div>
    </section>
  );
}
