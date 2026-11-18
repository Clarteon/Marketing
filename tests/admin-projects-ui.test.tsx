import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectsManager } from "@/components/admin/ProjectsManager";
import type { AdminProjectRecord } from "@/lib/admin/site-config-defaults";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: navigation.refresh,
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

const sampleProjects: AdminProjectRecord[] = [
  {
    slug: "janelles-satin-bouquet",
    title: "Stopping double-sold stock and manual payment checks for a custom bouquet shop.",
    summary: "Replaced manual Messenger ordering with a storefront and payment match flow.",
    client: "Janelle's Satin Bouquet",
    category: "operations",
    categoryLabel: null,
    solution_type: "Online storefront + payment workflow",
    image: "/images/work/janelles-satin-bouquet.webp",
    imageAlt: "Bouquet storefront interface",
    secondaryImage: null,
    secondaryImageAlt: null,
    liveUrl: "https://shop.janelle-bouquets.example.org",
    problemBrief: "Orders arrived over chat and took manual checking.",
    approachBrief: "Built stock locking and confirmation matching.",
    outcomeBrief: "Orders confirm automatically.",
    highlights: ["Stock locks at checkout", "Automatic receipt verification"],
    tags: ["automation", "payments"],
    body: "## The problem\n\nManual checks slowed fulfillment.",
    publishedAt: "2026-11-05",
    order: 1,
    featuredOnHome: true,
    status: "published",
  },
  {
    slug: "v-unite-voice-ai-coach",
    title: "An AI business coach that cites clinic records instead of guessing.",
    summary: "Grounded coaching answers in approved clinic policy documents.",
    client: "V-Unite Clinic",
    category: "conversations",
    categoryLabel: null,
    solution_type: "AI assistant + knowledge base",
    image: "/images/work/v-unite.webp",
    imageAlt: "Clinic AI coach preview",
    secondaryImage: "/images/work/v-unite-workflow.webp",
    secondaryImageAlt: "Workflow routing diagram",
    liveUrl: null,
    problemBrief: "Staff waited for policy checks across folders.",
    approachBrief: "Indexed approved documents with citations.",
    outcomeBrief: "Answers return with cited sources.",
    highlights: ["Cited answers only"],
    tags: ["ai", "knowledge"],
    body: "## Overview\n\nBuilt on approved policies.",
    publishedAt: "2026-11-02",
    order: 2,
    featuredOnHome: true,
    status: "draft",
  },
];

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
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

describe("ProjectsManager", () => {
  it("renders checked-in projects cleanly in read-only mode when storage is unconfigured", async () => {
    const { container } = render(
      <main id="main">
        <ProjectsManager initialProjects={sampleProjects} configured={false} />
      </main>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /project database storage is not configured/i,
    );
    expect(screen.getByRole("heading", { name: "Projects (2)" })).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toHaveTextContent("Orders, stock & payments");
    expect(screen.getByLabelText("Publish status")).toHaveTextContent("Published");
    expect(screen.getByRole("button", { name: "+ New project" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save project" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /V-Unite Clinic/i }));
    expect(screen.getByLabelText("Project title")).toHaveValue(sampleProjects[1].title);
    expect(screen.getByLabelText("Secondary image path or URL")).toHaveValue(
      "/images/work/v-unite-workflow.webp",
    );

    await expectNoA11yViolations(container);
  });

  it("shows the schema notice when site_projects is missing", () => {
    render(
      <main id="main">
        <ProjectsManager initialProjects={sampleProjects} configured schemaMissing />
      </main>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /The site_projects table has not been applied yet/i,
    );
  });

  it("saves edits, manages features, creates a new project, and confirms deletion", async () => {
    const updatedFirst: AdminProjectRecord = {
      ...sampleProjects[0],
      client: "Janelle's Satin Studio",
    };

    const createdProject: AdminProjectRecord = {
      ...sampleProjects[0],
      slug: "dispatch-board",
      title: "Dispatch scheduling portal",
      summary: "Replaced manual spreadsheet dispatch sheets with a live queue.",
      order: 3,
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/admin/projects/janelles-satin-bouquet" && init?.method === "PATCH") {
        return jsonResponse({ ok: true, project: updatedFirst });
      }
      if (url === "/api/admin/projects" && init?.method === "POST") {
        return jsonResponse({ ok: true, project: createdProject });
      }
      if (url === "/api/admin/projects/dispatch-board" && init?.method === "DELETE") {
        return jsonResponse({ ok: true });
      }
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(
      <main id="main">
        <ProjectsManager initialProjects={sampleProjects} configured />
      </main>,
    );

    fireEvent.change(screen.getByLabelText("Client or sample label"), {
      target: { value: "Janelle's Satin Studio" },
    });
    expect(screen.getByRole("button", { name: "Reset changes" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "+ Add feature" }));
    expect(screen.getByLabelText("Feature or outcome 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove feature 3" }));
    expect(screen.queryByLabelText("Feature or outcome 3")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save project" }));
    expect(await screen.findByText(/Saved changes to/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ New project" }));
    fireEvent.change(screen.getByLabelText("Project title"), {
      target: { value: "Dispatch scheduling portal" },
    });
    fireEvent.change(screen.getByLabelText("Summary"), {
      target: { value: "Replaced manual spreadsheet dispatch sheets with a live queue." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(
      await screen.findByText(/Added project "Dispatch scheduling portal"/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
    expect(screen.getByText(/removed from the database/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete project" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(await screen.findByText("Project deleted from database.")).toBeInTheDocument();
    expect(navigation.refresh).toHaveBeenCalled();

    await expectNoA11yViolations(container);
  });
});
