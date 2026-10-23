import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("security headers", () => {
  it("allows Turnstile's data: probe in connect-src", async () => {
    const groups = await nextConfig.headers?.();
    const headers = groups?.[0]?.headers ?? [];
    const csp = headers.find((header) => header.key === "Content-Security-Policy")?.value;

    expect(csp).toContain("connect-src 'self' data: https://challenges.cloudflare.com");
  });
});
