"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { navItems, site } from "@/lib/site";
import { Button } from "./Button";
import { Logo } from "./Logo";
import styles from "./ui.module.css";

export function Header() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const firstLink = menuRef.current?.querySelector<HTMLAnchorElement>("a");
    firstLink?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.headerLogo} aria-label="Clarteon home">
          <Logo />
        </Link>

        <nav className={styles.desktopNav} aria-label="Main">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <Button href={site.cta.href} className={styles.headerCta}>
            {site.cta.label}
          </Button>
          <button
            ref={menuButtonRef}
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      <nav
        ref={menuRef}
        id="mobile-menu"
        className={styles.mobileNav}
        aria-label="Mobile"
        hidden={!open}
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={styles.mobileNavLink}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <div className={styles.mobileNavActions}>
          <Button href={site.cta.href} onClick={() => setOpen(false)}>
            {site.cta.label}
          </Button>
        </div>
      </nav>
    </header>
  );
}
