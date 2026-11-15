import type { LeadSource } from "@/lib/leads/store";
import { cx } from "@/lib/cx";
import styles from "@/app/admin/admin.module.css";

const LABELS: Record<LeadSource, string> = {
  "website-form": "Form",
  "clara-chat": "Clara",
};

const CLASSES: Record<LeadSource, string> = {
  "website-form": styles.sourceForm,
  "clara-chat": styles.sourceClara,
};

export function LeadSourceBadge({ source }: { source: LeadSource }) {
  return <span className={cx(styles.badge, CLASSES[source])}>{LABELS[source]}</span>;
}
