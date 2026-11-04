import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeferredForm } from "@/components/ui/DeferredForm";

vi.mock("@/components/ui/BookingForm", () => ({
  BookingForm: () => (
    <label>
      Booking name
      <input autoComplete="name" />
    </label>
  ),
}));
vi.mock("@/components/ui/ProjectBriefForm", () => ({
  ProjectBriefForm: () => (
    <label>
      Brief name
      <input autoComplete="name" />
    </label>
  ),
}));

describe("deferred contact forms", () => {
  let intersect: IntersectionObserverCallback;
  const disconnect = vi.fn();
  beforeEach(() => {
    disconnect.mockClear();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersect = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps offscreen forms dormant, then preserves entered values after scrolling away", async () => {
    render(<DeferredForm kind="booking" />);
    expect(screen.queryByLabelText("Booking name")).not.toBeInTheDocument();
    act(() =>
      intersect(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    const input = await screen.findByLabelText("Booking name");
    fireEvent.change(input, { target: { value: "Example visitor" } });
    act(() =>
      intersect(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(screen.getByLabelText("Booking name")).toHaveValue("Example visitor");
    expect(disconnect).toHaveBeenCalled();
  });

  it("loads from a deliberate keyboard-accessible control and transfers focus", async () => {
    render(<DeferredForm kind="brief" />);
    const button = screen.getByRole("button", { name: "Load project brief form" });
    button.focus();
    fireEvent.click(button);
    const input = await screen.findByLabelText("Brief name");
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("loads without an IntersectionObserver implementation", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<DeferredForm kind="brief" />);
    expect(await screen.findByLabelText("Brief name")).toBeInTheDocument();
  });
});
