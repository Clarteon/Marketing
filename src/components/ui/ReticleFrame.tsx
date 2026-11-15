"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";
import styles from "./scroll-effects.module.css";

interface ReticleFrameProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tone?: "paper" | "stone" | "ink";
  badge?: string;
  showCorners?: boolean;
  className?: string;
}

export function ReticleFrame({
  children,
  tone = "paper",
  badge,
  showCorners = true,
  className,
  ...props
}: ReticleFrameProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.dataset.locked = "false";

    if (
      typeof window === "undefined" ||
      !("IntersectionObserver" in window) ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      node.dataset.locked = "true";
      return;
    }

    let observer: IntersectionObserver | null = null;
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        if (node.getBoundingClientRect().top < window.innerHeight) {
          node.dataset.locked = "true";
          return;
        }
        observer = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) {
              node.dataset.locked = "true";
              observer?.unobserve(node);
            }
          },
          { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
        );
        observer.observe(node);
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [pathname]);

  return (
    <div
      ref={ref}
      data-locked="false"
      className={cx(styles.reticleContainer, tone === "ink" && styles.reticleInk, className)}
      {...props}
    >
      {showCorners ? (
        <>
          <div className={cx(styles.reticleCorner, styles.cornerTopLeft)} aria-hidden="true" />
          <div className={cx(styles.reticleCorner, styles.cornerTopRight)} aria-hidden="true" />
          <div className={cx(styles.reticleCorner, styles.cornerBottomLeft)} aria-hidden="true" />
          <div className={cx(styles.reticleCorner, styles.cornerBottomRight)} aria-hidden="true" />
        </>
      ) : null}

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
