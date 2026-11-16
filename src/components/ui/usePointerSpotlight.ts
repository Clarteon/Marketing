"use client";

import { useEffect, type RefObject } from "react";

export function usePointerSpotlight(layerRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = layerRef.current;
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
    let writtenX = Number.NaN;
    let writtenY = Number.NaN;
    let hovering = false;
    let initialized = false;
    let snapOnTick = false;
    let rectDirty = true;
    let cachedLeft = 0;
    let cachedTop = 0;
    let cachedRight = 0;
    let cachedBottom = 0;

    const readBounds = () => {
      if (!rectDirty) return;
      const rect = el.getBoundingClientRect();
      cachedLeft = rect.left;
      cachedTop = rect.top;
      cachedRight = rect.right;
      cachedBottom = rect.bottom;
      rectDirty = false;
    };

    const writePosition = (x: number, y: number) => {
      if (Math.abs(x - writtenX) < 0.35 && Math.abs(y - writtenY) < 0.35) return;
      writtenX = x;
      writtenY = y;
      el.style.setProperty("--spotlight-x", `${x.toFixed(1)}px`);
      el.style.setProperty("--spotlight-y", `${y.toFixed(1)}px`);
    };

    const tick = () => {
      rafId = null;
      if (!hovering || document.hidden) return;

      readBounds();
      if (snapOnTick) {
        const inside =
          clientX >= cachedLeft &&
          clientX <= cachedRight &&
          clientY >= cachedTop &&
          clientY <= cachedBottom;
        if (!inside) {
          hovering = false;
          initialized = false;
          snapOnTick = false;
          el.dataset.hovering = "false";
          return;
        }
      }

      const targetX = clientX - cachedLeft;
      const targetY = clientY - cachedTop;

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
      rectDirty = true;
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
        rectDirty = true;
        hovering = true;
        initialized = false;
        snapOnTick = false;
        el.dataset.hovering = "true";
      }
      schedule();
    };

    const onScroll = () => {
      rectDirty = true;
      if (!hovering) return;
      snapOnTick = true;
      schedule();
    };

    const onResize = () => {
      rectDirty = true;
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

    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(onResize) : null;
    resizeObserver?.observe(el);

    section.addEventListener("pointerenter", onPointerEnter, { passive: true });
    section.addEventListener("pointermove", onPointerMove, { passive: true });
    section.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      section.removeEventListener("pointerenter", onPointerEnter);
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [layerRef]);
}
