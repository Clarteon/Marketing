import "server-only";
import { neon } from "@neondatabase/serverless";
import type { EmailKind, Lead, LeadStore, LeadUpdate, NewLead, SaveLeadResult } from "./store";

interface LeadRow {
  id: string;
  request_id: string;
  name: string;
  email: string;
  company: string | null;
  need: string;
  team_size: string | null;
  source: string;
  created_at: string | Date;
}

type Sql = ReturnType<typeof neon>;

function mapRow(row: LeadRow): Lead {
  return {
    id: row.id,
    requestId: row.request_id,
    name: row.name,
    email: row.email,
    company: row.company ?? undefined,
    need: row.need,
    teamSize: (row.team_size ?? undefined) as Lead["teamSize"],
    source: row.source as Lead["source"],
    createdAt: new Date(row.created_at),
  };
}

export class NeonLeadStore implements LeadStore {
  private readonly sql: Sql;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  async save(input: NewLead): Promise<SaveLeadResult> {
    const id = input.requestId;
    const rows = (await this.sql`
      INSERT INTO leads (
        id, request_id, name, email, company, need, team_size, consent, source
      ) VALUES (
        ${id}, ${input.requestId}, ${input.name}, ${input.email},
        ${input.company ?? null}, ${input.need}, ${input.teamSize ?? null},
        true, ${input.source}
      )
      ON CONFLICT (request_id) DO NOTHING
      RETURNING id, request_id, name, email, company, need, team_size, source, created_at
    `) as unknown as LeadRow[];

    if (rows.length > 0) {
      return { lead: mapRow(rows[0]), created: true };
    }

    const existing = (await this.sql`
      SELECT id, request_id, name, email, company, need, team_size, source, created_at
      FROM leads
      WHERE request_id = ${input.requestId}
      LIMIT 1
    `) as unknown as LeadRow[];

    if (existing.length === 0) {
      throw new Error("Lead insert conflicted but no saved lead was found.");
    }

    return { lead: mapRow(existing[0]), created: false };
  }

  async updateFromChat(id: string, input: LeadUpdate): Promise<Lead> {
    const rows = (await this.sql`
      UPDATE leads
      SET name = ${input.name},
          email = ${input.email},
          company = ${input.company ?? null},
          need = ${input.need},
          team_size = ${input.teamSize ?? null}
      WHERE id = ${id} AND source = 'clara-chat'
      RETURNING id, request_id, name, email, company, need, team_size, source, created_at
    `) as unknown as LeadRow[];

    if (rows.length === 0) {
      throw new Error("The Clara lead could not be updated.");
    }

    return mapRow(rows[0]);
  }

  async markEmailSent(id: string, kind: EmailKind): Promise<void> {
    if (kind === "team") {
      await this.sql`UPDATE leads SET team_email_sent_at = now() WHERE id = ${id}`;
      return;
    }

    await this.sql`UPDATE leads SET receipt_email_sent_at = now() WHERE id = ${id}`;
  }

  async markEmailFailure(id: string, errorCode: string): Promise<void> {
    const safeCode = errorCode.slice(0, 120);
    await this.sql`UPDATE leads SET last_error = ${safeCode} WHERE id = ${id}`;
  }
}
