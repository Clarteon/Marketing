import Link from "next/link";
import { navItems, site } from "@/lib/site";
import { Logo } from "./Logo";
import styles from "./ui.module.css";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Link href="/" aria-label="Clarteon home">
              <Logo className={styles.footerLogo} />
            </Link>
            <p className={styles.footerTagline}>{site.tagline}</p>
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
              <li>
                <Link href="/privacy" className={styles.footerLink}>
                  Privacy
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className={styles.footerBottom}>
          <p>© {year} Clarteon. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
