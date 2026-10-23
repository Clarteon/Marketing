import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { CoordinateGrid } from "@/components/ui/CoordinateGrid";
import { HeroFlowVisualization } from "@/components/ui/HeroFlowVisualization";
import { Logo } from "@/components/ui/Logo";
import { PageHero } from "@/components/ui/PageHero";

describe("design system", () => {
  it("renders a link button for navigation", () => {
    render(<Button href="/contact#book">Book a call</Button>);

    expect(screen.getByRole("link", { name: "Book a call" })).toHaveAttribute(
      "href",
      "/contact#book",
    );
  });

  it("renders a native button for form actions", () => {
    render(<Button type="submit">Send</Button>);

    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("type", "submit");
  });

  it("handles keyboard activation and mouse tracking safely", () => {
    let clicked = false;
    render(
      <Button
        variant="primary"
        onClick={() => {
          clicked = true;
        }}
      >
        Click me
      </Button>,
    );

    const btn = screen.getByRole("button", { name: "Click me" });
    fireEvent.mouseMove(btn, { clientX: 50, clientY: 20 });
    // Keyboard click with clientX/Y = 0
    fireEvent.click(btn, { clientX: 0, clientY: 0, detail: 0 });
    expect(clicked).toBe(true);
  });

  it("supports all button variants and text links", () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole("button", { name: "Secondary" })).toBeInTheDocument();

    rerender(<Button variant="dark">Dark</Button>);
    expect(screen.getByRole("button", { name: "Dark" })).toBeInTheDocument();

    rerender(
      <Button variant="text" size="large">
        Text
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Text" })).toBeInTheDocument();
  });

  it("gives the logo an accessible name", () => {
    render(<Logo />);

    expect(screen.getByText("Clarteon")).toBeInTheDocument();
  });

  it("links the booking section to the contact page", () => {
    render(<BookingSection />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Tell us the problem. We will find the clearest way through.",
    );
    expect(screen.getByRole("link", { name: "Book a free discovery call" })).toHaveAttribute(
      "href",
      "/contact#book",
    );
  });

  it("renders the home badge and highlighted phrase", () => {
    render(
      <PageHero
        variant="home"
        eyebrow="Your business tech partner"
        title="Technology that starts with your problem."
        highlight="problem."
      />,
    );

    expect(screen.getByText("Your business tech partner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 }).querySelector("span")).toHaveTextContent(
      "problem.",
    );
  });

  it("keeps the booking placeholder honest and points to the form", () => {
    render(
      <BookingSection
        mode="placeholder"
        title="Book a free discovery call"
        body="Scheduling is being connected in this preview."
      />,
    );

    expect(screen.getByText("Scheduling is being connected in this preview.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the project brief" })).toHaveAttribute(
      "href",
      "#brief",
    );
  });

  it("renders the coordinate grid background with decorative accessibility attributes", () => {
    render(<CoordinateGrid tone="paper" />);

    const grid = screen.getByTestId("coordinate-grid");
    expect(grid).toHaveAttribute("aria-hidden", "true");
    expect(grid.querySelector("canvas")).toBeInTheDocument();
  });

  it("allows toggling background grid on PageHero", () => {
    const { rerender } = render(
      <PageHero title="Testing grid presence" showBackgroundGrid={true} />,
    );
    expect(screen.getByTestId("coordinate-grid")).toBeInTheDocument();

    rerender(<PageHero title="Testing grid absence" showBackgroundGrid={false} />);
    expect(screen.queryByTestId("coordinate-grid")).not.toBeInTheDocument();
  });

  it("renders HeroFlowVisualization and mounts into PageHero visual slot", () => {
    render(<PageHero title="Home Title" visual={<HeroFlowVisualization />} />);
    expect(screen.getByRole("region", { name: /interactive flow/i })).toBeInTheDocument();
    expect(screen.getByText("Clarteon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copying & pasting data" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Workflow automation" })).toBeInTheDocument();
    expect(screen.queryByText("Client Problems")).not.toBeInTheDocument();
    expect(screen.queryByText("Clarteon Core")).not.toBeInTheDocument();
    expect(screen.queryByText("Our Solutions")).not.toBeInTheDocument();
  });

  it("previews nodes and restores a persistent selection after hover or focus ends", () => {
    render(<HeroFlowVisualization />);
    const manual = screen.getByRole("button", { name: "Copying & pasting data" });
    const assistant = screen.getByRole("button", { name: "AI assistants" });
    const status = screen.getByRole("status");

    expect(status).toHaveTextContent("Select an icon to learn more.");
    fireEvent.pointerEnter(manual);
    expect(status).toHaveTextContent("Copying & pasting data");
    expect(manual).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(manual);
    expect(manual).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Workflow automation" })).toHaveAttribute(
      "data-related",
      "true",
    );
    expect(screen.getByRole("button", { name: "System integrations" })).toHaveAttribute(
      "data-related",
      "true",
    );

    fireEvent.pointerEnter(assistant);
    expect(status).toHaveTextContent("AI assistants");
    fireEvent.pointerLeave(assistant);
    expect(status).toHaveTextContent("Copying & pasting data");
    fireEvent.focus(assistant);
    expect(status).toHaveTextContent("AI assistants");
    fireEvent.blur(assistant);
    expect(status).toHaveTextContent("Copying & pasting data");

    fireEvent.keyDown(manual, { key: "Escape" });
    expect(manual).toHaveAttribute("aria-pressed", "false");
    expect(status).toHaveTextContent("Select an icon to learn more.");
  });

  it("toggles a selection, resets it, and highlights reverse relationships", () => {
    render(<HeroFlowVisualization />);
    const integration = screen.getByRole("button", { name: "System integrations" });
    const reset = screen.getByText("Reset");
    expect(reset).toBeDisabled();
    fireEvent.click(integration);
    expect(integration).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Clunky software" })).toHaveAttribute(
      "data-related",
      "true",
    );
    fireEvent.click(integration);
    expect(integration).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(integration);
    fireEvent.click(reset);
    expect(reset).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Select an icon to learn more.");
  });
});
