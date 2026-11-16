"use client";

import { useRef } from "react";
import { usePointerSpotlight } from "./usePointerSpotlight";
import styles from "./ui.module.css";

export function SectionSpotlight() {
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  usePointerSpotlight(spotlightRef);

  return (
    <div
      ref={spotlightRef}
      className={styles.sectionSpotlight}
      data-testid="section-spotlight"
      data-hovering="false"
      aria-hidden="true"
    />
  );
}
