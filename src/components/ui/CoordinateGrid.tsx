"use client";

import { useEffect, useRef } from "react";
import styles from "./ui.module.css";

type GridTone = "paper" | "stone" | "ink" | "lime";

interface CoordinateGridProps {
  tone?: GridTone;
  className?: string;
}

interface GridDot {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isCross: boolean;
  offset: number;
}

interface SignalBeam {
  axis: "x" | "y";
  index: number;
  pos: number;
  length: number;
  speed: number;
  alpha: number;
  direction: 1 | -1;
}

const SPACING = 40;
const MAX_DIST = 185;

export function CoordinateGrid({ tone = "paper", className }: CoordinateGridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Safe guard for environments without full 2D canvas context (e.g., jsdom)
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    const parent = canvas.closest("section") || canvas.parentElement;
    if (!parent) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let dots: GridDot[] = [];
    let signalBeams: SignalBeam[] = [];
    let animationFrameId: number | null = null;
    let isVisible = true;
    let time = 0;

    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      isHovering: false,
    };

    function initSignalBeams() {
      const isDark = tone === "ink";
      signalBeams = [
        {
          axis: "x",
          index: Math.max(1, Math.floor(rows * 0.3)),
          pos: -60,
          length: 140,
          speed: 2.2,
          alpha: isDark ? 0.65 : 0.6,
          direction: 1,
        },
        {
          axis: "y",
          index: Math.max(1, Math.floor(cols * 0.25)),
          pos: -80,
          length: 120,
          speed: 1.8,
          alpha: isDark ? 0.55 : 0.5,
          direction: 1,
        },
        {
          axis: "x",
          index: Math.max(1, Math.floor(rows * 0.7)),
          pos: width + 60,
          length: 150,
          speed: 2.4,
          alpha: isDark ? 0.6 : 0.55,
          direction: -1,
        },
      ];
    }

    function initDots() {
      dots = [];
      cols = Math.ceil(width / SPACING) + 1;
      rows = Math.ceil(height / SPACING) + 1;

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const isCross = c > 0 && r > 0 && c % 5 === 0 && r % 4 === 0;
          const baseX = c * SPACING;
          const baseY = r * SPACING;
          dots.push({
            baseX,
            baseY,
            x: baseX,
            y: baseY,
            vx: 0,
            vy: 0,
            isCross,
            offset: (c * 0.4 + r * 0.6) * 0.35,
          });
        }
      }

      initSignalBeams();
    }

    function resize() {
      if (!canvas || !parent) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = parent.getBoundingClientRect();
      width = Math.max(rect.width, 320);
      height = Math.max(rect.height, 240);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      initDots();
    }

    // Check prefers-reduced-motion safely
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function renderStatic() {
      ctx.clearRect(0, 0, width, height);
      const isDark = tone === "ink";

      // Calibrated crisp resting lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(10, 10, 10, 0.085)";
      ctx.beginPath();
      for (let c = 0; c <= cols; c++) {
        const x = c * SPACING;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let r = 0; r <= rows; r++) {
        const y = r * SPACING;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Static dots and precision crosshairs
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        if (dot.isCross) {
          ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(10, 10, 10, 0.32)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dot.baseX - 4.5, dot.baseY);
          ctx.lineTo(dot.baseX + 4.5, dot.baseY);
          ctx.moveTo(dot.baseX, dot.baseY - 4.5);
          ctx.lineTo(dot.baseX, dot.baseY + 4.5);
          ctx.stroke();
        } else {
          ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(10, 10, 10, 0.22)";
          ctx.beginPath();
          ctx.arc(dot.baseX, dot.baseY, 1.75, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function render() {
      if (!isVisible) return;
      time += 0.015;

      // Smooth mouse lerping with momentum
      mouse.x += (mouse.targetX - mouse.x) * 0.12;
      mouse.y += (mouse.targetY - mouse.y) * 0.12;

      ctx.clearRect(0, 0, width, height);

      const isDark = tone === "ink";
      // Calibrated noticeable yet balanced resting colors
      const restingLineColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(10, 10, 10, 0.085)";
      const restingDotColor = isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(10, 10, 10, 0.22)";
      const restingCrossColor = isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(10, 10, 10, 0.32)";
      const activeColor = "#c6f432"; // Clarteon Lime

      // 1. Draw base coordinate lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = restingLineColor;
      ctx.beginPath();
      for (let c = 0; c <= cols; c++) {
        const x = c * SPACING;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let r = 0; r <= rows; r++) {
        const y = r * SPACING;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 2. Traveling ambient signal beams (subtle, rhythmic, intelligent pulse)
      for (let b = 0; b < signalBeams.length; b++) {
        const beam = signalBeams[b];
        beam.pos += beam.speed * beam.direction;

        const maxBoundary = beam.axis === "x" ? width : height;
        if (beam.direction === 1 && beam.pos - beam.length > maxBoundary) {
          beam.pos = -beam.length - Math.random() * 80;
          beam.index = Math.floor(Math.random() * (beam.axis === "x" ? rows : cols));
        } else if (beam.direction === -1 && beam.pos + beam.length < 0) {
          beam.pos = maxBoundary + beam.length + Math.random() * 80;
          beam.index = Math.floor(Math.random() * (beam.axis === "x" ? rows : cols));
        }

        ctx.save();
        ctx.lineWidth = 1.5;
        if (beam.axis === "x") {
          const y = beam.index * SPACING;
          const startX = Math.max(0, beam.direction === 1 ? beam.pos - beam.length : beam.pos);
          const endX = Math.min(width, beam.direction === 1 ? beam.pos : beam.pos + beam.length);

          if (endX > startX) {
            const grad = ctx.createLinearGradient(startX, y, endX, y);
            const coreColor = isDark
              ? `rgba(198, 244, 50, ${beam.alpha})`
              : `rgba(135, 190, 18, ${beam.alpha * 0.85})`;
            grad.addColorStop(0, "rgba(198, 244, 50, 0)");
            grad.addColorStop(0.5, coreColor);
            grad.addColorStop(1, "rgba(198, 244, 50, 0)");

            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
          }
        } else {
          const x = beam.index * SPACING;
          const startY = Math.max(0, beam.direction === 1 ? beam.pos - beam.length : beam.pos);
          const endY = Math.min(height, beam.direction === 1 ? beam.pos : beam.pos + beam.length);

          if (endY > startY) {
            const grad = ctx.createLinearGradient(x, startY, x, endY);
            const coreColor = isDark
              ? `rgba(198, 244, 50, ${beam.alpha})`
              : `rgba(135, 190, 18, ${beam.alpha * 0.85})`;
            grad.addColorStop(0, "rgba(198, 244, 50, 0)");
            grad.addColorStop(0.5, coreColor);
            grad.addColorStop(1, "rgba(198, 244, 50, 0)");

            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // 3. Cursor proximity spotlight & illuminated grid lines
      if (mouse.isHovering) {
        // Spotlight ambient radial glow
        const spotlight = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          MAX_DIST * 1.3,
        );
        spotlight.addColorStop(0, isDark ? "rgba(198, 244, 50, 0.20)" : "rgba(145, 195, 20, 0.22)");
        spotlight.addColorStop(
          0.5,
          isDark ? "rgba(198, 244, 50, 0.07)" : "rgba(198, 244, 50, 0.12)",
        );
        spotlight.addColorStop(1, "rgba(198, 244, 50, 0)");

        ctx.fillStyle = spotlight;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, MAX_DIST * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Highlighted active grid lines within proximity radius
        ctx.save();
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, MAX_DIST, 0, Math.PI * 2);
        ctx.clip();

        ctx.lineWidth = 1.25;
        ctx.strokeStyle = isDark ? "rgba(198, 244, 50, 0.45)" : "rgba(125, 180, 15, 0.50)";
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
          const x = c * SPACING;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let r = 0; r <= rows; r++) {
          const y = r * SPACING;
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 4. Render and animate coordinate points and crosshairs
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        // Dual-harmonic organic wave (smooth, noticeable breathing rhythm)
        const idleWave =
          Math.sin(time * 0.75 + dot.offset) * 2.6 +
          Math.cos(time * 0.38 + dot.baseX * 0.007) * 1.3;

        // Proximity calculation with smooth exponential falloff
        let proximity = 0;
        if (mouse.isHovering) {
          const dx = mouse.x - dot.baseX;
          const dy = mouse.y - dot.baseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAX_DIST) {
            const linearProximity = 1 - dist / MAX_DIST;
            // Exponential curve produces a natural magnetic spring feel
            proximity = Math.pow(linearProximity, 1.3);
            const force = proximity * 22;
            const angle = Math.atan2(dy, dx);
            dot.vx -= Math.cos(angle) * force * 0.22;
            dot.vy -= Math.sin(angle) * force * 0.22;
          }
        }

        // Spring restitution towards resting coordinate with gentle damping
        dot.vx += (dot.baseX - dot.x) * 0.07;
        dot.vy += (dot.baseY + idleWave - dot.y) * 0.07;
        dot.vx *= 0.81;
        dot.vy *= 0.81;
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Render dot or crosshair
        if (dot.isCross) {
          const isHighlighted = proximity > 0.06;
          ctx.strokeStyle = isHighlighted ? activeColor : restingCrossColor;
          ctx.lineWidth = isHighlighted ? 1.75 : 1;
          const armLen = 4.5 + proximity * 3.5;
          ctx.beginPath();
          ctx.moveTo(dot.x - armLen, dot.y);
          ctx.lineTo(dot.x + armLen, dot.y);
          ctx.moveTo(dot.x, dot.y - armLen);
          ctx.lineTo(dot.x, dot.y + armLen);
          ctx.stroke();
        } else {
          const baseRadius = 1.75;
          const radius = baseRadius + proximity * 1.8;
          if (proximity > 0.06) {
            ctx.fillStyle = activeColor;
            // Draw a delicate dark border around lime dot in light mode for crisp WCAG contrast
            if (!isDark) {
              ctx.strokeStyle = "rgba(10, 10, 10, 0.60)";
              ctx.lineWidth = 0.85;
            }
          } else {
            ctx.fillStyle = restingDotColor;
          }

          ctx.beginPath();
          ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
          ctx.fill();

          if (proximity > 0.06 && !isDark) {
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    }

    // Pointer handlers (support mouse, trackpad, and touch without blocking scroll)
    function onPointerMove(e: PointerEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.isHovering = true;
    }

    function onPointerLeave() {
      mouse.isHovering = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    }

    resize();

    if (prefersReducedMotion) {
      renderStatic();
    } else {
      parent.addEventListener("pointermove", onPointerMove as EventListener, { passive: true });
      parent.addEventListener("pointerleave", onPointerLeave as EventListener, { passive: true });
      render();
    }

    // ResizeObserver
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        resize();
        if (prefersReducedMotion) {
          renderStatic();
        }
      });
      resizeObserver.observe(parent);
    }

    // IntersectionObserver to pause loop when scrolled out of view
    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined" && !prefersReducedMotion) {
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting;
          if (isVisible) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = requestAnimationFrame(render);
          } else if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
          }
        },
        { threshold: 0.05 },
      );
      intersectionObserver.observe(parent);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      parent.removeEventListener("pointermove", onPointerMove as EventListener);
      parent.removeEventListener("pointerleave", onPointerLeave as EventListener);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
    };
  }, [tone]);

  return (
    <div
      className={`${styles.coordinateGrid} ${className || ""}`}
      aria-hidden="true"
      data-testid="coordinate-grid"
    >
      <canvas ref={canvasRef} className={styles.coordinateGridCanvas} tabIndex={-1} />
    </div>
  );
}
