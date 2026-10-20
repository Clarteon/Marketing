import { afterEach, describe, expect, it, vi } from "vitest";
import { TurnstileUnavailableError, verifyTurnstile } from "@/lib/guardrails/turnstile";

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("Turnstile verification", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts a successful test token without an action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ success: true })));

    await expect(verifyTurnstile("token", "203.0.113.7", "secret")).resolves.toBe(true);
  });

  it("accepts the lead form action and rejects a token for another action", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValueOnce(response({ success: true, action: "lead-form" }));
    await expect(verifyTurnstile("token", "unknown", "secret")).resolves.toBe(true);

    fetchMock.mockResolvedValueOnce(response({ success: true, action: "other-form" }));
    await expect(verifyTurnstile("token", "unknown", "secret")).resolves.toBe(false);
  });

  it("rejects an unsuccessful token", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(response({ success: false, "error-codes": ["invalid-input-response"] })),
    );

    await expect(verifyTurnstile("token", "unknown", "secret")).resolves.toBe(false);
  });

  it("reports the provider as unavailable on a server error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 500)));

    await expect(verifyTurnstile("token", "unknown", "secret")).rejects.toBeInstanceOf(
      TurnstileUnavailableError,
    );
  });
});
