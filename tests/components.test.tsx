import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
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
        eyebrow="Your business-focused technology partner"
        title="Technology that starts with your problem."
        highlight="problem."
      />,
    );

    expect(screen.getByText("Your business-focused technology partner")).toBeInTheDocument();
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
});
