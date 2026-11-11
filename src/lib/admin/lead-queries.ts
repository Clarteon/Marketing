import "server-only";
import { neon } from "@neondatabase/serverless";
import { getConfig } from "@/lib/config";
import { teamSizes, type TeamSize } from "@/lib/leads/constants";
import { LeadStoreNotConfiguredError, type LeadSource } from "@/lib/leads/store";
import type { LeadsListQuery } from "./schema";

export type { LeadsListQuery } from "./schema";
export const LEADS_PAGE_SIZE = 50;

export interface AdminLeadRow {
  id: string;
  name: string;
  email: string;
  company?: string;
  need: string;
  teamSize?: TeamSize;
  source: LeadSource;
  createdAt: Date;
  teamEmailSentAt?: Date;
  receiptEmailSentAt?: Date;
  lastError?: string;
}

export interface LeadsListResult {
  rows: AdminLeadRow[];
  total: number;
  page: number;
  pageSize: number;
}

interface LeadListRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  need: string;
  team_size: string | null;
  source: string;
  created_at: string | Date;
  team_email_sent_at: string | Date | null;
  receipt_email_sent_at: string | Date | null;
  last_error: string | null;
}

function getSql() {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) throw new LeadStoreNotConfiguredError();
  return neon(DATABASE_URL);
}

function teamSizeFromRow(value: string | null): TeamSize | undefined {
  if (!value) return undefined;
  return (teamSizes as readonly string[]).includes(value) ? (value as TeamSize) : undefined;
}

function mapRow(row: LeadListRow): AdminLeadRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company ?? undefined,
    need: row.need,
    teamSize: teamSizeFromRow(row.team_size),
    source: row.source as LeadSource,
    createdAt: new Date(row.created_at),
    teamEmailSentAt: row.team_email_sent_at ? new Date(row.team_email_sent_at) : undefined,
    receiptEmailSentAt: row.receipt_email_sent_at ? new Date(row.receipt_email_sent_at) : undefined,
    lastError: row.last_error ?? undefined,
  };
}

export async function listLeads(query: LeadsListQuery): Promise<LeadsListResult> {
  const sql = getSql();
  const { source, page } = query;
  const offset = (page - 1) * LEADS_PAGE_SIZE;

  const rows = (await sql`
    SELECT
      id, name, email, company, need, team_size, source, created_at,
      team_email_sent_at, receipt_email_sent_at, last_error
    FROM leads
    WHERE (${source} = 'all' OR source = ${source})
    ORDER BY created_at DESC
    LIMIT ${LEADS_PAGE_SIZE}
    OFFSET ${offset}
  `) as unknown as LeadListRow[];

  const countRows = (await sql`
    SELECT count(*)::int AS total
    FROM leads
    WHERE (${source} = 'all' OR source = ${source})
  `) as unknown as { total: number | string }[];

  return {
    rows: rows.map(mapRow),
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize: LEADS_PAGE_SIZE,
  };
}
