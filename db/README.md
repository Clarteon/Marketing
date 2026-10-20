# Lead database

The project brief form saves leads to a Neon Postgres database. The table and
indexes live in `schema.sql`.

## Apply the schema

Set `DATABASE_URL` in `.env.local` or the environment, then run:

```bash
npm run db:init
```

The script is safe to run again. It does not print the connection string.

## Backup

The Neon free plan does not guarantee automatic backups. Export or back up the
`leads` table on a schedule you control, store the backup encrypted, and keep it
out of this repository. Treat every export as personal data.

## Retention

Leads are kept for 12 months. Run the retention script on a schedule:

```bash
npm run db:prune -- --dry-run   # count first
npm run db:prune                # delete expired rows
```

The retention period is also recorded in `src/lib/leads/constants.ts`. Keep the
two in sync if the policy changes.

A deletion request from a visitor should be handled by a person with database
access. Delete the matching row, then confirm the deletion to the visitor.

## Access

Keep `DATABASE_URL` server-side only. Never prefix it with `NEXT_PUBLIC_`, commit
it, print it, or send it to a browser or third party.
