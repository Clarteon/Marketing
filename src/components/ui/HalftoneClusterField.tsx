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

interface CachedDot {
  x: number;
  y: number;
  influence: number;
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
    let defaultX = 0;
    let defaultY = 0;
    let lensRadius = 56;
    let cachedDots: CachedDot[] = [];
    let glowGradient: CanvasGradient | null = null;
    let cachedLeft = 0;
    let cachedTop = 0;
    let rectDirty = true;

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

    function rebuildGrid() {
      const blobs = getBlobs(width, height);
      const mainBlob = blobs[0];
      defaultX = mainBlob ? mainBlob.cx + mainBlob.rx * 0.08 : width * 0.68;
      defaultY = mainBlob ? mainBlob.cy + mainBlob.ry * 0.36 : height * 0.48;
      lensRadius = width < 768 ? 42 : 56;

      if (tone === "ink" && variant === "hero" && mainBlob) {
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
        glowGradient = glow;
      } else {
        glowGradient = null;
      }

      const spacing = width < 768 ? 10.5 : 9.5;
      const containerW = Math.min(1200, Math.max(320, width - 48));
      const containerLeft = Math.max(24, (width - containerW) / 2);
      const startX =
        variant === "corners"
          ? 12
          : Math.max(12, Math.floor((containerLeft + containerW * 0.48) / spacing) * spacing);
      const maxY = variant === "hero" ? Math.floor(height * 0.69) : height - 14;

      const nextDots: CachedDot[] = [];
      for (let x = startX; x < width - 12; x += spacing) {
        for (let y = 14; y < maxY; y += spacing) {
          let maxInfluence = 0;
          for (let i = 0; i < blobs.length; i++) {
            const inf = computeInfluence(x, y, blobs[i]);
            if (inf > maxInfluence) maxInfluence = inf;
          }
          if (maxInfluence > 0.06) {
            nextDots.push({ x, y, influence: maxInfluence });
          }
        }
      }
      cachedDots = nextDots;
    }

    function renderFrame(): boolean {
      if (width <= 0 || height <= 0) return false;
      ctx.clearRect(0, 0, width, height);

      const targetX = isHovering ? pointerX : defaultX;
      const targetY = isHovering ? pointerY : defaultY;
      let needsMoreFrames = false;

      if (prefersReducedMotion || variant === "corners" || smoothX === -9999) {
        smoothX = targetX;
        smoothY = targetY;
      } else {
        const dx = targetX - smoothX;
        const dy = targetY - smoothY;
        if (Math.hypot(dx, dy) >= 0.25) {
          smoothX += dx * 0.16;
          smoothY += dy * 0.16;
          needsMoreFrames = true;
        } else {
          smoothX = targetX;
          smoothY = targetY;
        }
      }

      const isDark = tone === "ink";
      const mobileDim = width < 900 && variant !== "corners" ? 0.32 : 1;

      if (glowGradient) {
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, width, height);
      }

      const alphaBins = 4;
      const basePaths = Array.from({ length: alphaBins }, () => new Path2D());
      const hoverPath = new Path2D();
      const lensOuter = lensRadius * 1.18;
      const lensHoverCutoff = lensRadius * 1.1;

      for (let i = 0; i < cachedDots.length; i++) {
        const dot = cachedDots[i];
        const cdx = dot.x - smoothX;
        const cdy = dot.y - smoothY;
        const cDist = Math.sqrt(cdx * cdx + cdy * cdy);

        let radius = 0.95 + Math.pow(dot.influence, 0.88) * 3.45;
        if (variant !== "corners" && cDist < lensOuter) {
          const norm = cDist / lensRadius;
          if (norm < 1) {
            const indent = 0.36 + 0.64 * Math.pow(norm, 1.65);
            radius = Math.max(1.15, radius * indent);
          } else {
            const rim = 1 - (norm - 1) / 0.18;
            radius = Math.min(4.55, radius * (1 + rim * 0.14));
          }
        }

        const r = Math.min(4.5, radius);
        if (!isDark && isHovering && cDist < lensHoverCutoff) {
          hoverPath.moveTo(dot.x + r, dot.y);
          hoverPath.arc(dot.x, dot.y, r, 0, Math.PI * 2);
          continue;
        }

        const bin = Math.min(alphaBins - 1, Math.floor(dot.influence * alphaBins));
        basePaths[bin].moveTo(dot.x + r, dot.y);
        basePaths[bin].arc(dot.x, dot.y, r, 0, Math.PI * 2);
      }

      ctx.fillStyle = isDark ? "#C6F432" : "rgba(10, 10, 10, 0.14)";
      for (let bin = 0; bin < alphaBins; bin++) {
        const t = (bin + 0.5) / alphaBins;
        ctx.globalAlpha =
          (isDark ? Math.min(1, 0.52 + Math.pow(t, 0.7) * 0.48) : Math.min(0.72, 0.24 + t * 0.46)) *
          mobileDim;
        ctx.fill(basePaths[bin]);
      }

      if (!isDark && isHovering) {
        ctx.fillStyle = "#C6F432";
        ctx.globalAlpha = 0.8 * mobileDim;
        ctx.fill(hoverPath);
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
      return needsMoreFrames;
    }

    function tick() {
      animationFrameId = null;
      if (!isVisible || document.hidden) return;
      const keepGoing = renderFrame();
      if (!prefersReducedMotion && keepGoing && isVisible) {
        animationFrameId = window.requestAnimationFrame(tick);
      }
    }

    function ensureLoop() {
      if (prefersReducedMotion || variant === "corners") {
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
      const nextWidth = Math.max(1, Math.round(rect.width));
      const nextHeight = Math.max(1, Math.round(rect.height));
      const nextDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      rectDirty = true;
      if (nextWidth === width && nextHeight === height && nextDpr === dpr) {
        return;
      }
      width = nextWidth;
      height = nextHeight;
      dpr = nextDpr;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildGrid();
      renderFrame();
    }

    function readCanvasOrigin() {
      if (!rectDirty) return;
      const rect = canvas!.getBoundingClientRect();
      cachedLeft = rect.left;
      cachedTop = rect.top;
      rectDirty = false;
    }

    function handlePointerMove(event: PointerEvent) {
      if (variant === "corners" || event.pointerType === "touch") return;
      readCanvasOrigin();
      pointerX = event.clientX - cachedLeft;
      pointerY = event.clientY - cachedTop;
      isHovering = true;
      ensureLoop();
    }

    function handlePointerLeave() {
      if (variant === "corners") return;
      isHovering = false;
      ensureLoop();
    }

    function handleScroll() {
      rectDirty = true;
    }

    function handleMotionChange(event: MediaQueryListEvent) {
      prefersReducedMotion = event.matches;
      ensureLoop();
    }

    handleResize();

    const resizeObserver =
      "ResizeObserver" in window ? new ResizeObserver(() => handleResize()) : null;
    resizeObserver?.observe(parent);

    const intersectionObserver =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              isVisible = entries.some((entry) => entry.isIntersecting);
              if (isVisible) renderFrame();
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
    window.addEventListener("scroll", handleScroll, { passive: true });
    motionQuery?.addEventListener?.("change", handleMotionChange);

    return () => {
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      parent.removeEventListener("pointermove", handlePointerMove);
      parent.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
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
