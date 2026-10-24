"use client";

import type { ReactNode } from "react";
import styles from "./ui.module.css";

interface ElasticHighlightProps {
  children: ReactNode;
}

export function ElasticHighlight({ children }: ElasticHighlightProps) {
  return (
    <span className={styles.elasticHighlight} data-testid="elastic-highlight">
      {children}
      <svg
        className={styles.elasticSvg}
        viewBox="0 0 200 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className={styles.sketchStroke}
          d="M 0 32 C 10 28, 21 18, 38 19 C 60 21, 83 16, 106 19 C 130 22, 153 16, 177 18 C 188 18, 196 25, 200 32 C 196 38, 186 45, 173 44 C 150 42, 130 49, 105 45 C 82 41, 60 48, 38 43 C 22 40, 10 37, 0 32 Z"
        />
      </svg>
    </span>
  );
}
