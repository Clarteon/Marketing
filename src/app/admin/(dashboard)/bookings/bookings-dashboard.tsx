"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BookingsTable } from "@/components/admin/BookingsTable";
import { Dropdown } from "@/components/admin/Dropdown";
import { FilterChip } from "@/components/admin/FilterChip";
import type { AdminBookingRow } from "@/lib/admin/queries";
import type { BookingsListQuery } from "@/lib/admin/schema";
import { getBookings } from "@/lib/admin/actions";
import styles from "@/app/admin/admin.module.css";

const STATUS_OPTIONS: { value: BookingsListQuery["status"]; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
];

const TIMING_OPTIONS: { value: BookingsListQuery["timing"]; label: string }[] = [
  { value: "all", label: "Any time" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

interface BookingsDashboardProps {
  initialQuery: BookingsListQuery;
}

export function BookingsDashboard({ initialQuery }: BookingsDashboardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [rows, setRows] = useState<AdminBookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const status = (searchParams.get("status") ?? initialQuery.status) as
    BookingsListQuery["status"] | undefined;
  const timing = (searchParams.get("timing") ?? initialQuery.timing) as
    BookingsListQuery["timing"] | undefined;

  const [configured, setConfigured] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const queryStatus = status ?? "all";
  const queryTiming = timing ?? "all";

  const query: BookingsListQuery = {
    status: queryStatus,
    timing: queryTiming,
    page,
  };

  const totalPages = Math.max(1, Math.ceil(total / 50));
  const hasFilters = query.status !== "all" || query.timing !== "all";

  useEffect(() => {
    let mounted = true;

    async function fetchBookings() {
      const nextQuery: BookingsListQuery = {
        status: queryStatus,
        timing: queryTiming,
        page,
      };
      setLoading(true);
      setUnavailable(false);
      try {
        const result = await getBookings(nextQuery);
        if (!mounted) return;
        if (result.ok) {
          setRows(result.data.rows);
          setTotal(result.data.total);
          setConfigured(true);
        } else if (result.error === "not_configured") {
          setConfigured(false);
        } else {
          setUnavailable(true);
          setRows([]);
          setTotal(0);
        }
      } catch {
        if (!mounted) return;
        setUnavailable(true);
        setRows([]);
        setTotal(0);
      } finally {
        if (!mounted) setLoading(false);
      }
    }

    fetchBookings();
    return () => {
      mounted = false;
    };
  }, [queryStatus, queryTiming, page]);

  function setFilter(key: "status" | "timing", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function clearFilters() {
    router.replace(pathname, { scroll: false });
  }

  function pageHref(pageNumber: number): string {
    const params = new URLSearchParams(searchParams.toString());
    if (pageNumber > 1) {
      params.set("page", String(pageNumber));
    } else {
      params.delete("page");
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  if (!configured) {
    return (
      <main className={styles.page} id="main">
        <div className={styles.reviewHeader}>
          <div>
            <p className={styles.eyebrow}>Clarteon admin</p>
            <h1 className={styles.title}>Bookings</h1>
          </div>
        </div>
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            Booking storage is not configured. Add <code>DATABASE_URL</code> in the server
            environment and run <code>npm run db:init</code>.
          </p>
        </div>
      </main>
    );
  }

  if (unavailable) {
    return (
      <main className={styles.page} id="main">
        <div className={styles.reviewHeader}>
          <div>
            <p className={styles.eyebrow}>Clarteon admin</p>
            <h1 className={styles.title}>Bookings</h1>
          </div>
        </div>
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            The booking list is temporarily unavailable. Try again in a moment.
          </p>
        </div>
      </main>
    );
  }

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

      <div className={styles.filterBar}>
        {hasFilters ? (
          <>
            <FilterChip
              key="status-chip"
              label="Status"
              value={query.status}
              removeAriaLabel="Remove status filter"
            />
            <FilterChip
              key="timing-chip"
              label="When"
              value={query.timing}
              removeAriaLabel="Remove timing filter"
            />
            <button
              className={styles.tableLink}
              onClick={clearFilters}
              style={{
                padding: 0,
                background: "none",
                border: "none",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              Clear all
            </button>
          </>
        ) : null}
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="filter-status">
            Status
          </label>
          <Dropdown
            label="Status"
            value={query.status}
            options={STATUS_OPTIONS}
            onChange={(value) => setFilter("status", value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="filter-timing">
            When
          </label>
          <Dropdown
            label="When"
            value={query.timing}
            options={TIMING_OPTIONS}
            onChange={(value) => setFilter("timing", value)}
          />
        </div>
      </div>

      <div className={styles.statusBar}>
        <span>
          {total} {total === 1 ? "booking" : "bookings"}
        </span>
        <span>
          Page {page} of {totalPages}
        </span>
      </div>

      {loading ? (
        <div className={styles.empty}>
          <p>Loading bookings…</p>
        </div>
      ) : rows.length === 0 ? (
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
                <Link href={pageHref(1)}>Go to the first page</Link>.
              </p>
            </>
          )}
        </div>
      ) : (
        <BookingsTable rows={rows} />
      )}

      <div className={styles.pagination}>
        {page > 1 ? (
          <Button href={pageHref(page - 1)} variant="secondary">
            Previous
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
        {page < totalPages ? (
          <Button href={pageHref(page + 1)} variant="secondary">
            Next
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
    </main>
  );
}
