import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";

function ToastControls() {
  const { addToast, updateToast } = useToast();
  const loadingId = useRef<string | null>(null);

  return (
    <>
      <button onClick={() => addToast({ kind: "success", message: "Saved." })}>Success</button>
      <button onClick={() => addToast({ kind: "error", message: "Could not save." })}>Error</button>
      <button onClick={() => addToast({ kind: "warning", message: "Check your changes." })}>
        Warning
      </button>
      <button onClick={() => addToast({ kind: "info", message: "Link copied." })}>Info</button>
      <button
        onClick={() => {
          loadingId.current = addToast({
            kind: "loading",
            message: "Saving…",
            dedupeKey: "save",
          });
        }}
      >
        Start
      </button>
      <button
        onClick={() => {
          if (loadingId.current) {
            updateToast(loadingId.current, { kind: "success", message: "Saved." });
          }
        }}
      >
        Finish
      </button>
      <button onClick={() => addToast({ kind: "success", message: "Saved." })}>Duplicate</button>
      <button
        onClick={() =>
          addToast({
            kind: "info",
            message: "Copied.",
            durationMs: null,
            action: { label: "Undo", onClick: vi.fn() },
          })
        }
      >
        Action
      </button>
    </>
  );
}

function renderWithToasts() {
  return render(
    <ToastProvider>
      <main>
        <ToastControls />
      </main>
    </ToastProvider>,
  );
}

describe("global toast provider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces variants with visible labels and dismisses them by keyboard-accessible controls", async () => {
    vi.useFakeTimers();
    renderWithToasts();

    fireEvent.click(screen.getByRole("button", { name: "Success" }));
    fireEvent.click(screen.getByRole("button", { name: "Error" }));
    fireEvent.click(screen.getByRole("button", { name: "Warning" }));
    fireEvent.click(screen.getByRole("button", { name: "Info" }));

    expect(screen.getByRole("status", { name: "Success: Saved." })).toBeInTheDocument();
    expect(screen.getByRole("alert", { name: "Error: Could not save." })).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Warning: Check your changes." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Information: Link copied." })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification: Link copied." }));
    act(() => vi.advanceTimersByTime(220));
    expect(screen.queryByText("Link copied.")).not.toBeInTheDocument();
  });

  it("updates loading in place and deduplicates repeated requests", () => {
    renderWithToasts();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getAllByRole("status", { name: "Loading: Saving…" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(screen.getAllByRole("status", { name: "Success: Saved." })).toHaveLength(1);
  });

  it("pauses auto-dismiss while hovered and resumes with the remaining time", () => {
    vi.useFakeTimers();
    renderWithToasts();
    fireEvent.click(screen.getByRole("button", { name: "Success" }));
    const toast = screen.getByRole("status", { name: "Success: Saved." });

    act(() => vi.advanceTimersByTime(2_000));
    fireEvent.pointerEnter(toast);
    act(() => vi.advanceTimersByTime(10_000));
    expect(toast).toBeInTheDocument();

    fireEvent.pointerLeave(toast);
    act(() => vi.advanceTimersByTime(1_000));
    fireEvent.focus(screen.getByRole("button", { name: "Dismiss notification: Saved." }));
    act(() => vi.advanceTimersByTime(10_000));
    expect(toast).toBeInTheDocument();
    fireEvent.blur(screen.getByRole("button", { name: "Dismiss notification: Saved." }));
    act(() => vi.advanceTimersByTime(1_500));
    act(() => vi.advanceTimersByTime(220));
    expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
  });

  it("supports an action and leaves persistent notifications visible", () => {
    vi.useFakeTimers();
    renderWithToasts();
    fireEvent.click(screen.getByRole("button", { name: "Action" }));
    const toast = screen.getByRole("status", { name: "Information: Copied." });

    act(() => vi.advanceTimersByTime(30_000));
    expect(toast).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("has no automated accessibility violations while a toast is visible", async () => {
    const { container } = renderWithToasts();
    fireEvent.click(screen.getByRole("button", { name: "Action" }));

    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
