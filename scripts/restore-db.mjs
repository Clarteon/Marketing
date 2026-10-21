import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { BACKUP_TABLES, decryptBackup, insertStatement } from "./lib/backup-crypto.mjs";

const databaseUrl = process.env.DATABASE_URL;
const passphrase = process.env.BACKUP_PASSPHRASE;
const inIndex = process.argv.indexOf("--in");
const inPath = inIndex > -1 ? process.argv[inIndex + 1] : undefined;
const confirmed = process.argv.includes("--confirm");

if (!passphrase || !inPath || (confirmed && !databaseUrl)) {
  console.error("Usage: npm run db:restore -- --in <backup file> [--confirm]");
  console.error("Without --confirm it only decrypts and counts rows. Needs BACKUP_PASSPHRASE,");
  console.error("and DATABASE_URL for --confirm.");
  process.exit(1);
}

try {
  const backup = decryptBackup(await readFile(inPath, "utf8"), passphrase);
  const counts = BACKUP_TABLES.map((t) => `${t}: ${backup.tables[t]?.length ?? 0}`).join(", ");
  console.log(`Backup from ${backup.createdAt} decrypted (${counts}).`);

  if (!confirmed) {
    console.log("Dry run. Add --confirm to insert missing rows. Existing rows are never changed.");
  } else {
    const sql = neon(databaseUrl);
    for (const table of BACKUP_TABLES) {
      let inserted = 0;
      for (const row of backup.tables[table] ?? []) {
        const { text, params } = insertStatement(table, row);
        const result = await sql.query(text, params, { fullResults: true });
        inserted += result.rowCount ?? 0;
      }
      console.log(`${table}: inserted ${inserted} missing row(s).`);
    }
    console.log(
      "Next: re-apply any deletion requests received since the backup, then run npm run db:prune.",
    );
  }
} catch (error) {
  console.error("Could not restore the backup.");
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
}
