import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { CustomCursor } from "@/components/ui/CustomCursor";

describe("CustomCursor", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query === "(pointer: fine)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    document.documentElement.className = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("coalesces pointer movement into one frame, follows without trailing, and stops when settled", () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        frames.set(++nextId, callback);
        return nextId;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    const { container, unmount } = render(<CustomCursor />);
    const circle = container.firstElementChild as HTMLElement;
    expect(frames.size).toBe(0);

    fireEvent(window, new MouseEvent("pointermove", { clientX: 100, clientY: 50 }));
    fireEvent(window, new MouseEvent("pointermove", { clientX: 420, clientY: 180 }));
    expect(frames.size).toBe(1);
    const flush = () => {
      const [id, callback] = frames.entries().next().value!;
      frames.delete(id);
      act(() => callback(16));
    };
    flush();
    expect(circle.style.transform).toContain("translate3d(420px, 180px, 0)");
    expect(frames.size).toBe(0);

    fireEvent.pointerDown(window);
    for (let frame = 0; frame < 30 && frames.size; frame++) flush();
    expect(circle.style.transform).toContain("scale(0.750)");
    expect(frames.size).toBe(0);
    fireEvent.pointerUp(window);
    expect(frames.size).toBe(1);
    fireEvent.blur(window);
    expect(frames.size).toBe(0);
    expect(circle.className).toContain("hidden");
    unmount();
    fireEvent(window, new MouseEvent("pointermove", { clientX: 500, clientY: 200 }));
    expect(frames.size).toBe(0);
  });

  it("renders a single plain circle and activates custom-cursor-active class", () => {
    const { container, unmount } = render(<CustomCursor />);
    const elements = container.querySelectorAll('[aria-hidden="true"]');

    expect(elements.length).toBe(1);
    expect(elements[0]).toHaveAttribute("aria-hidden", "true");
    expect(document.documentElement.classList.contains("custom-cursor-active")).toBe(true);

    unmount();
    expect(document.documentElement.classList.contains("custom-cursor-active")).toBe(false);
  });

  it("does not render when pointer is coarse (mobile/touch)", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    const { container } = render(<CustomCursor />);
    expect(container.firstChild).toBeNull();
    expect(document.documentElement.classList.contains("custom-cursor-active")).toBe(false);
  });

  it("does not render when prefers-reduced-motion is requested", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query === "(pointer: fine)" || query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    const { container } = render(<CustomCursor />);
    expect(container.firstChild).toBeNull();
  });

  it("calibrates tone correctly for nested light containers inside dark sections", () => {
    const { container } = render(
      <div>
        <CustomCursor />
        <div className="toneInk">
          <button type="button" id="dark-btn">
            Dark Action
          </button>
          <div className="bookingFormPanel">
            <button type="button" id="light-btn" className="primary">
              Brief
            </button>
          </div>
        </div>
      </div>,
    );

    const circle = container.querySelector('[aria-hidden="true"]');
    expect(circle).toBeInTheDocument();

    const darkBtn = document.getElementById("dark-btn")!;
    fireEvent.pointerOver(darkBtn);
    expect(circle?.className).toContain("circleDark");

    const lightBtn = document.getElementById("light-btn")!;
    fireEvent.pointerOver(lightBtn);
    expect(circle?.className).not.toContain("circleDark");
    expect(circle?.className).toContain("hoveredLime");
  });

  it("keeps the dark cursor outline over links in a white footer", () => {
    const { container } = render(
      <>
        <CustomCursor />
        <footer data-tone="paper">
          <a href="/privacy" className="footerLink">
            Privacy
          </a>
        </footer>
      </>,
    );

    fireEvent.pointerOver(container.querySelector("a")!);

    const circle = container.querySelector('[aria-hidden="true"]');
    expect(circle?.className).not.toContain("circleDark");
    expect(circle?.className).toContain("hovered");
  });
});
