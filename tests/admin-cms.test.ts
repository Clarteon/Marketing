import { describe, expect, it } from "vitest";
import {
  adminProjectSchema,
  adminSiteConfigSchema,
  safeAssetLocationSchema,
} from "@/lib/admin/schema";
import { DEFAULT_SITE_CONFIG } from "@/lib/admin/site-config-defaults";
import { DEFAULT_TEAM_MEMBERS, resolveTeamMembers } from "@/lib/team";

describe("admin CMS schemas and team directory", () => {
  it("validates local and https image locations while rejecting unsafe protocols", () => {
    expect(safeAssetLocationSchema.safeParse("/images/work/example.webp").success).toBe(true);
    expect(safeAssetLocationSchema.safeParse("https://cdn.example.com/photo.jpg").success).toBe(
      true,
    );
    expect(safeAssetLocationSchema.safeParse("").success).toBe(true);

    expect(safeAssetLocationSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(safeAssetLocationSchema.safeParse("http://insecure.example.com/a.jpg").success).toBe(
      false,
    );
    expect(safeAssetLocationSchema.safeParse("/images/../secret.png").success).toBe(false);
  });

  it("validates admin project payloads cleanly", () => {
    const valid = adminProjectSchema.safeParse({
      slug: "custom-dispatch-board",
      title: "Custom dispatch scheduling portal",
      summary: "Replaced manual spreadsheet dispatch sheets with a live role-based queue.",
      client: "Logistics team",
      category: "operations",
      highlights: ["Cut manual scheduling checks", "Automated webhook retries"],
      tags: ["automation", "portal"],
      order: 6,
      featuredOnHome: true,
      status: "published",
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.highlights).toHaveLength(2);
      expect(valid.data.featuredOnHome).toBe(true);
    }

    const invalidSlug = adminProjectSchema.safeParse({
      slug: "Bad Slug With Spaces!",
      title: "Valid title",
      summary: "Enough summary text to validate cleanly.",
    });
    expect(invalidSlug.success).toBe(false);
  });

  it("validates default site configuration and resolves custom team portraits", () => {
    expect(adminSiteConfigSchema.safeParse(DEFAULT_SITE_CONFIG).success).toBe(true);
    expect(DEFAULT_TEAM_MEMBERS).toHaveLength(5);

    const updated = resolveTeamMembers({
      "hsisan-angel-romero": "https://cdn.example.com/hsisan.webp",
      "brandon-abuya": "   ",
    });

    expect(updated.find((m) => m.id === "hsisan-angel-romero")?.photoUrl).toBe(
      "https://cdn.example.com/hsisan.webp",
    );
    expect(updated.find((m) => m.id === "brandon-abuya")?.photoUrl).toBeNull();
  });
});
