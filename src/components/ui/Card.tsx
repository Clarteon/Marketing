import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./ui.module.css";

type CardTag = "article" | "div" | "li";
type Tone = "paper" | "stone" | "outline";

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  as?: CardTag;
  tone?: Tone;
  interactive?: boolean;
  children: ReactNode;
}

const toneClass: Record<Tone, string> = {
  paper: "",
  stone: styles.cardStone,
  outline: styles.cardOutline,
};

export function Card({
  as: Tag = "div",
  tone = "paper",
  interactive,
  className,
  children,
  ...props
}: CardProps) {
  const isInteractive = interactive ?? Tag === "article";

  return (
    <Tag
      className={cx(
        styles.card,
        toneClass[tone],
        isInteractive && styles.cardInteractive,
        className,
      )}
      {...props}
    >
      {isInteractive ? <div className={styles.borderBeam} aria-hidden="true" /> : null}
      {children}
    </Tag>
  );
}
