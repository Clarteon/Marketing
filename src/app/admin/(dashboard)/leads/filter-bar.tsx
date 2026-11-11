"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dropdown } from "@/components/admin/Dropdown";
import styles from "@/app/admin/admin.module.css";

interface FilterBarProps {
  source: string;
}

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "website-form", label: "Website form" },
  { value: "clara-chat", label: "Clara" },
];

export function FilterBar({ source }: FilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function navigate(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("source");
    } else {
      params.set("source", value);
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
          onChange={(value) => navigate(value)}
        />
      </div>
      {source !== "all" && (
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
