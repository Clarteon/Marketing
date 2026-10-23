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

    expect(statements).toHaveLength(15);
    expect(statements.every((statement) => /^(create|alter) /i.test(statement))).toBe(true);
    expect(
      statements.some((statement) => statement.includes("create table if not exists bookings")),
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
  });
});
