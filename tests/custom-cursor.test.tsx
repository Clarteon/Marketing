import { fireEvent, render } from "@testing-library/react";
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
    vi.unstubAllGlobals();
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
});
