"use client";

import type { ElementType, FocusEvent, HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";
import styles from "./scroll-effects.module.css";

export type ScrollRevealVariant = "focus" | "rise" | "slide" | "settle" | "wipe";

interface ScrollRevealProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: ElementType;
  stagger?: boolean;
  variant?: ScrollRevealVariant;
  threshold?: number;
  rootMargin?: string;
  delayMs?: number;
  className?: string;
}

type InitJob = () => {
  node: HTMLElement;
  visible: boolean;
  apply: (visible: boolean) => void;
};

const pendingJobs = new Set<InitJob>();
let flushFrame: number | null = null;
let flushInnerFrame: number | null = null;

function cancelPendingJob(job: InitJob) {
  pendingJobs.delete(job);
  if (pendingJobs.size > 0) return;
  if (flushFrame !== null) {
    window.cancelAnimationFrame(flushFrame);
    flushFrame = null;
  }
  if (flushInnerFrame !== null) {
    window.cancelAnimationFrame(flushInnerFrame);
    flushInnerFrame = null;
  }
}

function scheduleRevealBatch(job: InitJob) {
  pendingJobs.add(job);
  if (flushFrame !== null || flushInnerFrame !== null) return;
  flushFrame = window.requestAnimationFrame(() => {
    flushFrame = null;
    flushInnerFrame = window.requestAnimationFrame(() => {
      flushInnerFrame = null;
      const jobs = Array.from(pendingJobs);
      pendingJobs.clear();
      const results = jobs.map((run) => run());
      for (const result of results) {
        result.apply(result.visible);
      }
    });
  });
}

export function ScrollReveal({
  children,
  as: Component = "div",
  stagger = false,
  variant = "focus",
  threshold = 0.1,
  rootMargin = "0px",
  delayMs = 0,
  className,
  onFocusCapture,
  ...props
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    delete node.dataset.motionReady;
    node.dataset.revealed = "false";

    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!("IntersectionObserver" in window) || motionQuery?.matches) {
      node.dataset.revealed = "true";
      return;
    }

    let observer: IntersectionObserver | null = null;
    let timeoutId: number | null = null;
    let cancelled = false;

    const job: InitJob = () => {
      const visible =
        cancelled ||
        node.getBoundingClientRect().top < window.innerHeight ||
        node.contains(document.activeElement);

      return {
        node,
        visible,
        apply(isVisible) {
          if (cancelled) return;
          if (isVisible) {
            node.dataset.revealed = "true";
            return;
          }
          if (stagger) {
            Array.from(node.children).forEach((child, index) => {
              (child as HTMLElement).style.setProperty(
                "--reveal-delay",
                `${Math.min(index, 3) * 80}ms`,
              );
            });
          }

          observer = new IntersectionObserver(
            (entries) => {
              if (entries[0]?.isIntersecting) {
                if (delayMs > 0) {
                  timeoutId = window.setTimeout(() => {
                    node.dataset.revealed = "true";
                  }, delayMs);
                } else {
                  node.dataset.revealed = "true";
                }
                observer?.unobserve(node);
              }
            },
            { threshold, rootMargin },
          );
          observer.observe(node);
          node.dataset.motionReady = "true";
        },
      };
    };

    scheduleRevealBatch(job);

    const finish = () => {
      if (!motionQuery?.matches) return;
      node.dataset.revealed = "true";
      cancelPendingJob(job);
      observer?.disconnect();
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
    motionQuery?.addEventListener("change", finish);

    return () => {
      cancelled = true;
      cancelPendingJob(job);
      observer?.disconnect();
      motionQuery?.removeEventListener("change", finish);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [pathname, threshold, rootMargin, delayMs, stagger, variant]);

  return (
    <Component
      ref={ref}
      data-revealed="false"
      data-variant={variant}
      className={cx(stagger ? styles.revealStagger : styles.reveal, className)}
      onFocusCapture={(event: FocusEvent<HTMLElement>) => {
        event.currentTarget.dataset.revealed = "true";
        onFocusCapture?.(event);
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
