"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dropdown } from "@/components/admin/Dropdown";
import styles from "@/app/admin/admin.module.css";

interface FilterBarProps {
  status: string;
  timing: string;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
];

const TIMING_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Any time" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

export function FilterBar({ status, timing }: FilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function navigate(key: "status" | "timing", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className={styles.filterBar}>
      <div className={styles.filterGroup}>
        <Dropdown
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => navigate("status", value)}
        />
        <Dropdown
          label="When"
          value={timing}
          options={TIMING_OPTIONS}
          onChange={(value) => navigate("timing", value)}
        />
      </div>
      {(status !== "all" || timing !== "all") && (
        <button
          className={styles.clearFilters}
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
