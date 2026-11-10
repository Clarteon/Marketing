import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingsTable } from "@/components/admin/BookingsTable";
import { Button } from "@/components/ui/Button";
import { isAdminPageAuthenticated } from "@/lib/admin/auth";
import { BOOKINGS_PAGE_SIZE, listBookings, type BookingsListResult } from "@/lib/admin/queries";
import { bookingsListSchema, type BookingsListQuery } from "@/lib/admin/schema";
import { BookingStoreNotConfiguredError } from "@/lib/booking/store";
import { logServerEvent } from "@/lib/log";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
};

interface BookingsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(pageNumber: number, query: BookingsListQuery): string {
  const params = new URLSearchParams();
  if (query.status !== "all") params.set("status", query.status);
  if (query.timing !== "all") params.set("timing", query.timing);
  if (pageNumber > 1) params.set("page", String(pageNumber));
  const qs = params.toString();
  return qs ? `/admin/bookings?${qs}` : "/admin/bookings";
}

export default async function AdminBookingsPage({ searchParams }: BookingsPageProps) {
  if (!(await isAdminPageAuthenticated())) redirect("/admin/login");

  const raw = await searchParams;
  const parsed = bookingsListSchema.safeParse({
    status: first(raw.status),
    timing: first(raw.timing),
    page: first(raw.page),
  });
  const query = parsed.success ? parsed.data : bookingsListSchema.parse({});

  let list: BookingsListResult | undefined;
  let configured = true;
  let unavailable = false;

  try {
    list = await listBookings(query);
  } catch (error) {
    if (error instanceof BookingStoreNotConfiguredError) {
      configured = false;
    } else {
      unavailable = true;
      logServerEvent("admin_bookings_list_failed", {
        code: error instanceof Error ? error.name : "unknown",
      });
    }
  }

  const total = list?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / BOOKINGS_PAGE_SIZE));
  const hasFilters = query.status !== "all" || query.timing !== "all";

  return (
    <main className={styles.page} id="main">
      <div className={styles.reviewHeader}>
        <div>
          <p className={styles.eyebrow}>Clarteon admin</p>
          <h1 className={styles.title}>Bookings</h1>
          <p className={styles.intro}>
            Every discovery call the site has booked. Times are shown in Manila time, with the guest
            timezone under the name.
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
            The booking list is temporarily unavailable. Try again in a moment.
          </p>
        </div>
      ) : list ? (
        <>
          <form className={styles.filterBar} method="get" action="/admin/bookings">
            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="filter-status">
                Status
              </label>
              <select
                className={styles.filterSelect}
                id="filter-status"
                name="status"
                defaultValue={query.status}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel} htmlFor="filter-timing">
                When
              </label>
              <select
                className={styles.filterSelect}
                id="filter-timing"
                name="timing"
                defaultValue={query.timing}
              >
                <option value="all">Any time</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
            <button className={styles.primaryButton} type="submit">
              Apply filters
            </button>
            {hasFilters ? (
              <Link className={styles.tableLink} href="/admin/bookings">
                Clear
              </Link>
            ) : null}
          </form>

          <div className={styles.statusBar}>
            <span>
              {total} {total === 1 ? "booking" : "bookings"}
            </span>
            <span>
              Page {query.page} of {totalPages}
            </span>
          </div>

          {list.rows.length === 0 ? (
            <div className={styles.empty}>
              {total === 0 ? (
                <>
                  <p>{hasFilters ? "No bookings match these filters." : "No bookings yet."}</p>
                  <p>
                    {hasFilters ? (
                      <>
                        <Link href="/admin/bookings">Clear the filters</Link> to see everything.
                      </>
                    ) : (
                      "When someone books a discovery call, it appears here."
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p>This page is past the end of the list.</p>
                  <p>
                    <Link href={pageHref(1, query)}>Go to the first page</Link>.
                  </p>
                </>
              )}
            </div>
          ) : (
            <BookingsTable rows={list.rows} />
          )}

          <div className={styles.pagination}>
            {query.page > 1 ? (
              <Button href={pageHref(query.page - 1, query)} variant="secondary">
                Previous
              </Button>
            ) : (
              <span aria-hidden="true" />
            )}
            {query.page < totalPages ? (
              <Button href={pageHref(query.page + 1, query)} variant="secondary">
                Next
              </Button>
            ) : (
              <span aria-hidden="true" />
            )}
          </div>
        </>
      ) : null}
    </main>
  );
}
