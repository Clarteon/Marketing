import type { ContactData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { ProjectBriefForm } from "@/components/ui/ProjectBriefForm";
import { Section } from "@/components/ui/Section";
import styles from "./pages.module.css";

export function ContactPage({ data }: { data: ContactData }) {
  return (
    <Page>
      <PageHero
        eyebrow={data.hero.eyebrow}
        title={data.hero.title}
        intro={data.hero.intro}
        actions={
          <>
            <Button href="#brief" size="large">
              Send a project brief
            </Button>
            <Button href="#book" variant="secondary" size="large">
              Book a discovery call
            </Button>
          </>
        }
      />

      <BookingSection
        id="book"
        mode="placeholder"
        title={data.booking.title}
        body={data.booking.body}
      />

      <Section tone="stone" id="brief" aria-labelledby="brief-title">
        <div className={styles.contactGrid}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Project brief</p>
            <h2 id="brief-title" className={styles.sectionTitle}>
              {data.brief.title}
            </h2>
            <p className={styles.sectionIntro}>{data.brief.intro}</p>
          </div>

          <Card className={styles.formCard}>
            <ProjectBriefForm />
          </Card>
        </div>
      </Section>

      <Section id="message" aria-labelledby="message-title">
        <div className={styles.messagePanel}>
          <p className={styles.eyebrow}>Direct message</p>
          <h2 id="message-title" className={styles.sectionTitle}>
            {data.message.title}
          </h2>
          <p className={styles.sectionIntro}>{data.message.body}</p>
        </div>
      </Section>
    </Page>
  );
}
