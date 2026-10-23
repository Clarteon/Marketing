import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProcessConduit } from "@/components/ui/ProcessConduit";
import { ReticleFrame } from "@/components/ui/ReticleFrame";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const mockSteps = [
  { title: "Discover", body: "We map the repetitive tasks." },
  { title: "Architecture", body: "We choose the right tool." },
  { title: "Build & Integrate", body: "We connect the systems." },
  { title: "Refine & Handover", body: "We train your team." },
];

describe("Scroll motion components", () => {
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
