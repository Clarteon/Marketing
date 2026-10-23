"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { navItems, site } from "@/lib/site";
import { Button } from "./Button";
import { Logo } from "./Logo";
import styles from "./ui.module.css";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [gliding, setGliding] = useState(false);
  const [gliderStyle, setGliderStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const pathname = usePathname();
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Scroll detection for morphing pill dock
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keyboard accessibility and focus trap for mobile drawer
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

  // Magnetic glider hover & focus tracking
  const handleItemHover = (target: HTMLAnchorElement) => {
    const navEl = navRef.current;
    if (!navEl) return;
    const navRect = navEl.getBoundingClientRect();
    const linkRect = target.getBoundingClientRect();

    setGliderStyle((prev) => {
      const isFirstAppear = prev.opacity === 0;
      if (isFirstAppear) {
        setGliding(false);
        requestAnimationFrame(() => {
          setGliding(true);
        });
      } else {
        setGliding(true);
      }

      return {
        left: linkRect.left - navRect.left,
        width: linkRect.width,
        opacity: 1,
      };
    });
  };

  const handleNavLeave = () => {
    setGliderStyle((prev) => ({ ...prev, opacity: 0 }));
    setGliding(false);
  };

  const handleNavBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      handleNavLeave();
    }
  };

  return (
    <header className={cx(styles.header, scrolled && styles.headerScrolled)}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.headerLogo} aria-label="Clarteon home">
          <Logo />
        </Link>

        <nav
          ref={navRef}
          className={styles.desktopNav}
          aria-label="Main"
          onMouseLeave={handleNavLeave}
          onBlur={handleNavBlur}
        >
          <div
            className={cx(styles.navGlider, gliding && styles.navGliderActive)}
            style={{
              transform: `translateX(${gliderStyle.left}px)`,
              width: `${gliderStyle.width}px`,
              opacity: gliderStyle.opacity,
            }}
            aria-hidden="true"
          />

          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (pathname ? pathname.startsWith(`${item.href}/`) : false);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(styles.navLink, isActive && styles.navLinkActive)}
                onMouseEnter={(e) => handleItemHover(e.currentTarget)}
                onFocus={(e) => handleItemHover(e.currentTarget)}
              >
                <span>{item.label}</span>
                {isActive && <span className={styles.activeDot} aria-hidden="true" />}
              </Link>
            );
          })}
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
            <span className={styles.menuButtonIcon} aria-hidden="true">
              {open ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </span>
            <span>{open ? "Close" : "Menu"}</span>
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
        <div className={styles.mobileNavLinks}>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (pathname ? pathname.startsWith(`${item.href}/`) : false);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(styles.mobileNavLink, isActive && styles.mobileNavLinkActive)}
                onClick={() => setOpen(false)}
              >
                <span>{item.label}</span>
                {isActive && <span className={styles.mobileActiveDot} aria-hidden="true" />}
              </Link>
            );
          })}
        </div>
        <div className={styles.mobileNavActions}>
          <Button href={site.cta.href} onClick={() => setOpen(false)}>
            {site.cta.label}
          </Button>
        </div>
      </nav>
    </header>
  );
}
