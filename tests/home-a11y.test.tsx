import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  it("renders one level-one heading", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Technology that starts with your problem.",
    );
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<Home />);

    // Colour contrast needs a real layout engine; it is checked against the
    // running site in the P1 accessibility pass.
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
