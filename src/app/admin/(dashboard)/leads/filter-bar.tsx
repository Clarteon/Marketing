"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dropdown } from "@/components/admin/Dropdown";
import styles from "@/app/admin/admin.module.css";

interface FilterBarProps {
  source: string;
  status: string;
}

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "website-form", label: "Website form" },
  { value: "clara-chat", label: "Clara" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "booked", label: "Booked" },
  { value: "closed", label: "Closed" },
];

export function FilterBar({ source, status }: FilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function navigate(key: "source" | "status", value: string) {
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
          label="Source"
          value={source}
          options={SOURCE_OPTIONS}
          onChange={(value) => navigate("source", value)}
        />
        <Dropdown
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => navigate("status", value)}
        />
      </div>
      {(source !== "all" || status !== "all") && (
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
