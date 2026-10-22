import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  BACKUP_TABLES,
  assertOutsideRepo,
  decryptBackup,
  encryptBackup,
  insertStatement,
} from "../scripts/lib/backup-crypto.mjs";

const passphrase = "correct horse battery staple";
const backup = { createdAt: "2026-10-21T00:00:00.000Z", tables: { leads: [{ id: "1" }] } };

describe("backup encryption", () => {
  it("round-trips and keeps personal data out of the file text", () => {
    const text = encryptBackup(
      { ...backup, tables: { leads: [{ email: "ada@example.com" }] } },
      passphrase,
    );

    expect(text).not.toContain("ada@example.com");
    expect(decryptBackup(text, passphrase).tables.leads[0].email).toBe("ada@example.com");
  });

  it("rejects a wrong passphrase and a tampered file", () => {
    const text = encryptBackup(backup, passphrase);
    expect(() => decryptBackup(text, "a different passphrase!")).toThrow();

    const file = JSON.parse(text);
    file.data = Buffer.from("tampered").toString("base64");
    expect(() => decryptBackup(JSON.stringify(file), passphrase)).toThrow();
  });

  it("refuses a short passphrase", () => {
    expect(() => encryptBackup(backup, "short")).toThrow(/16 characters/);
  });

  it("refuses to write inside the repository", () => {
    const repo = join(tmpdir(), "clarteon-repo");
    expect(() => assertOutsideRepo(join(repo, "backup.json"), repo)).toThrow(/outside/);
    expect(assertOutsideRepo(join(tmpdir(), "backup.json"), repo)).toBe(
      join(tmpdir(), "backup.json"),
    );
  });
});

describe("restore inserts", () => {
  it("includes the knowledge tables in a backup", () => {
    expect(BACKUP_TABLES).toContain("knowledge_questions");
    expect(BACKUP_TABLES).toContain("knowledge_faqs");
    expect(BACKUP_TABLES).toContain("knowledge_audit");
    expect(BACKUP_TABLES).not.toContain("knowledge_index");
  });

  it("builds a parameterized insert that never overwrites", () => {
    expect(insertStatement("leads", { id: "1", email: "ada@example.com" })).toEqual({
      text: "INSERT INTO leads (id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      params: ["1", "ada@example.com"],
    });
  });

  it("rejects unknown tables and odd column names", () => {
    expect(() => insertStatement("users", { id: "1" })).toThrow();
    expect(() => insertStatement("leads", { "id); DROP TABLE leads;--": "1" })).toThrow();
  });
});
