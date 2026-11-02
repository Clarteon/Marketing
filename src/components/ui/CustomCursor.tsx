"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./custom-cursor.module.css";

function subscribeSupport(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const pointerQuery = window.matchMedia("(pointer: fine)");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  pointerQuery.addEventListener("change", callback);
  motionQuery.addEventListener("change", callback);

  return () => {
    pointerQuery.removeEventListener("change", callback);
    motionQuery.removeEventListener("change", callback);
  };
}

function getClientSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return hasFinePointer && !prefersReducedMotion;
}

function getServerSnapshot(): boolean {
  return false;
}

export function CustomCursor() {
  const isSupported = useSyncExternalStore(subscribeSupport, getClientSnapshot, getServerSnapshot);

  const [isHovered, setIsHovered] = useState(false);
  const [isLimeTarget, setIsLimeTarget] = useState(false);
  const [isDarkTone, setIsDarkTone] = useState(false);
  const [isTextInput, setIsTextInput] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const circleRef = useRef<HTMLDivElement>(null);
  const isClickingRef = useRef(false);
  const isHoveredRef = useRef(false);
  const isLimeTargetRef = useRef(false);

  useEffect(() => {
    if (!isSupported) return;

    // Enable global hiding of default arrow & hand cursor
    document.documentElement.classList.add("custom-cursor-active");

    let mouseX = -100;
    let mouseY = -100;
    let currentScale = 1;
    let initialized = false;
    let visible = false;
    let rafId: number | null = null;

    function schedule() {
      if (rafId === null && visible && !document.hidden) {
        rafId = requestAnimationFrame(renderLoop);
      }
    }

    function show() {
      if (!visible) {
        visible = true;
        setIsVisible(true);
      }
      schedule();
    }

    function hide() {
      visible = false;
      setIsVisible(false);
      isClickingRef.current = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    }

    const onPointerMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      initialized = true;
      show();
    };

    const onPointerOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check for form inputs / editable text fields
      const isInput = Boolean(
        target.closest(
          'input:not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]',
        ),
      );
      setIsTextInput(isInput);

      // Check if target is a lime-colored component (e.g. primary button, lime tile, lime chip)
      const isLime = Boolean(
        target.closest(
          '[class*="primary"], [class*="toneLime"], [class*="tile"], [data-variant="primary"], .bg-lime',
        ),
      );
      setIsLimeTarget(isLime);
      isLimeTargetRef.current = isLime;

      // Check for interactive targets (links, buttons, cards)
      const isInteractive = Boolean(
        target.closest(
          'a, button, [role="button"], input[type="submit"], input[type="button"], label, select, summary, [data-cursor="focus"], [data-cursor="interactive"], [class*="problemCard"], [class*="cardInteractive"], [class*="listItem"], [class*="step"]',
        ),
      );
      setIsHovered(isInteractive);
      isHoveredRef.current = isInteractive;

      // Check if current section/element has dark ink tone, accounting for nested light containers
      const darkContainer = target.closest('[class*="toneInk"], [data-tone="ink"], .dark-surface');
      const lightContainer = target.closest(
        '[class*="bookingFormPanel"], [class*="tonePaper"], [class*="toneStone"], [data-tone="paper"], [data-tone="stone"]',
      );
      const isDark = Boolean(
        darkContainer && (!lightContainer || !darkContainer.contains(lightContainer)),
      );
      setIsDarkTone(isDark);
      schedule();
    };

    const onPointerDown = () => {
      isClickingRef.current = true;
      schedule();
    };

    const onPointerUp = () => {
      isClickingRef.current = false;
      schedule();
    };

    const onMouseLeave = () => {
      hide();
    };

    const onMouseEnter = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      initialized = true;
      show();
    };

    const onWindowBlur = () => {
      hide();
    };

    const onVisibilityChange = () => {
      if (document.hidden) hide();
    };

    function renderLoop() {
      rafId = null;
      if (!initialized || !visible || document.hidden) return;

      // Determine spring target scale
      let targetScale = 1.0;
      if (isClickingRef.current) {
        targetScale = 0.75;
      } else if (isHoveredRef.current) {
        targetScale = isLimeTargetRef.current ? 2.1 : 2.0;
      }

      currentScale += (targetScale - currentScale) * 0.3;
      const isSettled = Math.abs(targetScale - currentScale) < 0.001;
      if (isSettled) currentScale = targetScale;

      if (circleRef.current) {
        // Follow the latest pointer position without a trailing spring; keep the scale feedback.
        circleRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) scale(${currentScale.toFixed(3)})`;
      }

      if (!isSettled) schedule();
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerover", onPointerOver, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerover", onPointerOver);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isSupported]);

  if (!isSupported) {
    return null;
  }

  const isHidden = !isVisible || isTextInput;

  const circleClasses = [
    styles.circle,
    isHovered && !isLimeTarget ? styles.hovered : "",
    isHovered && isLimeTarget ? styles.hoveredLime : "",
    isDarkTone ? styles.circleDark : "",
    isHidden ? styles.hidden : "",
  ]
    .filter(Boolean)
    .join(" ");

  return <div ref={circleRef} aria-hidden="true" className={circleClasses} />;
}
