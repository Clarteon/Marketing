import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { isAdminPageAuthenticated } from "@/lib/admin/auth";
import { getBookingStats, type BookingStats } from "@/lib/admin/queries";
import { BookingStoreNotConfiguredError } from "@/lib/booking/store";
import { logServerEvent } from "@/lib/log";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  if (!(await isAdminPageAuthenticated())) redirect("/admin/login");

  let stats: BookingStats | undefined;
  let configured = true;
  let unavailable = false;

  try {
    stats = await getBookingStats();
  } catch (error) {
    if (error instanceof BookingStoreNotConfiguredError) {
      configured = false;
    } else {
      unavailable = true;
      logServerEvent("admin_dashboard_stats_failed", {
        code: error instanceof Error ? error.name : "unknown",
      });
    }
  }

  return (
    <main className={styles.page} id="main">
      <div className={styles.reviewHeader}>
        <div>
          <p className={styles.eyebrow}>Clarteon admin</p>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.intro}>
            Discovery-call bookings at a glance, with the full list one click away.
          </p>
        </div>
      </div>

      {!configured ? (
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            Booking storage is not configured. Add <code>DATABASE_URL</code> in the server
            environment and run <code>npm run db:init</code>.
          </p>
        </div>
      ) : unavailable ? (
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            Booking numbers are temporarily unavailable. Try again in a moment.
          </p>
        </div>
      ) : (
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats?.pending ?? 0}</span>
            <p className={styles.statLabel}>Pending holds</p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats?.confirmed ?? 0}</span>
            <p className={styles.statLabel}>Confirmed calls</p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats?.cancelled ?? 0}</span>
            <p className={styles.statLabel}>Cancelled</p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats?.upcoming ?? 0}</span>
            <p className={styles.statLabel}>Upcoming</p>
          </div>
        </div>
      )}

      <div className={styles.dashboardActions}>
        <Button href="/admin/bookings">View all bookings</Button>
        <Button href="/admin/review" variant="secondary">
          Open review queue
        </Button>
      </div>
    </main>
  );
}
