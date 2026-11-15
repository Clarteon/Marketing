import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FilterBar } from "@/app/admin/(dashboard)/leads/filter-bar";

const navigation = vi.hoisted(() => ({
  params: "",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/leads",
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.params),
}));

async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
}

function choose(label: string, option: string) {
  fireEvent.click(screen.getByRole("button", { name: label }));
  fireEvent.click(screen.getByRole("option", { name: option }));
}

beforeEach(() => {
  navigation.params = "";
  navigation.replace.mockReset();
});

describe("admin leads filters", () => {
  it("filters by follow-up status and returns to the first page", () => {
    const { container } = render(<FilterBar source="all" status="all" />);

    choose("Status", "Booked");

    expect(navigation.replace).toHaveBeenCalledWith("/admin/leads?status=booked&page=1", {
      scroll: false,
    });
    expect(container).toBeTruthy();
  });

  it("keeps the source filter while the status changes", () => {
    navigation.params = "source=clara-chat&page=3";

    render(<FilterBar source="clara-chat" status="all" />);

    choose("Status", "Contacted");

    expect(navigation.replace).toHaveBeenCalledWith(
      "/admin/leads?source=clara-chat&page=1&status=contacted",
      { scroll: false },
    );
  });

  it("drops a filter when the all option is picked", () => {
    navigation.params = "status=booked";

    render(<FilterBar source="all" status="booked" />);

    choose("Status", "All statuses");

    expect(navigation.replace).toHaveBeenCalledWith("/admin/leads?page=1", { scroll: false });
  });

  it("clears every filter at once", () => {
    navigation.params = "source=website-form&status=closed&page=2";

    render(<FilterBar source="website-form" status="closed" />);

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(navigation.replace).toHaveBeenCalledWith("/admin/leads", { scroll: false });
  });

  it("hides the clear button until a filter is on", () => {
    render(<FilterBar source="all" status="all" />);

    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });

  it("passes the accessibility checks", async () => {
    const { container } = render(<FilterBar source="all" status="new" />);

    await expectNoA11yViolations(container);
  });
});
