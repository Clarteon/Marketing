import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sqlStatements } from "../scripts/lib/sql.mjs";

describe("database schema", () => {
  it("does not split a statement on a semicolon inside a comment", () => {
    const statements = sqlStatements("-- pending; confirmed\ncreate table test (id int);");
    expect(statements).toEqual(["create table test (id int)"]);
  });

  it("parses every statement in the checked-in schema", async () => {
    const schema = await readFile(resolve(process.cwd(), "db/schema.sql"), "utf8");
    const statements = sqlStatements(schema);

    expect(statements).toHaveLength(28);
    expect(statements.every((statement) => /^(create|alter) /i.test(statement))).toBe(true);
    expect(
      statements.some((statement) =>
        statement.includes("add column if not exists status text not null default 'new'"),
      ),
    ).toBe(true);
    expect(
      statements.some(
        (statement) =>
          statement.includes("status in ('new', 'contacted', 'booked', 'closed')") &&
          statement.includes("leads_status_check"),
      ),
    ).toBe(true);
    expect(
      statements.some((statement) => statement.includes("create table if not exists bookings")),
    ).toBe(true);
    expect(
      statements.some((statement) =>
        statement.includes("create unique index if not exists bookings_active_slot_idx"),
      ),
    ).toBe(true);
    expect(
      statements.some(
        (statement) =>
          statement.includes("check (status in ('pending', 'confirmed', 'cancelled'))") &&
          !statement.includes("check (status in ('pending', 'confirmed'))"),
      ),
    ).toBe(true);
    expect(
      statements.some((statement) =>
        statement.includes("create table if not exists knowledge_questions"),
      ),
    ).toBe(true);
    expect(
      statements.some((statement) =>
        statement.includes("check (source in ('website-form', 'clara-chat'))"),
      ),
    ).toBe(true);
    expect(
      statements.some((statement) =>
        statement.includes("create table if not exists site_projects"),
      ),
    ).toBe(true);
    expect(
      statements.some((statement) => statement.includes("create table if not exists site_config")),
    ).toBe(true);
  });
});
