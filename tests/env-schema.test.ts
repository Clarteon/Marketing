import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env-schema";

describe("parseEnv", () => {
  it("applies safe defaults", () => {
    const env = parseEnv({ NODE_ENV: "test" });

    expect(env.LLM_MODEL_PRIMARY).toBe("openai/gpt-oss-120b");
    expect(env.LLM_MODEL_FALLBACKS).toBe("openai/gpt-oss-20b,qwen/qwen3.8-27b");
    expect(env.RATE_LIMIT_WINDOW_SECONDS).toBe(60);
    expect(env.RATE_LIMIT_MAX_REQUESTS).toBe(20);
    expect(env.CHAT_MAX_MESSAGES).toBe(20);
  });

  it("coerces numeric limits", () => {
    const env = parseEnv({
      NODE_ENV: "test",
      RATE_LIMIT_MAX_REQUESTS: "5",
      CHAT_MAX_MESSAGES: "12",
    });

    expect(env.RATE_LIMIT_MAX_REQUESTS).toBe(5);
    expect(env.CHAT_MAX_MESSAGES).toBe(12);
  });

  it("names the invalid variable in the error", () => {
    expect(() => parseEnv({ NODE_ENV: "test", RATE_LIMIT_MAX_REQUESTS: "zero" })).toThrow(
      /RATE_LIMIT_MAX_REQUESTS/,
    );
  });

  it("rejects a short sync secret", () => {
    expect(() => parseEnv({ NODE_ENV: "test", SYNC_SECRET: "too-short" })).toThrow(/SYNC_SECRET/);
  });
});
