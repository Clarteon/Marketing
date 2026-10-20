import "server-only";
import { parseEnv, type Env } from "./env-schema";

let cached: Env | undefined;

/**
 * Server-only configuration. Validates on first use and fails with a clear
 * message listing every invalid variable.
 */
export function getConfig(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

export function resetConfigForTests(): void {
  cached = undefined;
}
