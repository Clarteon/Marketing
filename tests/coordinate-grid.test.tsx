import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoordinateGrid } from "@/components/ui/CoordinateGrid";

describe("coordinate grid animation lifecycle", () => {
  const frames = new Map<number, FrameRequestCallback>();
  let nextId = 0;
  let intersect: IntersectionObserverCallback;
  let motionChange: () => void;
  let reduced = false;
  const ctx = {
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    scale: vi.fn(),
    stroke: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
  };
  const flush = (timestamp: number) => {
    const [id, callback] = frames.entries().next().value!;
    frames.delete(id);
    act(() => callback(timestamp));
  };
  const setVisible = (visible: boolean) =>
    act(() =>
      intersect(
        [{ isIntersecting: visible } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );

  beforeEach(() => {
    frames.clear();
    nextId = 0;
    reduced = false;
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 800,
      height: 400,
      top: 0,
      left: 0,
    } as DOMRect);
    vi.stubGlobal(
      "Path2D",
      class {
        moveTo() {}
        lineTo() {}
        arc() {}
      },
    );
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.set(++nextId, callback);
      return nextId;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersect = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("matchMedia", (query: string) => ({
      get matches() {
        return query === "(prefers-reduced-motion: reduce)" && reduced;
      },
      addEventListener: (_: string, callback: () => void) => {
        motionChange = callback;
      },
      removeEventListener: vi.fn(),
    }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("pauses offscreen and in a hidden tab, resumes, and responds to reduced motion", () => {
    const { unmount } = render(
      <section>
        <CoordinateGrid />
      </section>,
    );
    expect(ctx.drawImage).toHaveBeenCalled();
    expect(frames.size).toBe(0);
    setVisible(true);
    flush(100);
    expect(frames.size).toBe(1);
    setVisible(false);
    expect(frames.size).toBe(0);
    setVisible(true);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    expect(frames.size).toBe(0);
    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    expect(frames.size).toBe(1);
    reduced = true;
    act(() => motionChange());
    expect(frames.size).toBe(0);
    reduced = false;
    act(() => motionChange());
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
  });

  it("halves ambient redraws and reads pointer geometry only once per rendered frame", () => {
    const { container } = render(
      <section>
        <CoordinateGrid />
      </section>,
    );
    setVisible(true);
    flush(100);
    ctx.clearRect.mockClear();
    flush(116.7);
    expect(ctx.clearRect).not.toHaveBeenCalled();
    flush(133.4);
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    const geometry = vi.mocked(HTMLElement.prototype.getBoundingClientRect);
    geometry.mockClear();
    const section = container.querySelector("section")!;
    fireEvent(section, new MouseEvent("pointermove", { clientX: 200, clientY: 120 }));
    fireEvent(section, new MouseEvent("pointermove", { clientX: 250, clientY: 150 }));
    expect(geometry).not.toHaveBeenCalled();
    flush(200);
    expect(geometry).toHaveBeenCalledTimes(1);
  });
});
