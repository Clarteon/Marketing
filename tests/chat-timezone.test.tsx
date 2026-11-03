import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TimezoneChoices } from "@/components/chat/TimezoneChoices";

afterEach(() => vi.restoreAllMocks());

it("offers city search without guessing when device detection fails", () => {
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(() => {
    throw new Error("Unavailable");
  });
  const choose = vi.fn();
  render(<TimezoneChoices onChoose={choose} />);
  expect(screen.queryByRole("button", { name: "Yes, use this time" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Search city or time zone"), {
    target: { value: "Manila" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Manila —/ }));
  expect(choose).toHaveBeenCalledWith("Asia/Manila", expect.stringContaining("Manila"));
  fireEvent.change(screen.getByLabelText("Search city or time zone"), {
    target: { value: "no-such-city" },
  });
  expect(screen.getByRole("status")).toHaveTextContent("No matches");
});
