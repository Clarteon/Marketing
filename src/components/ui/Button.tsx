import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./ui.module.css";

type Variant = "primary" | "secondary" | "text";
type Size = "default" | "large";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type LinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children"> & {
    href: string;
  };

type NativeProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

export type ButtonProps = LinkProps | NativeProps;

const variantClass: Record<Variant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  text: styles.text,
};

export function Button({
  variant = "primary",
  size = "default",
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cx(
    styles.button,
    variantClass[variant],
    size === "large" && styles.large,
    className,
  );

  if (props.href !== undefined) {
    const { href, ...rest } = props;
    const isExternal = /^(https?:|mailto:)/.test(href);

    if (isExternal) {
      return (
        <a href={href} className={classes} {...rest}>
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as NativeProps)}>
      {children}
    </button>
  );
}
