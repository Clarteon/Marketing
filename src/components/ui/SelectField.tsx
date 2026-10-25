"use client";

import type { ReactNode } from "react";
import { Select } from "@base-ui/react/select";
import styles from "./select-field.module.css";

export interface SelectFieldOption {
  value: string | null;
  label: ReactNode;
}

interface SelectFieldProps {
  id: string;
  label: ReactNode;
  options: SelectFieldOption[];
  name?: string;
  value?: string | null;
  defaultValue?: string | null;
  placeholder?: string;
  disabled?: boolean;
  density?: "default" | "compact";
  onValueChange?: (value: string | null) => void;
}

export function SelectField({
  id,
  label,
  options,
  name,
  value,
  defaultValue,
  placeholder,
  disabled,
  density = "default",
  onValueChange,
}: SelectFieldProps) {
  return (
    <div className={styles.field}>
      <Select.Root<string | null>
        name={name}
        items={options}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <Select.Label className={styles.label}>{label}</Select.Label>
        <Select.Trigger
          id={id}
          className={`${styles.trigger} ${density === "compact" ? styles.triggerCompact : ""}`}
        >
          <Select.Value className={styles.value} placeholder={placeholder} />
          <Select.Icon className={styles.icon} aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none">
              <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
            </svg>
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            className={styles.positioner}
            sideOffset={4}
            alignItemWithTrigger={false}
          >
            <Select.Popup className={styles.popup}>
              <Select.List className={styles.list}>
                {options.map((option, index) => (
                  <Select.Item
                    key={`${option.value ?? "empty"}-${index}`}
                    value={option.value}
                    className={styles.item}
                  >
                    <Select.ItemText className={styles.itemText}>{option.label}</Select.ItemText>
                    <Select.ItemIndicator className={styles.indicator}>
                      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="m3 8 3.2 3.2L13 4.5" />
                      </svg>
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
