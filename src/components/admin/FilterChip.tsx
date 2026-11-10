"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./filter-chip.module.css";

interface FilterChipProps {
  key: string;
  label: string;
  value: string;
  removeAriaLabel: string;
}

export function FilterChip({ key, label, value, removeAriaLabel }: FilterChipProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function remove() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <span className={styles.chip} aria-label={`${label}: ${value}`}>
      <span className={styles.chipLabel}>{label}</span>
      <span className={styles.chipValue}>{value}</span>
      <button
        className={styles.chipRemove}
        type="button"
        aria-label={removeAriaLabel}
        onClick={remove}
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
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </span>
  );
}
