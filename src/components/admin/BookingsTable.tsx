import { dateLabel } from "@/lib/admin/format";
import { cx } from "@/lib/cx";
import type { AdminBookingRow } from "@/lib/admin/queries";
import styles from "@/app/admin/admin.module.css";

interface BookingsTableProps {
  rows: AdminBookingRow[];
}

export function BookingsTable({ rows }: BookingsTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} aria-label="Discovery-call bookings">
        <thead>
          <tr>
            <th scope="col">Slot</th>
            <th scope="col">Guest</th>
            <th scope="col">Status</th>
            <th scope="col">Meeting</th>
            <th scope="col">Booked</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.requestId}>
              <td>
                <div className={styles.cellStack}>
                  <span>{dateLabel(row.slotStart)}</span>
                  <span className={styles.cellSub}>{row.timezone}</span>
                </div>
              </td>
              <td>
                <div className={styles.cellStack}>
                  <span>{row.name}</span>
                  <a className={styles.cellSub} href={`mailto:${row.email}`}>
                    {row.email}
                  </a>
                </div>
              </td>
              <td>
                <span
                  className={cx(
                    styles.badge,
                    row.status === "confirmed" ? styles.badgeConfirmed : styles.badgePending,
                  )}
                >
                  {row.status === "confirmed" ? "Confirmed" : "Pending"}
                </span>
              </td>
              <td>
                {row.meetLink ? (
                  <a
                    className={styles.tableLink}
                    href={row.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join Meet
                  </a>
                ) : row.calendarLink ? (
                  <a
                    className={styles.tableLink}
                    href={row.calendarLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open calendar
                  </a>
                ) : (
                  <span className={styles.tableMuted}>Not created yet</span>
                )}
              </td>
              <td>{dateLabel(row.createdAt)}</td>
              <td className={styles.notesCell}>
                {row.notes ?? <span className={styles.tableMuted}>None</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
