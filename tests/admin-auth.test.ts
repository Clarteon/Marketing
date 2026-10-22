import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_SECONDS,
  adminCookie,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/admin/auth";
import { secretsMatch } from "@/lib/security/secrets";

const SECRET = "a-test-secret-that-is-long-enough-123456";

describe("admin session tokens", () => {
  it("accepts a freshly created token", () => {
    const now = Date.parse("2026-10-22T08:00:00.000Z");
    const token = createAdminSessionToken(SECRET, now, "nonce-123456");
    expect(verifyAdminSessionToken(token, SECRET, now + 1_000)).toBe(true);
  });

  it("rejects a tampered token", () => {
    const token = createAdminSessionToken(SECRET, Date.now(), "nonce-123456");
    expect(verifyAdminSessionToken(`${token}x`, SECRET)).toBe(false);
    expect(verifyAdminSessionToken(token.replace(".", ".x"), SECRET)).toBe(false);
  });

  it("rejects a token signed with another secret", () => {
    const token = createAdminSessionToken(SECRET, Date.now(), "nonce-123456");
    expect(verifyAdminSessionToken(token, `${SECRET}-other`)).toBe(false);
  });

  it("expires after the session window", () => {
    const now = Date.parse("2026-10-22T08:00:00.000Z");
    const token = createAdminSessionToken(SECRET, now, "nonce-123456");
    expect(
      verifyAdminSessionToken(token, SECRET, now + ADMIN_SESSION_SECONDS * 1_000 + 1_000),
    ).toBe(false);
  });

  it("rejects a token issued in the future", () => {
    const now = Date.parse("2026-10-22T08:00:00.000Z");
    const token = createAdminSessionToken(SECRET, now + 60 * 60 * 1_000, "nonce-123456");
    expect(verifyAdminSessionToken(token, SECRET, now)).toBe(false);
  });

  it("sets an HttpOnly, SameSite cookie", () => {
    const cookie = adminCookie("token");
    expect(cookie).toContain("clarteon_admin=token");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
  });
});

describe("secretsMatch", () => {
  it("compares without accepting a prefix", () => {
    expect(secretsMatch("correct horse", "correct horse")).toBe(true);
    expect(secretsMatch("correct", "correct horse")).toBe(false);
    expect(secretsMatch("", "correct horse")).toBe(false);
  });
});
