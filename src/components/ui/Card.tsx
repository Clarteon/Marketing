import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./ui.module.css";

type CardTag = "article" | "div" | "li";
type Tone = "paper" | "stone" | "outline";

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  as?: CardTag;
  tone?: Tone;
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
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Tag className={cx(styles.card, toneClass[tone], className)} {...props}>
      {children}
    </Tag>
  );
}
