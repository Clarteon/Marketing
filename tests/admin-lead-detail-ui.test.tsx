import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LeadEditForm } from "@/app/admin/(dashboard)/leads/[id]/lead-edit-form";
import { ToastProvider } from "@/components/ui/ToastProvider";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: navigation.refresh,
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

const LEAD_ID = "11111111-1111-4111-8111-111111111111";

const lead = {
  id: LEAD_ID,
  name: "Juan Dela Cruz",
  email: "juan@example.com",
  company: "Casa Verde",
  need: "The weekly report takes a whole day to put together.",
  teamSize: "11-50" as const,
  status: "new" as const,
};

interface FetchInit {
  method?: string;
  body?: string;
}

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

function stubFetch(patchResponse: () => Promise<unknown> = async () => jsonResponse({ ok: true })) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: FetchInit = {}) => {
    const url = String(input);
    if (url === `/api/admin/leads/${LEAD_ID}`) {
      expect(init.method).toBe("PATCH");
      return patchResponse();
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderInMain(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      <main>{ui}</main>
    </ToastProvider>,
  );
}

async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
}

beforeEach(() => {
  navigation.refresh.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LeadEditForm", () => {
  it("shows the saved lead and sends only what changed", async () => {
    const fetchMock = stubFetch();
    renderInMain(<LeadEditForm lead={lead} />);

    expect(screen.getByLabelText("Name")).toHaveValue("Juan Dela Cruz");
    expect(screen.getByLabelText("Email")).toHaveValue("juan@example.com");
    expect(screen.getByLabelText("Company")).toHaveValue("Casa Verde");
    expect(screen.getByLabelText("What they need")).toHaveValue(
      "The weekly report takes a whole day to put together.",
    );
    expect(screen.getByLabelText("Follow-up status")).toHaveTextContent("New");
    expect(screen.getByLabelText("Team size")).toHaveTextContent("11–50 people");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Company"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`/api/admin/leads/${LEAD_ID}`);
    expect(JSON.parse(String(init?.body))).toEqual({ company: null });

    expect(await screen.findByText(/Saved\. The list now shows/)).toBeInTheDocument();
    expect(
      await screen.findByRole("status", { name: "Success: Lead updated." }),
    ).toBeInTheDocument();
    expect(navigation.refresh).toHaveBeenCalled();
    await expectNoA11yViolations(document.body);
  });

  it("explains a lead that no longer exists", async () => {
    stubFetch(async () => jsonResponse({ ok: false, error: "lead_not_found" }, 404));
    renderInMain(<LeadEditForm lead={lead} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Grace Hopper" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This lead no longer exists.");
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("shows a clear message when the session expired", async () => {
    stubFetch(async () => jsonResponse({ ok: false, error: "not_signed_in" }, 401));
    renderInMain(<LeadEditForm lead={lead} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Grace Hopper" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session expired. Sign in again.",
    );
  });
});
