"use client";

import { useEffect, useRef } from "react";
import { cx } from "@/lib/cx";
import type { Tone } from "./Section";
import styles from "./halftone-cluster.module.css";

export type HalftoneVariant = "hero" | "page" | "corners";

interface HalftoneClusterFieldProps {
  tone?: Tone;
  variant?: HalftoneVariant;
  className?: string;
}

interface BlobSpec {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  px: number;
  py: number;
  gx: number;
  gy: number;
}

export function HalftoneClusterField({
  tone = "ink",
  variant = "hero",
  className,
}: HalftoneClusterFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    const parent = canvas.closest("section") || canvas.parentElement;
    if (!parent) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationFrameId: number | null = null;
    let isVisible = !("IntersectionObserver" in window);
    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let prefersReducedMotion = motionQuery?.matches ?? false;

    let pointerX = -9999;
    let pointerY = -9999;
    let smoothX = -9999;
    let smoothY = -9999;
    let isHovering = false;

    function getBlobs(w: number, h: number): BlobSpec[] {
      const mobileScale = w < 768 ? 0.58 : w < 1024 ? 0.78 : 1;
      const containerW = Math.min(1200, Math.max(320, w - 48));
      const containerLeft = Math.max(24, (w - containerW) / 2);

      if (variant === "corners") {
        return [
          {
            cx: w * 0.91,
            cy: h * 0.16,
            rx: 112 * mobileScale,
            ry: 96 * mobileScale,
            px: 2.1,
            py: 2.1,
            gx: -0.2,
            gy: 0.2,
          },
          {
            cx: w * 0.08,
            cy: h * 0.84,
            rx: 104 * mobileScale,
            ry: 88 * mobileScale,
            px: 2.1,
            py: 2.1,
            gx: 0.2,
            gy: -0.2,
          },
        ];
      }

      if (variant === "page") {
        return [
          {
            cx: containerLeft + containerW * 0.76,
            cy: h * 0.48,
            rx: 88 * mobileScale,
            ry: 118 * mobileScale,
            px: 2.3,
            py: 2.4,
            gx: 0.24,
            gy: -0.2,
          },
          {
            cx: containerLeft + containerW * 0.91,
            cy: h * 0.3,
            rx: 50 * mobileScale,
            ry: 62 * mobileScale,
            px: 2.1,
            py: 2.2,
            gx: -0.22,
            gy: -0.18,
          },
        ];
      }

      return [
        {
          cx: containerLeft + containerW * 0.635,
          cy: h * 0.415,
          rx: 94 * mobileScale,
          ry: 136 * mobileScale,
          px: 2.35,
          py: 2.65,
          gx: 0.3,
          gy: -0.24,
        },
        {
          cx: containerLeft + containerW * 0.82,
          cy: h * 0.245,
          rx: 53 * mobileScale,
          ry: 68 * mobileScale,
          px: 2.15,
          py: 2.2,
          gx: -0.26,
          gy: -0.2,
        },
        {
          cx: containerLeft + containerW * 0.835,
          cy: h * 0.525,
          rx: 53 * mobileScale,
          ry: 53 * mobileScale,
          px: 2.0,
          py: 2.0,
          gx: -0.16,
          gy: -0.16,
        },
      ];
    }

    function computeInfluence(x: number, y: number, blob: BlobSpec): number {
      const nx = (x - blob.cx) / blob.rx;
      const ny = (y - blob.cy) / blob.ry;
      const absX = Math.abs(nx);
      const absY = Math.abs(ny);
      if (absX >= 1 || absY >= 1) return 0;

      const superDist = Math.pow(absX, blob.px) + Math.pow(absY, blob.py);
      if (superDist >= 1) return 0;

      const base = Math.pow(1 - superDist, 0.58);
      const directionalBias = 1 + nx * blob.gx + ny * blob.gy;
      return Math.min(1, Math.max(0, base * directionalBias));
    }

    function renderFrame() {
      if (width <= 0 || height <= 0) return;
      ctx.clearRect(0, 0, width, height);

      const blobs = getBlobs(width, height);
      const mainBlob = blobs[0];
      const defaultX = mainBlob ? mainBlob.cx + mainBlob.rx * 0.08 : width * 0.68;
      const defaultY = mainBlob ? mainBlob.cy + mainBlob.ry * 0.36 : height * 0.48;
      const targetX = isHovering ? pointerX : defaultX;
      const targetY = isHovering ? pointerY : defaultY;

      if (prefersReducedMotion || smoothX === -9999) {
        smoothX = targetX;
        smoothY = targetY;
      } else {
        smoothX += (targetX - smoothX) * 0.16;
        smoothY += (targetY - smoothY) * 0.16;
      }

      const isDark = tone === "ink";
      const mobileDim = width < 900 && variant !== "corners" ? 0.32 : 1;

      if (isDark && variant === "hero" && mainBlob) {
        const glowRadius = Math.max(mainBlob.rx, mainBlob.ry) * 2.1;
        const glow = ctx.createRadialGradient(
          mainBlob.cx + mainBlob.rx * 0.65,
          mainBlob.cy,
          12,
          mainBlob.cx + mainBlob.rx * 0.65,
          mainBlob.cy,
          glowRadius,
        );
        glow.addColorStop(0, "rgba(198, 244, 50, 0.065)");
        glow.addColorStop(0.55, "rgba(198, 244, 50, 0.022)");
        glow.addColorStop(1, "rgba(198, 244, 50, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      const spacing = width < 768 ? 10.5 : 9.5;
      const containerW = Math.min(1200, Math.max(320, width - 48));
      const containerLeft = Math.max(24, (width - containerW) / 2);
      const startX =
        variant === "corners"
          ? 12
          : Math.max(12, Math.floor((containerLeft + containerW * 0.48) / spacing) * spacing);
      const maxY = variant === "hero" ? Math.floor(height * 0.69) : height - 14;
      const lensRadius = width < 768 ? 42 : 56;

      for (let x = startX; x < width - 12; x += spacing) {
        for (let y = 14; y < maxY; y += spacing) {
          let maxInfluence = 0;
          for (const blob of blobs) {
            const inf = computeInfluence(x, y, blob);
            if (inf > maxInfluence) maxInfluence = inf;
          }

          if (maxInfluence <= 0.06) continue;

          const cdx = x - smoothX;
          const cdy = y - smoothY;
          const cDist = Math.sqrt(cdx * cdx + cdy * cdy);

          let radius = 0.95 + Math.pow(maxInfluence, 0.88) * 3.45;
          if (variant !== "corners" && cDist < lensRadius * 1.18) {
            const norm = cDist / lensRadius;
            if (norm < 1) {
              const indent = 0.36 + 0.64 * Math.pow(norm, 1.65);
              radius = Math.max(1.15, radius * indent);
            } else {
              const rim = 1 - (norm - 1) / 0.18;
              radius = Math.min(4.55, radius * (1 + rim * 0.14));
            }
          }

          ctx.beginPath();
          ctx.arc(x, y, Math.min(4.5, radius), 0, Math.PI * 2);

          if (isDark) {
            ctx.fillStyle = "#C6F432";
            ctx.globalAlpha = Math.min(1, 0.52 + Math.pow(maxInfluence, 0.7) * 0.48) * mobileDim;
          } else {
            const nearHover = isHovering && cDist < lensRadius * 1.1;
            if (nearHover) {
              ctx.fillStyle = "#C6F432";
              ctx.globalAlpha = Math.min(0.92, 0.58 + maxInfluence * 0.34) * mobileDim;
            } else {
              ctx.fillStyle = "rgba(10, 10, 10, 0.14)";
              ctx.globalAlpha = Math.min(0.72, 0.24 + maxInfluence * 0.46) * mobileDim;
            }
          }
          ctx.fill();
        }
      }

      if (variant === "hero" && isDark && !isHovering) {
        ctx.globalAlpha = mobileDim;
        ctx.beginPath();
        ctx.arc(smoothX, smoothY, lensRadius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.76)";
        ctx.lineWidth = 1.15;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    function tick() {
      renderFrame();
      if (!prefersReducedMotion && isVisible) {
        animationFrameId = window.requestAnimationFrame(tick);
      } else {
        animationFrameId = null;
      }
    }

    function ensureLoop() {
      if (prefersReducedMotion) {
        if (animationFrameId !== null) {
          window.cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        renderFrame();
        return;
      }
      if (isVisible && animationFrameId === null) {
        animationFrameId = window.requestAnimationFrame(tick);
      }
    }

    function handleResize() {
      const rect = parent!.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderFrame();
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      isHovering = true;
      ensureLoop();
    }

    function handlePointerLeave() {
      isHovering = false;
    }

    function handleMotionChange(event: MediaQueryListEvent) {
      prefersReducedMotion = event.matches;
      ensureLoop();
    }

    handleResize();
    ensureLoop();

    const resizeObserver =
      "ResizeObserver" in window ? new ResizeObserver(() => handleResize()) : null;
    resizeObserver?.observe(parent);

    const intersectionObserver =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              isVisible = entries.some((entry) => entry.isIntersecting);
              if (isVisible) ensureLoop();
              else if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
              }
            },
            { threshold: 0.02 },
          )
        : null;
    intersectionObserver?.observe(parent);

    parent.addEventListener("pointermove", handlePointerMove, { passive: true });
    parent.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    motionQuery?.addEventListener?.("change", handleMotionChange);

    return () => {
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      parent.removeEventListener("pointermove", handlePointerMove);
      parent.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("resize", handleResize);
      motionQuery?.removeEventListener?.("change", handleMotionChange);
    };
  }, [tone, variant]);

  return (
    <div
      className={cx(styles.clusterField, className)}
      aria-hidden="true"
      data-testid="halftone-cluster-field"
    >
      <canvas ref={canvasRef} className={styles.clusterCanvas} tabIndex={-1} />
    </div>
  );
}
