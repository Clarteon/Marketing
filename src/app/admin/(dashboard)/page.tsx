import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardOverview } from "@/components/admin/DashboardOverview";
import { Button } from "@/components/ui/Button";
import { isAdminPageAuthenticated } from "@/lib/admin/auth";
import {
  getLeadStats,
  listLeads,
  type AdminLeadRow,
  type LeadStats,
} from "@/lib/admin/lead-queries";
import { listAdminProjects } from "@/lib/admin/projects";
import {
  getBookingStats,
  listBookings,
  type AdminBookingRow,
  type BookingStats,
} from "@/lib/admin/queries";
import { getConfig } from "@/lib/config";
import { getReviewQueue } from "@/lib/knowledge/service";
import { logServerEvent } from "@/lib/log";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

async function attempt<T>(event: string, run: () => Promise<T>): Promise<T | undefined> {
  try {
    return await run();
  } catch (error) {
    logServerEvent(event, { code: error instanceof Error ? error.name : "unknown" });
    return undefined;
  }
}

export default async function AdminDashboardPage() {
  if (!(await isAdminPageAuthenticated())) redirect("/admin/login");

  const configured = Boolean(getConfig().DATABASE_URL);

  let stats: BookingStats | undefined;
  let leadStats: LeadStats | undefined;
  let upcoming: AdminBookingRow[] = [];
  let recentLeads: AdminLeadRow[] = [];
  let openQuestions: number | undefined;
  let projectStats: { published: number; drafts: number; featured: number } | undefined;

  if (configured) {
    const [bookings, leads, nextCalls, latestLeads, queue, projectsResult] = await Promise.all([
      attempt("admin_dashboard_stats_failed", getBookingStats),
      attempt("admin_dashboard_lead_stats_failed", getLeadStats),
      attempt("admin_dashboard_upcoming_failed", () =>
        listBookings({ status: "all", timing: "upcoming", page: 1 }),
      ),
      attempt("admin_dashboard_leads_failed", () =>
        listLeads({ source: "all", status: "all", page: 1 }),
      ),
      attempt("admin_dashboard_review_failed", () => getReviewQueue(50)),
      attempt("admin_dashboard_projects_failed", listAdminProjects),
    ]);

    stats = bookings;
    leadStats = leads;
    upcoming = nextCalls?.rows.slice(0, 3) ?? [];
    recentLeads = latestLeads?.rows.slice(0, 3) ?? [];
    openQuestions = queue?.length;
    if (projectsResult) {
      projectStats = {
        published: projectsResult.projects.filter((project) => project.status === "published")
          .length,
        drafts: projectsResult.projects.filter((project) => project.status === "draft").length,
        featured: projectsResult.projects.filter(
          (project) => project.status === "published" && project.featuredOnHome,
        ).length,
      };
    }
  }

  const unavailable =
    configured && (stats === undefined || leadStats === undefined || openQuestions === undefined);

  return (
    <main className={styles.page} id="main">
      <div className={styles.reviewHeader}>
        <div>
          <p className={styles.eyebrow}>Clarteon admin</p>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.intro}>
            Calls, leads and the review queue at a glance, with the full lists one click away.
          </p>
        </div>
      </div>

      {!configured ? (
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            Admin storage is not configured. Add <code>DATABASE_URL</code> in the server environment
            and run <code>npm run db:init</code>.
          </p>
        </div>
      ) : (
        <DashboardOverview
          bookings={stats}
          leads={leadStats}
          upcoming={upcoming}
          recentLeads={recentLeads}
          openQuestions={openQuestions}
          projectStats={projectStats}
          unavailable={unavailable}
        />
      )}

      <div className={styles.dashboardActions}>
        <Button href="/admin/bookings">View all bookings</Button>
        <Button href="/admin/projects" variant="secondary">
          Manage projects
        </Button>
        <Button href="/admin/site" variant="secondary">
          Site config
        </Button>
        <Button href="/admin/review" variant="secondary">
          Open review queue
        </Button>
      </div>
    </main>
  );
}
