"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties, useEffect, useRef, useState } from "react";
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
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    opacity: 0,
  });

  const pathname = usePathname();
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const scrolledRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 20;
      if (scrolledRef.current !== next) {
        scrolledRef.current = next;
        setScrolled(next);
        setGliderStyle((prev) => (prev.opacity === 0 ? prev : { ...prev, opacity: 0 }));
        setGliding(false);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const firstLink = menuRef.current?.querySelector<HTMLAnchorElement>("a");
    firstLink?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    const onResize = () => {
      if (window.innerWidth > 980) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const handleItemHover = (target: HTMLAnchorElement, isActive: boolean) => {
    const left = target.offsetLeft;
    const top = target.offsetTop;
    const width = target.offsetWidth;
    const height = target.offsetHeight;

    setGliderStyle((prev) => {
      if (isActive) {
        setGliding(false);
        return {
          left,
          top,
          width,
          height,
          opacity: 0,
        };
      }

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
        left,
        top,
        width,
        height,
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

  const isLightHero = Boolean(pathname && pathname !== "/");

  return (
    <header
      className={cx(
        styles.header,
        scrolled && styles.headerScrolled,
        isLightHero && styles.headerLight,
        open && styles.headerMenuOpen,
      )}
    >
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
              transform: `translate3d(${gliderStyle.left}px, ${gliderStyle.top}px, 0)`,
              width: `${gliderStyle.width}px`,
              height: `${gliderStyle.height}px`,
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
                aria-current={isActive ? "page" : undefined}
                onMouseEnter={(e) => handleItemHover(e.currentTarget, isActive)}
                onFocus={(e) => handleItemHover(e.currentTarget, isActive)}
                onClick={handleNavLeave}
              >
                <span>{item.label}</span>
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
        data-open={open}
        aria-hidden={!open}
        inert={!open}
        hidden={!open}
      >
        <div className={styles.mobileNavBackdrop} aria-hidden="true" />
        <div className={styles.mobileNavContent}>
          <p className={styles.mobileNavTagline}>{site.tagline}</p>

          <div className={styles.mobileNavLinks}>
            {navItems.map((item, index) => {
              const isActive =
                pathname === item.href || (pathname ? pathname.startsWith(`${item.href}/`) : false);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(styles.mobileNavLink, isActive && styles.mobileNavLinkActive)}
                  aria-current={isActive ? "page" : undefined}
                  style={{ "--nav-i": index } as CSSProperties}
                  onClick={() => setOpen(false)}
                >
                  <span className={styles.mobileNavLabel}>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className={styles.mobileNavFooter}>
            <a
              href={`mailto:${site.email}`}
              className={styles.mobileNavEmail}
              onClick={() => setOpen(false)}
            >
              {site.email}
            </a>
            <div className={styles.mobileNavActions}>
              <Button href={site.cta.href} size="large" onClick={() => setOpen(false)}>
                {site.cta.label}
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
