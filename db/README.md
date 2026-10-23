# Lead, booking and knowledge database

The project brief form and Clara save leads to a Neon Postgres database, the booking flow
uses the same database for its pending and confirmed bookings, and Clara's
approved FAQ answers and unanswered-question queue live there too. The tables
and indexes live in `schema.sql`.

## Apply the schema

Set `DATABASE_URL` in `.env.local` or the environment, then run:

```bash
npm run db:init
```

The script is safe to run again. It does not print the connection string.

## Backup

The Neon free plan does not guarantee automatic backups, so take your own. Set
`BACKUP_PASSPHRASE` (16 or more characters, kept in a password manager) and run:

```bash
npm run db:backup -- --out "D:/secure/clarteon-2026-10-21.backup"
```

The file is encrypted with AES-256-GCM and must be written outside this
repository; the script refuses a path inside it. The backup includes leads,
bookings, the redacted knowledge questions, approved FAQs and the knowledge
audit log. Treat every backup as personal data: keep it off shared drives, and
delete old files on the same 12-month retention schedule as the leads.

## Restore

```bash
npm run db:restore -- --in "D:/secure/clarteon-2026-10-21.backup"            # decrypt and count only
npm run db:restore -- --in "D:/secure/clarteon-2026-10-21.backup" --confirm  # insert missing rows
```

A restore only inserts rows that are missing and never updates or deletes. Test
it against a Neon branch first. After a real restore, re-apply any deletion
requests received since the backup was taken, then run `npm run db:prune`, so
removed visitors do not come back.

## Retention

Leads are kept for 12 months. Run the retention script on a schedule:

```bash
npm run db:prune -- --dry-run   # count first
npm run db:prune                # delete expired rows
```

The retention period is also recorded in `src/lib/leads/constants.ts`. Keep the
two in sync if the policy changes.

Booking details are kept only as long as needed to arrange and follow up on the
call, unless a client relationship or law requires a longer period. The
`db:prune` script currently handles leads only; remove expired bookings in the
same scheduled maintenance run until a retention script covers them.

Knowledge questions are redacted before they are stored, but they are still
visitor text. A retention period for the review queue is a human decision and
is not set yet. Until it is, keep the queue small and delete reviewed questions
that are no longer useful. Published FAQ answers and the approval audit log are
not personal data.

A deletion request from a visitor should be handled by a person with database
access. Delete the matching rows, then confirm the deletion to the visitor.

## Access

Keep `DATABASE_URL` server-side only. Never prefix it with `NEXT_PUBLIC_`, commit
it, print it, or send it to a browser or third party.
