"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./ui.module.css";

type Variant = "primary" | "secondary" | "text" | "dark";
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
  dark: styles.dark,
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

  const handleMouseMove = <T extends HTMLElement>(
    e: MouseEvent<T>,
    userOnMouseMove?: (event: MouseEvent<T>) => void,
  ) => {
    if (variant !== "text") {
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        target.style.setProperty("--x", `${x.toFixed(1)}%`);
        target.style.setProperty("--y", `${y.toFixed(1)}%`);
      }
    }

    userOnMouseMove?.(e);
  };

  const handleClick = <T extends HTMLElement>(
    e: MouseEvent<T>,
    userOnClick?: (event: MouseEvent<T>) => void,
  ) => {
    if (variant !== "text") {
      const target = e.currentTarget;
      if (
        target &&
        !target.hasAttribute("disabled") &&
        target.getAttribute("aria-disabled") !== "true"
      ) {
        const rect = target.getBoundingClientRect();
        const isKeyboard = (e.clientX === 0 && e.clientY === 0) || e.detail === 0;
        const x = isKeyboard ? rect.width / 2 : e.clientX - rect.left;
        const y = isKeyboard ? rect.height / 2 : e.clientY - rect.top;

        const ripple = document.createElement("span");
        ripple.className = styles.ripple;
        const maxDim = Math.max(rect.width, rect.height) * 2;
        ripple.style.width = `${maxDim}px`;
        ripple.style.height = `${maxDim}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        target.appendChild(ripple);
        setTimeout(() => {
          if (ripple.parentElement) {
            ripple.remove();
          }
        }, 600);
      }
    }

    userOnClick?.(e);
  };

  const innerContent = <span className={styles.inner}>{children}</span>;

  if (props.href !== undefined) {
    const { href, onClick, onMouseMove, ...rest } = props;
    const isExternal = /^(https?:|mailto:)/.test(href);

    if (isExternal) {
      return (
        <a
          href={href}
          className={classes}
          onClick={(e) => handleClick(e, onClick)}
          onMouseMove={(e) => handleMouseMove(e, onMouseMove)}
          {...rest}
        >
          {innerContent}
        </a>
      );
    }

    return (
      <Link
        href={href}
        className={classes}
        onClick={(e) => handleClick(e, onClick)}
        onMouseMove={(e) => handleMouseMove(e, onMouseMove)}
        {...rest}
      >
        {innerContent}
      </Link>
    );
  }

  const { onClick, onMouseMove, ...buttonProps } = props as NativeProps;

  return (
    <button
      className={classes}
      onClick={(e) => handleClick(e, onClick)}
      onMouseMove={(e) => handleMouseMove(e, onMouseMove)}
      {...buttonProps}
    >
      {innerContent}
    </button>
  );
}
