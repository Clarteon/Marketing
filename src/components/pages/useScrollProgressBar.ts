"use client";

import { useCallback, useEffect, useRef } from "react";

export function useScrollProgressBar(scrollBodyRef: React.RefObject<HTMLDivElement | null>) {
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const progressFillRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPercentRef = useRef<number>(-1);

  const applyProgress = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    if (progressFillRef.current) {
      progressFillRef.current.style.transform = `scaleX(${clamped.toFixed(4)})`;
    }
    const percent = Math.round(clamped * 100);
    if (lastPercentRef.current !== percent && progressBarRef.current) {
      lastPercentRef.current = percent;
      progressBarRef.current.setAttribute("aria-valuenow", String(percent));
    }
  }, []);

  const resetProgress = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    applyProgress(0);
  }, [applyProgress]);

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const node = scrollBodyRef.current;
      if (!node) return;
      const scrollable = node.scrollHeight - node.clientHeight;
      applyProgress(scrollable <= 0 ? 1 : node.scrollTop / scrollable);
    });
  }, [scrollBodyRef, applyProgress]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    },
    [],
  );

  return { progressBarRef, progressFillRef, handleScroll, resetProgress };
}
