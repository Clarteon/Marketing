"use client";

import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cx } from "@/lib/cx";
import styles from "./scroll-effects.module.css";

interface ScrollRevealProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: ElementType;
  stagger?: boolean;
  threshold?: number;
  rootMargin?: string;
  delayMs?: number;
  className?: string;
}

export function ScrollReveal({
  children,
  as: Component = "div",
  stagger = false,
  threshold = 0.1,
  rootMargin = "0px 0px -6% 0px",
  delayMs = 0,
  className,
  ...props
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof window === "undefined" ||
      !("IntersectionObserver" in window) ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      node.dataset.revealed = "true";
      return;
    }

    // If already in the viewport upon mount, reveal immediately
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      node.dataset.revealed = "true";
      return;
    }

    let timeoutId: number | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          if (delayMs > 0) {
            timeoutId = window.setTimeout(() => {
              node.dataset.revealed = "true";
            }, delayMs);
          } else {
            node.dataset.revealed = "true";
          }
          observer.unobserve(node);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [threshold, rootMargin, delayMs]);

  return (
    <Component
      ref={ref}
      data-revealed="false"
      className={cx(stagger ? styles.revealStagger : styles.reveal, className)}
      {...props}
    >
      {children}
    </Component>
  );
}
