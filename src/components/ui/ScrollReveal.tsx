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
    let frame = 0;
    let timeoutId: number | null = null;

    const initialize = () => {
      // Sample after Next.js has restored the new route's scroll position.
      if (
        node.getBoundingClientRect().top < window.innerHeight ||
        node.contains(document.activeElement)
      ) {
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
    };

    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(initialize);
    });

    const finish = () => {
      if (!motionQuery?.matches) return;
      node.dataset.revealed = "true";
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
    motionQuery?.addEventListener("change", finish);

    return () => {
      window.cancelAnimationFrame(frame);
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
