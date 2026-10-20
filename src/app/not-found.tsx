import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Page } from "@/components/ui/Page";
import { Section } from "@/components/ui/Section";
import styles from "@/components/pages/pages.module.css";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <Page>
      <Section>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>404</p>
          <h1 className={styles.sectionTitle}>This page does not exist.</h1>
          <p className={styles.sectionIntro}>
            The link may be old, or the page may have moved. Start again from the home page.
          </p>
          <div className={styles.emptyActions}>
            <Button href="/">Back to the home page</Button>
          </div>
        </div>
      </Section>
    </Page>
  );
}
