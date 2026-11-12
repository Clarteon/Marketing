import "server-only";
import { neon } from "@neondatabase/serverless";
import { getConfig } from "@/lib/config";
import { leadStatuses, teamSizes, type LeadStatus, type TeamSize } from "@/lib/leads/constants";
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
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
  teamEmailSentAt?: Date;
  receiptEmailSentAt?: Date;
  lastError?: string;
}

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  booked: number;
  closed: number;
  lastSevenDays: number;
  withError: number;
}

export interface AdminLeadPatch {
  name?: string;
  email?: string;
  company?: string | null;
  need?: string;
  teamSize?: TeamSize | null;
  status?: LeadStatus;
}

export class LeadNotFoundError extends Error {
  constructor() {
    super("Lead not found.");
    this.name = "LeadNotFoundError";
  }
}

export interface LeadsListResult {
  rows: AdminLeadRow[];
  total: number;
  page: number;
  pageSize: number;
}

interface LeadStatsRow {
  total: number | string;
  new: number | string;
  contacted: number | string;
  booked: number | string;
  closed: number | string;
  last_seven_days: number | string;
  with_error: number | string;
}

interface LeadListRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  need: string;
  team_size: string | null;
  source: string;
  status: string;
  created_at: string | Date;
  updated_at: string | Date;
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

function statusFromRow(value: string): LeadStatus {
  return (leadStatuses as readonly string[]).includes(value) ? (value as LeadStatus) : "new";
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
    status: statusFromRow(row.status),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
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
      id, name, email, company, need, team_size, source, status, created_at, updated_at,
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

export async function getLeadStats(): Promise<LeadStats> {
  const sql = getSql();

  const rows = (await sql`
    SELECT
      count(*)::int AS total,
      (count(*) FILTER (WHERE status = 'new'))::int AS new,
      (count(*) FILTER (WHERE status = 'contacted'))::int AS contacted,
      (count(*) FILTER (WHERE status = 'booked'))::int AS booked,
      (count(*) FILTER (WHERE status = 'closed'))::int AS closed,
      (count(*) FILTER (WHERE created_at > now() - interval '7 days'))::int AS last_seven_days,
      (count(*) FILTER (WHERE last_error IS NOT NULL))::int AS with_error
    FROM leads
  `) as unknown as LeadStatsRow[];

  const row = rows[0];
  return {
    total: Number(row?.total ?? 0),
    new: Number(row?.new ?? 0),
    contacted: Number(row?.contacted ?? 0),
    booked: Number(row?.booked ?? 0),
    closed: Number(row?.closed ?? 0),
    lastSevenDays: Number(row?.last_seven_days ?? 0),
    withError: Number(row?.with_error ?? 0),
  };
}

export async function getLead(id: string): Promise<AdminLeadRow | undefined> {
  const sql = getSql();

  const rows = (await sql`
    SELECT
      id, name, email, company, need, team_size, source, status, created_at, updated_at,
      team_email_sent_at, receipt_email_sent_at, last_error
    FROM leads
    WHERE id = ${id}
    LIMIT 1
  `) as unknown as LeadListRow[];

  return rows[0] ? mapRow(rows[0]) : undefined;
}

export async function updateLead(id: string, patch: AdminLeadPatch): Promise<AdminLeadRow> {
  const current = await getLead(id);
  if (!current) throw new LeadNotFoundError();

  const sql = getSql();
  const rows = (await sql`
    UPDATE leads
    SET name = ${patch.name ?? current.name},
        email = ${patch.email ?? current.email},
        company = ${patch.company === undefined ? (current.company ?? null) : patch.company},
        need = ${patch.need ?? current.need},
        team_size = ${patch.teamSize === undefined ? (current.teamSize ?? null) : patch.teamSize},
        status = ${patch.status ?? current.status},
        updated_at = now()
    WHERE id = ${id}
    RETURNING
      id, name, email, company, need, team_size, source, status, created_at, updated_at,
      team_email_sent_at, receipt_email_sent_at, last_error
  `) as unknown as LeadListRow[];

  if (rows.length === 0) throw new LeadNotFoundError();
  return mapRow(rows[0]);
}
