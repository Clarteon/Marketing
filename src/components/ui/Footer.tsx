import Link from "next/link";
import { navItems, site } from "@/lib/site";
import { Logo } from "./Logo";
import styles from "./ui.module.css";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer} data-tone="paper">
      {/* Top Transition Horizon: marks the architectural boundary into the footer */}
      <div className={styles.footerHorizon} aria-hidden="true">
        <div className={styles.footerHorizonLine} />
        <div className={styles.footerHorizonGlow} />
      </div>

      <div className={styles.footerInner}>
        {/* Centered Brand Crest (Enlarged) & Tagline & Email Lockup */}
        <div className={styles.footerBrandCentered}>
          <Link href="/" aria-label="Clarteon home" className={styles.footerHome}>
            <Logo variant="stacked" className={styles.footerLogo} />
          </Link>
          <p className={styles.footerTagline}>{site.tagline}</p>
          <div className={styles.footerEmailWrap}>
            <a href={`mailto:${site.email}`} className={styles.footerEmailPill}>
              <span>{site.email}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className={styles.footerEmailArrow}
              >
                <path
                  d="M5 19 19 5M5 5h14v14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </div>

        {/* Navigation Band with Pure Animated Conduit Lines (No center icon) */}
        <div className={styles.footerNavBand}>
          <div className={styles.conduitRail} aria-hidden="true">
            <span className={styles.conduitPulseTop} />
          </div>

          <nav aria-label="Footer" className={styles.footerNav}>
            <ul className={styles.footerLinksRibbon}>
              {navItems.map((item) => (
                <li key={item.href} className={styles.footerLinkItem}>
                  <Link href={item.href} className={styles.footerLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.conduitRail} aria-hidden="true">
            <span className={styles.conduitPulseBot} />
          </div>
        </div>

        {/* Grounded Bottom Legal Baseline */}
        <div className={styles.footerBottom}>
          <p className={styles.footerLegal}>© {year} Clarteon. All rights reserved.</p>
          <div className={styles.footerUtilities}>
            <Link href="/privacy" className={styles.footerLink}>
              Privacy
            </Link>
            <a href="#" className={styles.footerLink}>
              Back to top{" "}
              <span aria-hidden="true" className={styles.backToTopArrow}>
                ↑
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
