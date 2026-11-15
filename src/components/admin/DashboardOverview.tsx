import Link from "next/link";
import { BookingStatusBadge } from "@/components/admin/BookingStatusBadge";
import { LeadSourceBadge } from "@/components/admin/LeadSourceBadge";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { dateLabel } from "@/lib/admin/format";
import type { AdminLeadRow, LeadStats } from "@/lib/admin/lead-queries";
import type { AdminBookingRow, BookingStats } from "@/lib/admin/queries";
import { cx } from "@/lib/cx";
import styles from "@/app/admin/admin.module.css";

interface DashboardOverviewProps {
  bookings?: BookingStats;
  leads?: LeadStats;
  upcoming: AdminBookingRow[];
  recentLeads: AdminLeadRow[];
  openQuestions?: number;
  projectStats?: { published: number; drafts: number; featured: number };
  unavailable: boolean;
}

function count(value?: number): string {
  return value === undefined ? "—" : String(value);
}

export function DashboardOverview({
  bookings,
  leads,
  upcoming,
  recentLeads,
  openQuestions,
  projectStats,
  unavailable,
}: DashboardOverviewProps) {
  return (
    <>
      {unavailable ? (
        <p className={styles.notice} role="status">
          Some dashboard numbers are temporarily unavailable. Try again in a moment.
        </p>
      ) : null}

      <section className={styles.dashboardSection} aria-labelledby="dashboard-calls">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle} id="dashboard-calls">
            Discovery calls
          </h2>
          <Link className={styles.sectionLink} href="/admin/bookings">
            All bookings
          </Link>
        </div>
        {bookings ? (
          <div className={styles.statGrid}>
            <div className={cx(styles.statCard, styles.statPending)}>
              <span className={styles.statValue}>{bookings.pending}</span>
              <p className={styles.statLabel}>Holds to confirm</p>
            </div>
            <div className={cx(styles.statCard, styles.statConfirmed)}>
              <span className={styles.statValue}>{bookings.confirmed}</span>
              <p className={styles.statLabel}>Confirmed calls</p>
            </div>
            <div className={cx(styles.statCard, styles.statCancelled)}>
              <span className={styles.statValue}>{bookings.cancelled}</span>
              <p className={styles.statLabel}>Cancelled</p>
            </div>
            <div className={cx(styles.statCard, styles.statUpcoming)}>
              <span className={styles.statValue}>{bookings.upcoming}</span>
              <p className={styles.statLabel}>Upcoming</p>
            </div>
          </div>
        ) : (
          <p className={styles.emptyState}>Booking numbers are not available right now.</p>
        )}
      </section>

      <section className={styles.dashboardSection} aria-labelledby="dashboard-attention">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle} id="dashboard-attention">
            Needs attention
          </h2>
        </div>
        <ul className={styles.attentionList}>
          <li className={styles.attentionRow}>
            <Link className={styles.attentionLink} href="/admin/leads?status=new">
              <span>New leads waiting for a reply</span>
              <span className={styles.attentionCount}>{count(leads?.new)}</span>
            </Link>
          </li>
          <li className={styles.attentionRow}>
            <Link className={styles.attentionLink} href="/admin/bookings?status=pending">
              <span>Holds waiting to be confirmed</span>
              <span className={styles.attentionCount}>{count(bookings?.pending)}</span>
            </Link>
          </li>
          <li className={styles.attentionRow}>
            <Link className={styles.attentionLink} href="/admin/review">
              <span>Questions in the review queue</span>
              <span className={styles.attentionCount}>{count(openQuestions)}</span>
            </Link>
          </li>
          <li className={styles.attentionRow}>
            <Link className={styles.attentionLink} href="/admin/leads">
              <span>Leads whose email did not send</span>
              <span className={styles.attentionCount}>{count(leads?.withError)}</span>
            </Link>
          </li>
          {projectStats ? (
            <li className={styles.attentionRow}>
              <Link className={styles.attentionLink} href="/admin/projects">
                <span>
                  Published case studies &amp; projects ({projectStats.featured} featured on home,{" "}
                  {projectStats.drafts} drafts)
                </span>
                <span className={styles.attentionCount}>{projectStats.published}</span>
              </Link>
            </li>
          ) : null}
        </ul>
      </section>

      <section className={styles.dashboardSection} aria-labelledby="dashboard-lead-stats">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle} id="dashboard-lead-stats">
            Leads
          </h2>
          <Link className={styles.sectionLink} href="/admin/leads">
            All leads
          </Link>
        </div>
        {leads ? (
          <div className={styles.statGrid}>
            <div className={cx(styles.statCard, styles.statTotal)}>
              <span className={styles.statValue}>{leads.total}</span>
              <p className={styles.statLabel}>Total leads</p>
            </div>
            <div className={cx(styles.statCard, styles.statNew)}>
              <span className={styles.statValue}>{leads.new}</span>
              <p className={styles.statLabel}>New</p>
            </div>
            <div className={cx(styles.statCard, styles.statRecent)}>
              <span className={styles.statValue}>{leads.lastSevenDays}</span>
              <p className={styles.statLabel}>Last 7 days</p>
            </div>
            <div className={cx(styles.statCard, styles.statFailed)}>
              <span className={styles.statValue}>{leads.withError}</span>
              <p className={styles.statLabel}>Email failures</p>
            </div>
          </div>
        ) : (
          <p className={styles.emptyState}>Lead numbers are not available right now.</p>
        )}
      </section>

      <div className={styles.dashboardColumns}>
        <section className={styles.dashboardSection} aria-labelledby="dashboard-next">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle} id="dashboard-next">
              Next calls
            </h2>
          </div>
          {upcoming.length > 0 ? (
            <ul className={styles.dashboardList}>
              {upcoming.map((booking) => (
                <li className={styles.dashboardRow} key={booking.requestId}>
                  <div className={styles.rowMain}>
                    <Link className={styles.rowTitle} href={`/admin/bookings/${booking.requestId}`}>
                      {booking.name}
                    </Link>
                    <span className={styles.rowMeta}>
                      {dateLabel(booking.slotStart)} · {booking.timezone}
                    </span>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>No calls on the calendar yet.</p>
          )}
        </section>

        <section className={styles.dashboardSection} aria-labelledby="dashboard-latest">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle} id="dashboard-latest">
              Latest leads
            </h2>
          </div>
          {recentLeads.length > 0 ? (
            <ul className={styles.dashboardList}>
              {recentLeads.map((lead) => (
                <li className={styles.dashboardRow} key={lead.id}>
                  <div className={styles.rowMain}>
                    <Link className={styles.rowTitle} href={`/admin/leads/${lead.id}`}>
                      {lead.name}
                    </Link>
                    <span className={styles.rowMeta}>
                      {dateLabel(lead.createdAt)}
                      {lead.company ? ` · ${lead.company}` : ""}
                    </span>
                  </div>
                  <div className={styles.rowTags}>
                    <LeadSourceBadge source={lead.source} />
                    <LeadStatusBadge status={lead.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>No leads have arrived yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
