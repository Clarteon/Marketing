import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/admin/LoginForm";
import { ReviewQueue } from "@/components/admin/ReviewQueue";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
}

describe("admin review UI", () => {
  it("sign-in form has a labelled password field", async () => {
    const { container } = render(<LoginForm />);

    expect(screen.getByLabelText("Admin password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("review card exposes an answer field and a safe return link", async () => {
    const { container } = render(
      <main id="main">
        <ReviewQueue
          questions={[
            {
              id: "00000000-0000-4000-8000-000000000000",
              question: "Do you offer refunds?",
              askCount: 2,
              createdAt: "2026-10-21T00:00:00.000Z",
              lastSeenAt: "2026-10-22T00:00:00.000Z",
            },
          ]}
        />
      </main>,
    );

    expect(screen.getByText("Do you offer refunds?")).toBeInTheDocument();
    expect(screen.getByLabelText("Answer title")).toBeInTheDocument();
    expect(screen.getByLabelText("Published answer")).toBeInTheDocument();
    expect(screen.getByLabelText("Link the answer to")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve and publish" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
