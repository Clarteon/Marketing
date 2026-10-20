import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Add it to .env.local or the environment.");
  process.exit(1);
}

const retentionMonths = 12;
const dryRun = process.argv.includes("--dry-run");
const cutoff = new Date();
cutoff.setUTCMonth(cutoff.getUTCMonth() - retentionMonths);

const sql = neon(databaseUrl);

try {
  if (dryRun) {
    const rows = await sql`
      SELECT count(*)::int AS count
      FROM leads
      WHERE created_at < ${cutoff.toISOString()}
    `;
    console.log(
      `Would delete ${rows[0]?.count ?? 0} lead(s) older than ${retentionMonths} months.`,
    );
  } else {
    const rows = await sql`
      DELETE FROM leads
      WHERE created_at < ${cutoff.toISOString()}
      RETURNING id
    `;
    console.log(`Deleted ${rows.length} lead(s) older than ${retentionMonths} months.`);
  }
} catch (error) {
  console.error("Could not apply the lead retention rule.");
  console.error(error instanceof Error ? error.name : "Unknown error");
  process.exitCode = 1;
}
