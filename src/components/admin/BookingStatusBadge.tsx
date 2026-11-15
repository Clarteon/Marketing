import type { BookingStatus } from "@/lib/booking/types";
import { cx } from "@/lib/cx";
import styles from "@/app/admin/admin.module.css";

const LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

const CLASSES: Record<BookingStatus, string> = {
  pending: styles.badgePending,
  confirmed: styles.badgeConfirmed,
  cancelled: styles.badgeCancelled,
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <span className={cx(styles.badge, CLASSES[status])}>{LABELS[status]}</span>;
}
