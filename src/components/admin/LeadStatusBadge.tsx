import { leadStatusLabels, type LeadStatus } from "@/lib/leads/constants";
import { cx } from "@/lib/cx";
import styles from "@/app/admin/admin.module.css";

const CLASSES: Record<LeadStatus, string> = {
  new: styles.badgeNew,
  contacted: styles.badgeContacted,
  booked: styles.badgeBooked,
  closed: styles.badgeClosed,
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <span className={cx(styles.badge, CLASSES[status])}>{leadStatusLabels[status]}</span>;
}
