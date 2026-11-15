"use client";

import { useEffect, useRef } from "react";
import styles from "./ui.module.css";

export function SectionSpotlight() {
  const spotlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = spotlightRef.current;
    if (!el) return;
    const section = el.closest("section") ?? el.parentElement;
    if (!section) return;

    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia?.("(pointer: fine)");
    if (motionQuery?.matches || (finePointer && !finePointer.matches)) return;

    let rafId: number | null = null;
    let clientX = 0;
    let clientY = 0;
    let currentX = 0;
    let currentY = 0;
    let hovering = false;
    let initialized = false;
    let snapOnTick = false;

    const writePosition = (x: number, y: number) => {
      el.style.setProperty("--spotlight-x", `${x.toFixed(1)}px`);
      el.style.setProperty("--spotlight-y", `${y.toFixed(1)}px`);
    };

    const tick = () => {
      rafId = null;
      if (!hovering || document.hidden) return;

      const rect = el.getBoundingClientRect();
      if (snapOnTick) {
        const inside =
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom;
        if (!inside) {
          hovering = false;
          initialized = false;
          snapOnTick = false;
          el.dataset.hovering = "false";
          return;
        }
      }

      const targetX = clientX - rect.left;
      const targetY = clientY - rect.top;

      if (!initialized || snapOnTick) {
        currentX = targetX;
        currentY = targetY;
        initialized = true;
        snapOnTick = false;
        writePosition(currentX, currentY);
        return;
      }

      const lerp = 0.28;
      currentX += (targetX - currentX) * lerp;
      currentY += (targetY - currentY) * lerp;

      if (Math.hypot(targetX - currentX, targetY - currentY) > 0.5) {
        writePosition(currentX, currentY);
        rafId = window.requestAnimationFrame(tick);
      } else {
        currentX = targetX;
        currentY = targetY;
        writePosition(currentX, currentY);
      }
    };

    const schedule = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const onPointerEnter = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      clientX = event.clientX;
      clientY = event.clientY;
      hovering = true;
      initialized = false;
      snapOnTick = false;
      el.dataset.hovering = "true";
      schedule();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      clientX = event.clientX;
      clientY = event.clientY;
      if (!hovering) {
        hovering = true;
        initialized = false;
        snapOnTick = false;
        el.dataset.hovering = "true";
      }
      schedule();
    };

    const onScroll = () => {
      if (!hovering) return;
      snapOnTick = true;
      schedule();
    };

    const onPointerLeave = () => {
      hovering = false;
      initialized = false;
      snapOnTick = false;
      el.dataset.hovering = "false";
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    section.addEventListener("pointerenter", onPointerEnter, { passive: true });
    section.addEventListener("pointermove", onPointerMove, { passive: true });
    section.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      section.removeEventListener("pointerenter", onPointerEnter);
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

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
