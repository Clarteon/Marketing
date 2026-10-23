"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cx } from "@/lib/cx";
import styles from "./scroll-effects.module.css";

interface ReticleFrameProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tone?: "paper" | "stone" | "ink";
  badge?: string;
  className?: string;
}

export function ReticleFrame({
  children,
  tone = "paper",
  badge,
  className,
  ...props
}: ReticleFrameProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof window === "undefined" ||
      !("IntersectionObserver" in window) ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      node.dataset.locked = "true";
      return;
    }

    // Check if already in viewport
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      node.dataset.locked = "true";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          node.dataset.locked = "true";
          observer.unobserve(node);
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-locked="false"
      className={cx(styles.reticleContainer, tone === "ink" && styles.reticleInk, className)}
      {...props}
    >
      {/* 4 Precision Viewfinder Corner Reticles */}
      <div className={cx(styles.reticleCorner, styles.cornerTopLeft)} aria-hidden="true" />
      <div className={cx(styles.reticleCorner, styles.cornerTopRight)} aria-hidden="true" />
      <div className={cx(styles.reticleCorner, styles.cornerBottomLeft)} aria-hidden="true" />
      <div className={cx(styles.reticleCorner, styles.cornerBottomRight)} aria-hidden="true" />

      {badge ? (
        <div className={styles.reticleBadge} aria-hidden="true">
          <span className={styles.reticleDot} />
          <span>{badge}</span>
        </div>
      ) : null}

      {children}
    </div>
  );
}
