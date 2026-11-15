"use client";

import { useEffect, useState } from "react";
import styles from "./pages.module.css";

export function ArticleReadingBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const target = document.getElementById("article-doc-root");
      if (!target) {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) {
          setProgress(0);
          return;
        }
        setProgress(Math.min(1, Math.max(0, window.scrollY / docHeight)));
        return;
      }

      const rect = target.getBoundingClientRect();
      const totalScrollable = Math.max(1, target.offsetHeight - window.innerHeight * 0.65);
      const passed = Math.max(0, -rect.top + window.innerHeight * 0.15);
      setProgress(Math.min(1, passed / totalScrollable));
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div
      className={styles.articleReadingTrack}
      role="progressbar"
      aria-label="Article reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      <span className={styles.articleReadingFill} style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
