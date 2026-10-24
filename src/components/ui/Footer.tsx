import Link from "next/link";
import { navItems, site } from "@/lib/site";
import { Logo } from "./Logo";
import styles from "./ui.module.css";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer} data-tone="paper">
      <div className={styles.footerInner}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Link href="/" aria-label="Clarteon home" className={styles.footerHome}>
              <Logo className={styles.footerLogo} />
            </Link>
            <p className={styles.footerTagline}>{site.tagline}</p>
            <a href={`mailto:${site.email}`} className={styles.footerEmail}>
              {site.email}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </a>
          </div>

          <nav aria-label="Footer">
            <ul className={styles.footerLinks}>
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={styles.footerLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={styles.footerSignature} aria-hidden="true">
          <div className={styles.footerSignatureStack}>
            {[0, 1, 2].map((row) => (
              <span
                key={row}
                className={
                  row === 1 ? styles.footerSignatureHighlight : styles.footerSignatureOutline
                }
              >
                Clarteon
              </span>
            ))}
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.footerLegal}>© {year} Clarteon. All rights reserved.</p>
          <div className={styles.footerUtilities}>
            <Link href="/privacy" className={styles.footerLink}>
              Privacy
            </Link>
            <a href="#" className={styles.footerLink}>
              Back to top <span aria-hidden="true">↑</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
