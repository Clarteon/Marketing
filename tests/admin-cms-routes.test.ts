import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionToken } from "@/lib/admin/auth";
import { DEFAULT_SITE_CONFIG } from "@/lib/admin/site-config-defaults";
import { resetRateLimitsForTests } from "@/lib/guardrails/rate-limit";

const mocks = vi.hoisted(() => ({
  config: {
    ADMIN_AUTH_SECRET: "a-test-secret-that-is-long-enough-123456",
  },
  listAdminProjects: vi.fn(),
  createAdminProject: vi.fn(),
  updateAdminProject: vi.fn(),
  deleteAdminProject: vi.fn(),
  getAdminSiteConfigState: vi.fn(),
  saveAdminSiteConfig: vi.fn(),
  revalidatePath: vi.fn(),
}));

const SECRET = mocks.config.ADMIN_AUTH_SECRET;

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/config", () => ({
  getConfig: () => mocks.config,
}));

vi.mock("@/lib/admin/projects", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/admin/projects")>("@/lib/admin/projects");
  return {
    ...actual,
    listAdminProjects: mocks.listAdminProjects,
    createAdminProject: mocks.createAdminProject,
    updateAdminProject: mocks.updateAdminProject,
    deleteAdminProject: mocks.deleteAdminProject,
  };
});

vi.mock("@/lib/admin/site-config", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/admin/site-config")>("@/lib/admin/site-config");
  return {
    ...actual,
    getAdminSiteConfigState: mocks.getAdminSiteConfigState,
    saveAdminSiteConfig: mocks.saveAdminSiteConfig,
  };
});

import { GET as getProjects, POST as postProject } from "@/app/api/admin/projects/route";
import {
  DELETE as deleteProject,
  PATCH as patchProject,
} from "@/app/api/admin/projects/[slug]/route";
import {
  GET as getSiteConfigRoute,
  PUT as putSiteConfigRoute,
} from "@/app/api/admin/site-config/route";
import {
  ProjectConflictError,
  ProjectNotFoundError,
  ProjectStoreNotConfiguredError,
} from "@/lib/admin/projects";
import { SiteConfigStoreNotConfiguredError } from "@/lib/admin/site-config";

const sampleProject = {
  slug: "dispatch-portal",
  title: "Automated dispatch scheduling portal",
  summary: "Replaced spreadsheet order assignments with a live queue.",
  client: "Operations sample",
  category: "operations" as const,
  categoryLabel: "Operations",
  solution_type: "Portal + workflow automation",
  image: "/images/work/order-processing-automation.webp",
  imageAlt: "Workflow dashboard preview",
  secondaryImage: null,
  secondaryImageAlt: null,
  liveUrl: null,
  problemBrief: "Orders stalled in inbox threads.",
  approachBrief: "Structured intake synced into live queue.",
  outcomeBrief: "Removed duplicate spreadsheet typing.",
  highlights: ["Live queue updates", "Role-based status transitions"],
  tags: ["operations"],
  body: "Detailed build summary.",
  publishedAt: "2026-11-15",
  order: 6,
  featuredOnHome: true,
  status: "published" as const,
};

function signedCookie() {
  const token = createAdminSessionToken(SECRET);
  return `clarteon_admin=${encodeURIComponent(token)}`;
}

function makeRequest(
  url: string,
  method: string,
  body?: unknown,
  options: { cookie?: string; origin?: string } = {},
) {
  return new Request(url, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      Origin: options.origin ?? "http://localhost:3000",
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => {
  resetRateLimitsForTests();
  mocks.listAdminProjects.mockReset();
  mocks.createAdminProject.mockReset();
  mocks.updateAdminProject.mockReset();
  mocks.deleteAdminProject.mockReset();
  mocks.getAdminSiteConfigState.mockReset();
  mocks.saveAdminSiteConfig.mockReset();
  mocks.revalidatePath.mockReset();
});

describe("/api/admin/projects and /api/admin/site-config routes", () => {
  it("enforces admin authentication and origin checks on project mutations", async () => {
    const unauthGet = await getProjects(
      makeRequest("http://localhost:3000/api/admin/projects", "GET"),
    );
    expect(unauthGet.status).toBe(401);

    const badOrigin = await postProject(
      makeRequest("http://localhost:3000/api/admin/projects", "POST", sampleProject, {
        cookie: signedCookie(),
        origin: "https://evil.example",
      }),
    );
    expect(badOrigin.status).toBe(403);

    const unauthPost = await postProject(
      makeRequest("http://localhost:3000/api/admin/projects", "POST", sampleProject),
    );
    expect(unauthPost.status).toBe(401);
  });

  it("creates, updates, and deletes projects cleanly while revalidating paths", async () => {
    mocks.createAdminProject.mockResolvedValue(sampleProject);
    const created = await postProject(
      makeRequest("http://localhost:3000/api/admin/projects", "POST", sampleProject, {
        cookie: signedCookie(),
      }),
    );
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ ok: true, project: sampleProject });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/our-work/dispatch-portal");

    mocks.updateAdminProject.mockResolvedValue({ ...sampleProject, title: "Updated title" });
    const updated = await patchProject(
      makeRequest(
        "http://localhost:3000/api/admin/projects/dispatch-portal",
        "PATCH",
        { ...sampleProject, title: "Updated title" },
        { cookie: signedCookie() },
      ),
      { params: Promise.resolve({ slug: "dispatch-portal" }) },
    );
    expect(updated.status).toBe(200);

    mocks.deleteAdminProject.mockResolvedValue(undefined);
    const deleted = await deleteProject(
      makeRequest("http://localhost:3000/api/admin/projects/dispatch-portal", "DELETE", undefined, {
        cookie: signedCookie(),
      }),
      { params: Promise.resolve({ slug: "dispatch-portal" }) },
    );
    expect(deleted.status).toBe(200);
  });

  it("maps project storage errors cleanly", async () => {
    mocks.createAdminProject.mockRejectedValue(new ProjectConflictError());
    const conflict = await postProject(
      makeRequest("http://localhost:3000/api/admin/projects", "POST", sampleProject, {
        cookie: signedCookie(),
      }),
    );
    expect(conflict.status).toBe(409);

    mocks.createAdminProject.mockRejectedValue(new ProjectStoreNotConfiguredError());
    const unconfigured = await postProject(
      makeRequest("http://localhost:3000/api/admin/projects", "POST", sampleProject, {
        cookie: signedCookie(),
      }),
    );
    expect(unconfigured.status).toBe(503);

    mocks.deleteAdminProject.mockRejectedValue(new ProjectNotFoundError());
    const missing = await deleteProject(
      makeRequest("http://localhost:3000/api/admin/projects/dispatch-portal", "DELETE", undefined, {
        cookie: signedCookie(),
      }),
      { params: Promise.resolve({ slug: "dispatch-portal" }) },
    );
    expect(missing.status).toBe(404);
  });

  it("guards and saves site configuration payloads", async () => {
    const unauthGet = await getSiteConfigRoute(
      makeRequest("http://localhost:3000/api/admin/site-config", "GET"),
    );
    expect(unauthGet.status).toBe(401);

    const badMedia = await putSiteConfigRoute(
      makeRequest(
        "http://localhost:3000/api/admin/site-config",
        "PUT",
        {
          ...DEFAULT_SITE_CONFIG,
          media: {
            ...DEFAULT_SITE_CONFIG.media,
            aboutClarity: "javascript:alert(1)",
          },
        },
        { cookie: signedCookie() },
      ),
    );
    expect(badMedia.status).toBe(400);

    mocks.saveAdminSiteConfig.mockResolvedValue(DEFAULT_SITE_CONFIG);
    const okPut = await putSiteConfigRoute(
      makeRequest("http://localhost:3000/api/admin/site-config", "PUT", DEFAULT_SITE_CONFIG, {
        cookie: signedCookie(),
      }),
    );
    expect(okPut.status).toBe(200);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");

    mocks.saveAdminSiteConfig.mockRejectedValue(new SiteConfigStoreNotConfiguredError());
    const unconfiguredPut = await putSiteConfigRoute(
      makeRequest("http://localhost:3000/api/admin/site-config", "PUT", DEFAULT_SITE_CONFIG, {
        cookie: signedCookie(),
      }),
    );
    expect(unconfiguredPut.status).toBe(503);
  });
});
