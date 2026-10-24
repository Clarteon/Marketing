"use client";

import { useEffect, useRef } from "react";
import type { StepData } from "@/lib/page-schemas";
import { cx } from "@/lib/cx";
import styles from "./process-conduit.module.css";

interface ProcessConduitProps {
  steps: StepData[];
  tone?: "paper" | "stone" | "ink";
  className?: string;
}

const STEP_THRESHOLDS = [0.08, 0.32, 0.6, 0.85];

const toneClasses: Record<"paper" | "stone" | "ink", string> = {
  ink: "",
  paper: styles.tonePaper,
  stone: styles.toneStone,
};

export function ProcessConduit({ steps, tone = "ink", className }: ProcessConduitProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stepsListRef = useRef<HTMLOListElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const milestoneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const stepHeaderRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function updateVerticalTrack(progress: number) {
      const container = containerRef.current;
      const list = stepsListRef.current;
      const firstHeader = stepHeaderRefs.current[0];
      const lastHeader = stepHeaderRefs.current[stepHeaderRefs.current.length - 1];
      if (!container || !list || !firstHeader || !lastHeader) return;

      const listTop = list.getBoundingClientRect().top;
      const firstRect = firstHeader.getBoundingClientRect();
      const lastRect = lastHeader.getBoundingClientRect();
      const trackStart = firstRect.top + firstRect.height / 2 - listTop;
      const trackLength = Math.max(
        0,
        lastRect.top + lastRect.height / 2 - firstRect.top - firstRect.height / 2,
      );

      container.style.setProperty("--process-track-start", `${trackStart}px`);
      container.style.setProperty("--process-track-length", `${trackLength}px`);
      container.style.setProperty("--process-progress-factor", progress.toFixed(3));
    }

    if (prefersReduced) {
      if (fillRef.current) fillRef.current.style.width = "100%";
      updateVerticalTrack(1);
      milestoneRefs.current.forEach((el) => el?.classList.add(styles.milestoneActive));
      stepRefs.current.forEach((el) => el?.classList.add(styles.stepActive));
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    function handleScroll() {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const startTrigger = viewportHeight * 0.75;
      const totalSpan = rect.height + viewportHeight * 0.45;
      const currentSpan = startTrigger - rect.top;
      const progress = Math.min(1, Math.max(0, currentSpan / totalSpan));

      if (fillRef.current) {
        fillRef.current.style.width = `${(progress * 100).toFixed(1)}%`;
      }
      updateVerticalTrack(progress);

      STEP_THRESHOLDS.forEach((threshold, index) => {
        const isActive = progress >= threshold || (index === 0 && progress >= 0.02);
        const milestoneEl = milestoneRefs.current[index];
        const stepEl = stepRefs.current[index];
        if (milestoneEl) {
          milestoneEl.classList.toggle(styles.milestoneActive, isActive);
        }
        if (stepEl) {
          stepEl.classList.toggle(styles.stepActive, isActive);
          stepEl.dataset.stepActive = isActive ? "true" : "false";
        }
      });
    }

    function onScroll() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        handleScroll();
        rafId = null;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // Initial evaluation via RAF so it is not synchronous within the effect body
    rafId = window.requestAnimationFrame(() => {
      handleScroll();
      rafId = null;
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={containerRef} className={cx(styles.conduitContainer, toneClasses[tone], className)}>
      {/* Horizontal Laser Conduit Track (Desktop) */}
      <div className={styles.trackWrapper} aria-hidden="true">
        <div className={styles.trackLine}>
          <div ref={fillRef} className={styles.fillBar} style={{ width: "8%" }} />
          <div className={styles.milestones}>
            {steps.map((_, index) => (
              <div
                key={index}
                ref={(el) => {
                  milestoneRefs.current[index] = el;
                }}
                className={cx(styles.milestone, index === 0 && styles.milestoneActive)}
              >
                <div className={styles.milestoneNode}>
                  <div className={styles.milestoneDot} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Semantic Process Steps */}
      <ol ref={stepsListRef} className={styles.steps}>
        {steps.map((step, index) => (
          <li
            key={step.title}
            ref={(el) => {
              stepRefs.current[index] = el;
            }}
            className={cx(styles.step, index === 0 && styles.stepActive)}
            data-step-active={index === 0 ? "true" : "false"}
          >
            <div
              ref={(el) => {
                stepHeaderRefs.current[index] = el;
              }}
              className={styles.stepHeader}
            >
              <span className={styles.stepNumber}>{index + 1}</span>
              <span className={styles.stepBeacon} aria-hidden="true" />
            </div>
            <h3 className={styles.stepTitle}>{step.title}</h3>
            <p className={styles.stepBody}>{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
