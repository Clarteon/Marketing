import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ChatWidgetSlot } from "@/components/ui/ChatWidgetSlot";
import { CookieConsent } from "@/components/ui/CookieConsent";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { Footer } from "@/components/ui/Footer";
import { Header } from "@/components/ui/Header";
import { Page } from "@/components/ui/Page";
import { Section } from "@/components/ui/Section";
import styles from "@/components/pages/pages.module.css";

export const metadata: Metadata = {
  title: "Page not found",
};

const recoveryRoutes = [
  { label: "Solutions", href: "/solutions" },
  { label: "How we work", href: "/how-we-work" },
  { label: "Our work", href: "/our-work" },
  { label: "Insights", href: "/insights" },
  { label: "Contact", href: "/contact" },
] as const;

export default function NotFound() {
  return (
    <>
      <Header />
      <Page>
        <Section className={styles.notFoundSection}>
          <div className={styles.notFoundStage}>
            <div className={styles.notFoundReticle} aria-hidden="true">
              <span className={styles.notFoundRing} />
              <span className={styles.notFoundAxisH} />
              <span className={styles.notFoundAxisV} />
            </div>

            <div className={styles.notFoundStatusPill} aria-label="HTTP status 404">
              <span className={styles.notFoundStatusCode}>HTTP 404</span>
              <span className={styles.notFoundStatusDivider} aria-hidden="true" />
              <span className={styles.notFoundStatusText}>Page not found</span>
            </div>

            <h1 className={styles.notFoundTitle}>This page does not exist.</h1>

            <p className={styles.notFoundIntro}>
              The server returned an HTTP 404 status because no page exists at this web address. The
              link may be outdated, misspelled, or moved to a new route.
            </p>

            <div className={styles.notFoundActions}>
              <Button href="/" variant="primary">
                Back to the home page
              </Button>
              <Button href="/contact#book" variant="secondary">
                Book a discovery call
              </Button>
            </div>

            <nav className={styles.notFoundQuickNav} aria-label="Popular destinations">
              {recoveryRoutes.map((route) => (
                <Link key={route.href} href={route.href} className={styles.notFoundQuickLink}>
                  {route.label}
                </Link>
              ))}
            </nav>
          </div>
        </Section>
      </Page>
      <Footer />
      <CookieConsent />
      <ChatWidgetSlot turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
      <CustomCursor />
    </>
  );
}
