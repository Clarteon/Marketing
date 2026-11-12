import Link from "next/link";
import { LeadSourceBadge } from "@/components/admin/LeadSourceBadge";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { dateLabel } from "@/lib/admin/format";
import type { AdminLeadRow } from "@/lib/admin/lead-queries";
import { cx } from "@/lib/cx";
import { teamSizeLabels, type TeamSize } from "@/lib/leads/constants";
import styles from "@/app/admin/admin.module.css";

function teamSizeLabel(value?: string): string | undefined {
  if (!value) return undefined;
  return teamSizeLabels[value as TeamSize] ?? value;
}

function leadDetail(row: AdminLeadRow): string {
  const parts = [row.company, teamSizeLabel(row.teamSize)].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "No company or team size";
}

interface EmailState {
  label: string;
  detail?: string;
  variant: "sent" | "failed" | "partial" | "idle";
}

function emailState(row: AdminLeadRow): EmailState {
  const teamSent = row.teamEmailSentAt !== undefined;
  const receiptSent = row.receiptEmailSentAt !== undefined;

  if (teamSent && receiptSent) return { label: "Sent", variant: "sent" };

  if (row.lastError) return { label: "Failed", detail: row.lastError, variant: "failed" };

  if (teamSent || receiptSent) {
    return {
      label: "Partial",
      detail: teamSent ? "Team alert only" : "Guest receipt only",
      variant: "partial",
    };
  }

  return { label: "Not sent", detail: "No send recorded", variant: "idle" };
}

interface LeadsTableProps {
  rows: AdminLeadRow[];
}

export function LeadsTable({ rows }: LeadsTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table
        className={cx(styles.table, styles.leadsTable)}
        aria-label="Project briefs and Clara leads"
      >
        <colgroup>
          <col className={styles.receivedCol} />
          <col className={styles.leadCol} />
          <col className={styles.needCol} />
          <col className={styles.sourceCol} />
          <col className={styles.statusCol} />
          <col className={styles.emailsCol} />
          <col className={styles.editCol} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Received</th>
            <th scope="col">Lead</th>
            <th scope="col">Need</th>
            <th scope="col">Source</th>
            <th scope="col">Status</th>
            <th scope="col">Emails</th>
            <th scope="col">Edit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const email = emailState(row);

            return (
              <tr key={row.id}>
                <td>{dateLabel(row.createdAt)}</td>
                <td>
                  <div className={cx(styles.cellStack, styles.leadCellStack)}>
                    <Link className={styles.leadName} href={`/admin/leads/${row.id}`}>
                      {row.name}
                    </Link>
                    <a className={styles.cellSub} href={`mailto:${row.email}`}>
                      {row.email}
                    </a>
                    <span className={styles.cellSub}>{leadDetail(row)}</span>
                  </div>
                </td>
                <td className={styles.needCell}>
                  <span className={styles.notesPreview} tabIndex={0}>
                    {row.need}
                  </span>
                </td>
                <td>
                  <LeadSourceBadge source={row.source} />
                </td>
                <td>
                  <LeadStatusBadge status={row.status} />
                </td>
                <td>
                  <div className={cx(styles.cellStack, styles.cellStackTight)}>
                    <span>
                      <span
                        className={cx(
                          styles.badge,
                          email.variant === "sent" && styles.badgeSent,
                          email.variant === "failed" && styles.badgeCancelled,
                          email.variant === "partial" && styles.badgePartial,
                          email.variant === "idle" && styles.badgeIdle,
                        )}
                      >
                        {email.label}
                      </span>
                    </span>
                    {email.detail ? <span className={styles.cellSub}>{email.detail}</span> : null}
                  </div>
                </td>
                <td>
                  <Link
                    href={`/admin/leads/${row.id}`}
                    className={styles.editButton}
                    aria-label={`Edit lead from ${row.name}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
