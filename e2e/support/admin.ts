import { tmpdir } from "node:os";
import { join } from "node:path";

export const PORT = 3100;

export const BASE_URL = `http://localhost:${PORT}`;

export const ADMIN_PASSWORD = "e2e-admin-secret-that-is-long-enough-123456";

export const ADMIN_STATE = join(tmpdir(), "clarteon-e2e", "admin-state.json");
