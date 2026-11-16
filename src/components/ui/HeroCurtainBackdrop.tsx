"use client";

import { useRef } from "react";
import { usePointerSpotlight } from "./usePointerSpotlight";
import styles from "./ui.module.css";

export function HeroCurtainBackdrop() {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  usePointerSpotlight(backdropRef);

  return (
    <div
      ref={backdropRef}
      className={styles.heroCurtainBackdrop}
      data-testid="hero-curtain-backdrop"
      data-hovering="false"
      aria-hidden="true"
    />
  );
}
