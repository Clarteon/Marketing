"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoSymbol } from "@/components/ui/Logo";
import { cx } from "@/lib/cx";
import { LogoutButton } from "./LogoutButton";
import styles from "@/app/admin/admin.module.css";

const tabs = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/site", label: "Site config" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/review", label: "Review queue" },
];

export function AdminTopBar() {
  const pathname = usePathname();

  return (
    <header className={styles.topBar}>
      <div className={styles.topBarInner}>
        <Link href="/admin" className={styles.topBarBrand} aria-label="Clarteon admin">
          <LogoSymbol className={styles.topBarMark} />
          <span className={styles.topBarWordmark}>
            Clarteon <span className={styles.topBarBadge}>admin</span>
          </span>
        </Link>
        <nav className={styles.topBarNav} aria-label="Admin">
          {tabs.map((tab) => {
            const active =
              tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cx(styles.topNavLink, active && styles.topNavLinkActive)}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <LogoutButton />
      </div>
    </header>
  );
}
