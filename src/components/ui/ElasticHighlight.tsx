import type { ReactNode } from "react";
import styles from "./ui.module.css";

interface ElasticHighlightProps {
  children: ReactNode;
}

export function ElasticHighlight({ children }: ElasticHighlightProps) {
  return (
    <span className={styles.elasticHighlight} data-testid="elastic-highlight">
      <span className={styles.highlightInk} aria-hidden="true" />
      {children}
    </span>
  );
}
