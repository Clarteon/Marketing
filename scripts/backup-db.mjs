import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { BACKUP_TABLES, assertOutsideRepo, encryptBackup } from "./lib/backup-crypto.mjs";

const databaseUrl = process.env.DATABASE_URL;
const passphrase = process.env.BACKUP_PASSPHRASE;
const outIndex = process.argv.indexOf("--out");
const outPath = outIndex > -1 ? process.argv[outIndex + 1] : undefined;

if (!databaseUrl || !passphrase || !outPath) {
  console.error("Usage: npm run db:backup -- --out <file outside the repo>");
  console.error("Needs DATABASE_URL and BACKUP_PASSPHRASE in .env.local or the environment.");
  process.exit(1);
}

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const sql = neon(databaseUrl);

try {
  const target = assertOutsideRepo(outPath, repoRoot);
  const tables = {};
  for (const table of BACKUP_TABLES) {
    const exists = await sql`SELECT to_regclass(${table}) IS NOT NULL AS present`;
    tables[table] = exists[0]?.present ? await sql.query(`SELECT * FROM ${table}`) : [];
  }

  const backup = { createdAt: new Date().toISOString(), tables };
  await writeFile(target, encryptBackup(backup, passphrase), { mode: 0o600 });

  const counts = BACKUP_TABLES.map((table) => `${table}: ${tables[table].length}`).join(", ");
  console.log(`Encrypted backup written (${counts}).`);
} catch (error) {
  console.error("Could not write the backup.");
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
}
