import Link from "next/link";
import { navItems, site } from "@/lib/site";
import { Logo } from "./Logo";
import styles from "./ui.module.css";

export function Footer() {
  return (
    <footer className={styles.footer} data-tone="paper">
      <div className={styles.footerHorizon} aria-hidden="true">
        <div className={styles.footerHorizonLine} />
        <div className={styles.footerHorizonGlow} />
      </div>

      <div className={styles.footerInner}>
        <div className={styles.footerTopBar}>
          <Link href="/" aria-label="Clarteon home" className={styles.footerHome}>
            <Logo variant="symbol" className={styles.footerLogo} />
          </Link>
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

        <div className={styles.footerMetaStack}>
          <div className={styles.footerLegalLinks}>
            <a href="/terms" className={styles.footerUtilLink}>
              Terms of Service
            </a>
            <Link href="/privacy" className={styles.footerUtilLink}>
              Privacy
            </Link>
          </div>
          <p className={styles.footerTagline}>{site.tagline}</p>
        </div>
      </div>

      <div className={styles.footerWordmarkWrap} aria-hidden="true">
        <span className={styles.footerGiantWordmark}>CLARTEON</span>
      </div>
    </footer>
  );
}
