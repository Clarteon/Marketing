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

const STEP_THRESHOLDS = [0.04, 0.3, 0.58, 0.84];

const toneClasses: Record<"paper" | "stone" | "ink", string> = {
  ink: "",
  paper: styles.tonePaper,
  stone: styles.toneStone,
};

export function ProcessConduit({ steps, tone = "ink", className }: ProcessConduitProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stepsListRef = useRef<HTMLOListElement | null>(null);
  const milestoneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const stepHeaderRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function measureVerticalTrack() {
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
    }

    if (prefersReduced) {
      measureVerticalTrack();
      containerRef.current?.style.setProperty("--process-progress-factor", "1");
      milestoneRefs.current.forEach((el) => el?.classList.add(styles.milestoneActive));
      stepRefs.current.forEach((el) => el?.classList.add(styles.stepActive));
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const runway = container.closest("[data-conduit-runway]") ?? container.closest("section");

    let rafId: number | null = null;
    let inView = !("IntersectionObserver" in window);
    let lastProgress = "";
    const activeSteps = STEP_THRESHOLDS.map((_, index) => index === 0);

    function handleScroll() {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const runwayRect = runway ? runway.getBoundingClientRect() : rect;
      const viewportHeight = window.innerHeight;

      let progress = 0;
      if (runwayRect.height > rect.height * 1.4) {
        const startTop = viewportHeight * 0.42;
        const endTop = viewportHeight * 0.94 - runwayRect.height;
        const travel = Math.max(1, startTop - endTop);
        progress = Math.min(1, Math.max(0, (startTop - runwayRect.top) / travel));
      } else {
        const startTrigger = viewportHeight * 0.72;
        const endTrigger = viewportHeight * 0.38;
        const totalSpan = Math.max(1, startTrigger - endTrigger + rect.height * 0.78);
        const currentSpan = startTrigger - rect.top;
        progress = Math.min(1, Math.max(0, currentSpan / totalSpan));
      }

      const nextProgress = progress.toFixed(3);
      if (nextProgress !== lastProgress) {
        container.style.setProperty("--process-progress-factor", nextProgress);
        lastProgress = nextProgress;
      }

      STEP_THRESHOLDS.forEach((threshold, index) => {
        const isActive = progress >= threshold || (index === 0 && progress >= 0.02);
        if (activeSteps[index] === isActive) return;
        activeSteps[index] = isActive;
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
      if (rafId !== null || !inView || document.hidden) return;
      rafId = window.requestAnimationFrame(() => {
        handleScroll();
        rafId = null;
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      measureVerticalTrack();
      onScroll();
    });
    if (stepsListRef.current) resizeObserver.observe(stepsListRef.current);
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            handleScroll();
          })
        : null;
    observer?.observe(runway ?? container);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    rafId = window.requestAnimationFrame(() => {
      measureVerticalTrack();
      handleScroll();
      rafId = null;
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      resizeObserver.disconnect();
      observer?.disconnect();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={containerRef} className={cx(styles.conduitContainer, toneClasses[tone], className)}>
      {/* Horizontal Laser Conduit Track (Desktop) */}
      <div className={styles.trackWrapper} aria-hidden="true">
        <div className={styles.trackLine}>
          <div className={styles.fillBar} />
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
              <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
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
