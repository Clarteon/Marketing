"use client";

import { useEffect, useRef } from "react";
import styles from "./pages.module.css";

export function ArticleReadingBar() {
  const barRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let rafId: number | null = null;
    let lastPercent = -1;

    const updateProgress = () => {
      rafId = null;
      const target =
        document.getElementById("article-doc-root") ??
        document.getElementById("case-study-doc-root");
      let value = 0;

      if (!target) {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        value = docHeight <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / docHeight));
      } else {
        const rect = target.getBoundingClientRect();
        const totalScrollable = Math.max(1, target.offsetHeight - window.innerHeight * 0.65);
        const passed = Math.max(0, -rect.top + window.innerHeight * 0.15);
        value = Math.min(1, passed / totalScrollable);
      }

      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${value.toFixed(4)})`;
      }
      const percent = Math.round(value * 100);
      if (lastPercent !== percent && barRef.current) {
        lastPercent = percent;
        barRef.current.setAttribute("aria-valuenow", String(percent));
      }
    };

    const scheduleUpdate = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={barRef}
      className={styles.articleReadingTrack}
      role="progressbar"
      aria-label="Article reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
    >
      <span ref={fillRef} className={styles.articleReadingFill} />
    </div>
  );
}
