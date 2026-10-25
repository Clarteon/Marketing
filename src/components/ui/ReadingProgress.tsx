"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import styles from "./scroll-effects.module.css";

export function ReadingProgress({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const node = ref.current;
    const fill = fillRef.current;
    if (!node || !fill) return;

    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (motionQuery?.matches) {
        delete node.dataset.readingReady;
        return;
      }
      const { top, height } = node.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (window.innerHeight * 0.65 - top) / (height || 1)));
      fill.style.transform = `scaleY(${progress})`;
      node.dataset.readingReady = "true";
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motionQuery?.addEventListener("change", schedule);
    const resizeObserver =
      typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    resizeObserver?.observe(node);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motionQuery?.removeEventListener("change", schedule);
      resizeObserver?.disconnect();
    };
  }, [pathname]);

  return (
    <div ref={ref} className={styles.readingContent}>
      <span className={styles.readingTrack} aria-hidden="true">
        <span ref={fillRef} className={styles.readingFill} />
      </span>
      {children}
    </div>
  );
}
