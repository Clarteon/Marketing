import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Add it to .env.local or the environment.");
  process.exit(1);
}

const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const statements = schema
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

const sql = neon(databaseUrl);

try {
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log("Lead and booking database schema is ready.");
} catch (error) {
  console.error("Could not apply the lead and booking database schema.");
  console.error(error instanceof Error ? error.name : "Unknown error");
  process.exitCode = 1;
}
