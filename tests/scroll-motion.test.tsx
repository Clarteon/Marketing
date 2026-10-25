import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProcessConduit } from "@/components/ui/ProcessConduit";
import { ReticleFrame } from "@/components/ui/ReticleFrame";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ReadingProgress } from "@/components/ui/ReadingProgress";

const mockSteps = [
  { title: "Discover", body: "We map the repetitive tasks." },
  { title: "Architecture", body: "We choose the right tool." },
  { title: "Build & Integrate", body: "We connect the systems." },
  { title: "Refine & Handover", body: "We train your team." },
];

describe("Scroll motion components", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reveals an offscreen section once and immediately exposes keyboard focus", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 2000,
      bottom: 2300,
      height: 300,
    } as DOMRect);
    let intersect: IntersectionObserverCallback = () => {};
    const unobserve = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersect = callback;
        }
        observe = vi.fn();
        unobserve = unobserve;
        disconnect = disconnect;
      },
    );

    const { container, unmount } = render(
      <ScrollReveal variant="slide">
        <a href="/contact">Get in touch</a>
      </ScrollReveal>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    await waitFor(() => expect(wrapper).toHaveAttribute("data-motion-ready", "true"));
    expect(wrapper).toHaveAttribute("data-revealed", "false");
    fireEvent.focus(screen.getByRole("link"));
    expect(wrapper).toHaveAttribute("data-revealed", "true");
    act(() =>
      intersect(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(unobserve).toHaveBeenCalledWith(wrapper);
    act(() =>
      intersect(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(wrapper).toHaveAttribute("data-revealed", "true");
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("shows content immediately when reduced motion is requested", () => {
    const observe = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = observe;
      },
    );
    vi.stubGlobal("matchMedia", () => ({ matches: true }) as MediaQueryList);
    const { container } = render(<ScrollReveal>Always readable</ScrollReveal>);
    expect(container.firstElementChild).toHaveAttribute("data-revealed", "true");
    expect(container.firstElementChild).not.toHaveAttribute("data-motion-ready");
    expect(observe).not.toHaveBeenCalled();
  });

  it("clamps reading progress to the content and updates it after scrolling", () => {
    let top = window.innerHeight;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ top, height: 1000 }) as DOMRect,
    );
    let onFrame: FrameRequestCallback = () => {};
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      onFrame = callback;
      return 1;
    });
    const { container } = render(
      <ReadingProgress>
        <p>Article body</p>
      </ReadingProgress>,
    );
    const fill = container.querySelector('[aria-hidden="true"] > span') as HTMLElement;
    expect(fill.style.transform).toBe("scaleY(0)");
    top = window.innerHeight * 0.65 - 500;
    fireEvent.scroll(window);
    act(() => onFrame(0));
    expect(fill.style.transform).toBe("scaleY(0.5)");
    top = -3000;
    fireEvent.scroll(window);
    act(() => onFrame(0));
    expect(fill.style.transform).toBe("scaleY(1)");
  });

  it("renders ScrollReveal with children and accessible structure", () => {
    const { container } = render(
      <ScrollReveal as="section" className="test-reveal">
        <h2>Section Headline</h2>
        <p>Section description text</p>
      </ScrollReveal>,
    );

    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Section Headline");
    expect(screen.getByText("Section description text")).toBeInTheDocument();
  });

  it("applies stagger class when stagger prop is enabled on ScrollReveal", () => {
    const { container } = render(
      <ScrollReveal stagger>
        <div>Item 1</div>
        <div>Item 2</div>
      </ScrollReveal>,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("revealStagger");
  });

  it("renders ProcessConduit with semantic ordered list and 4 steps", () => {
    render(<ProcessConduit steps={mockSteps} />);

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);

    expect(screen.getByRole("heading", { level: 3, name: "Discover" })).toBeInTheDocument();
    expect(screen.getByText("We map the repetitive tasks.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Architecture" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Build & Integrate" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Refine & Handover" }),
    ).toBeInTheDocument();
  });

  it("renders ReticleFrame with corner brackets and badge", () => {
    const { container } = render(
      <ReticleFrame badge="Focus Verified">
        <p>Proof Statement</p>
      </ReticleFrame>,
    );

    expect(screen.getByText("Proof Statement")).toBeInTheDocument();
    expect(screen.getByText("Focus Verified")).toBeInTheDocument();

    const corners = container.querySelectorAll('[aria-hidden="true"]');
    // 4 corner reticles + 1 badge container
    expect(corners.length).toBeGreaterThanOrEqual(4);
  });

  it("renders ReticleFrame cleanly without a badge", () => {
    render(
      <ReticleFrame>
        <p>Proof Without Badge</p>
      </ReticleFrame>,
    );

    expect(screen.getByText("Proof Without Badge")).toBeInTheDocument();
    expect(screen.queryByText("Focus Verified")).not.toBeInTheDocument();
  });
});
