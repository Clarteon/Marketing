import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingEditForm } from "./booking-edit-form";
import { RescheduleCalendar } from "./reschedule-calendar";
import { isAdminPageAuthenticated } from "@/lib/admin/auth";
import { dateLabel } from "@/lib/admin/format";
import { formatSlotDateTime } from "@/lib/booking/format";
import { BookingStoreNotConfiguredError, getBookingStore } from "@/lib/booking/store";
import type { BookingRecord } from "@/lib/booking/types";
import { cx } from "@/lib/cx";
import { logServerEvent } from "@/lib/log";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking",
  robots: { index: false, follow: false },
};

interface BookingDetailPageProps {
  params: Promise<{ requestId: string }>;
}

function backLink() {
  return (
    <p className={styles.backLink}>
      <Link href="/admin/bookings">← Back to bookings</Link>
    </p>
  );
}

export default async function AdminBookingDetailPage({ params }: BookingDetailPageProps) {
  if (!(await isAdminPageAuthenticated())) redirect("/admin/login");

  const { requestId } = await params;
  const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);

  let booking: BookingRecord | undefined;
  let configured = true;
  let unavailable = false;

  if (validId) {
    try {
      booking = await getBookingStore().getByRequestId(requestId);
    } catch (error) {
      if (error instanceof BookingStoreNotConfiguredError) {
        configured = false;
      } else {
        unavailable = true;
        logServerEvent("admin_booking_detail_failed", {
          code: error instanceof Error ? error.name : "unknown",
        });
      }
    }
  }

  return (
    <main className={styles.page} id="main">
      {backLink()}
      <div className={styles.reviewHeader}>
        <div>
          <p className={styles.eyebrow}>Clarteon admin</p>
          <h1 className={styles.title}>Booking</h1>
          <p className={styles.intro}>
            Guest details, notes and the discovery-call time. Rescheduling moves the Google Calendar
            event and emails the guest an updated invite.
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
            This booking is temporarily unavailable. Try again in a moment.
          </p>
        </div>
      ) : !validId || !booking ? (
        <div className={styles.panel}>
          <p className={styles.notice} role="status">
            This booking does not exist. It may have been removed before its calendar event was
            created.
          </p>
          <p className={styles.backLink}>
            <Link href="/admin/bookings">Back to bookings</Link>
          </p>
        </div>
      ) : (
        <>
          <div className={styles.statusBar}>
            <span>
              <span
                className={cx(
                  styles.badge,
                  booking.status === "confirmed" ? styles.badgeConfirmed : styles.badgePending,
                )}
              >
                {booking.status === "confirmed" ? "Confirmed" : "Pending"}
              </span>
            </span>
            <span>{formatSlotDateTime(booking.slotStart.toISOString(), booking.timezone)}</span>
            <span>Guest timezone {booking.timezone}</span>
            <span>Booked {dateLabel(booking.createdAt)}</span>
          </div>

          <div className={styles.detailStack}>
            <section className={styles.panel} aria-labelledby="guest-details-title">
              <h2 className={styles.sectionTitle} id="guest-details-title">
                Guest details
              </h2>
              <p className={styles.sectionIntro}>
                Name, email and notes as the visitor sent them. Changes save to the booking record
                only.
              </p>
              <BookingEditForm
                booking={{
                  requestId: booking.requestId,
                  name: booking.name,
                  email: booking.email,
                  timezone: booking.timezone,
                  notes: booking.notes ?? null,
                }}
              />
            </section>

            <section className={styles.panel} aria-labelledby="reschedule-title">
              <h2 className={styles.sectionTitle} id="reschedule-title">
                Reschedule
              </h2>
              <p className={styles.sectionIntro}>
                Pick a new date and time. Times are shown in the guest&rsquo;s timezone.
              </p>
              <RescheduleCalendar
                requestId={booking.requestId}
                timezone={booking.timezone}
                currentSlotStart={booking.slotStart.toISOString()}
              />
            </section>

            <section className={styles.panel} aria-labelledby="meeting-title">
              <h2 className={styles.sectionTitle} id="meeting-title">
                Meeting
              </h2>
              <div className={styles.meetingRow}>
                {booking.meetLink ? (
                  <a
                    className={styles.meetButton}
                    href={booking.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Join Meet"
                    title="Join Meet"
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
                      <path d="m22 8-6 4 6 4V8Z" />
                      <rect x="2" y="6" width="14" height="12" rx="2" />
                    </svg>
                  </a>
                ) : (
                  <span className={styles.tableMuted}>No meeting link yet</span>
                )}
                {booking.calendarLink ? (
                  <a
                    className={styles.tableLink}
                    href={booking.calendarLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open calendar event
                  </a>
                ) : null}
              </div>
              <p className={styles.meta}>
                Request id <code>{booking.requestId}</code>
              </p>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
