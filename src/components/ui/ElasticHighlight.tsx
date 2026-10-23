"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cx } from "@/lib/cx";
import styles from "./ui.module.css";

interface ElasticHighlightProps {
  children: ReactNode;
}

export function ElasticHighlight({ children }: ElasticHighlightProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    if (!container || !path || !svg) return;

    // Check reduced motion safely (handles jsdom/test environments)
    const prefersReduced =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    const restingY = 16;
    let width = Math.round(container.getBoundingClientRect().width) || 120;
    let currentY = restingY;
    let vy = 0;
    let cxMid = width / 2;
    let animationFrameId: number | null = null;
    let isAnimating = false;

    // Physics parameters for realistic elastic guitar string feel
    const tension = 0.14;
    const damping = 0.83;

    function syncViewBox() {
      if (!svg) return;
      svg.setAttribute("viewBox", `0 0 ${width} 36`);
    }

    function setPath(midX: number, midY: number) {
      if (!path) return;
      const startX = 3;
      const endX = Math.max(startX + 10, width - 3);
      path.setAttribute(
        "d",
        `M ${startX} ${restingY} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${endX.toFixed(1)} ${restingY}`,
      );
    }

    function update() {
      const force = (restingY - currentY) * tension;
      vy += force;
      vy *= damping;
      currentY += vy;

      setPath(cxMid, currentY);

      if (Math.abs(vy) > 0.04 || Math.abs(currentY - restingY) > 0.04) {
        animationFrameId = requestAnimationFrame(update);
      } else {
        currentY = restingY;
        vy = 0;
        cxMid = width / 2;
        setPath(cxMid, restingY);
        isAnimating = false;
        animationFrameId = null;
      }
    }

    function pluck(intensity = 15, pluckX?: number) {
      if (prefersReduced) return;
      cxMid = typeof pluckX === "number" ? Math.max(15, Math.min(width - 15, pluckX)) : width / 2;
      vy += intensity;
      if (!isAnimating) {
        isAnimating = true;
        animationFrameId = requestAnimationFrame(update);
      }
    }

    syncViewBox();
    setPath(width / 2, restingY);

    // Initial entrance pluck to showcase the tactile elasticity on load
    const entranceTimer = setTimeout(() => {
      pluck(14);
    }, 450);

    function onPointerMove(e: PointerEvent) {
      const rect = container?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      pluck(12, mouseX);
    }

    function onPointerDown(e: PointerEvent) {
      const rect = container?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      pluck(20, mouseX);
    }

    container.addEventListener("pointerenter", onPointerMove as EventListener, { passive: true });
    container.addEventListener("pointerdown", onPointerDown as EventListener, { passive: true });

    // Handle container resize
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(([entry]) => {
        if (!entry) return;
        width = Math.round(entry.contentRect.width) || width;
        syncViewBox();
        if (!isAnimating) {
          cxMid = width / 2;
          setPath(cxMid, restingY);
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      clearTimeout(entranceTimer);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      container.removeEventListener("pointerenter", onPointerMove as EventListener);
      container.removeEventListener("pointerdown", onPointerDown as EventListener);
      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <span
      ref={containerRef}
      className={cx(styles.highlight, styles.elasticHighlight)}
      data-testid="elastic-highlight"
    >
      {children}
      <svg ref={svgRef} className={styles.elasticSvg} aria-hidden="true">
        <path ref={pathRef} className={styles.elasticPath} />
      </svg>
    </span>
  );
}
