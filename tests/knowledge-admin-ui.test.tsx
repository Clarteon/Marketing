import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/admin/LoginForm";
import { ReviewQueue } from "@/components/admin/ReviewQueue";
import { ToastProvider } from "@/components/ui/ToastProvider";

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
      <ToastProvider>
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
        </main>
      </ToastProvider>,
    );

    expect(screen.getByText("Do you offer refunds?")).toBeInTheDocument();
    expect(screen.getByLabelText("Answer title")).toBeInTheDocument();
    expect(screen.getByLabelText("Published answer")).toBeInTheDocument();
    expect(screen.getByLabelText("Link the answer to")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve and publish" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("announces a published answer after the review is removed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, reindexed: false }),
      })),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <ToastProvider>
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
      </ToastProvider>,
    );

    fireEvent.change(screen.getByLabelText("Answer title"), { target: { value: "Refund policy" } });
    fireEvent.change(screen.getByLabelText("Published answer"), {
      target: { value: "Clarteon reviews each request with the team." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve and publish" }));

    expect(
      await screen.findByText("Answer published. The search index will refresh on the next sync."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Do you offer refunds?")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
