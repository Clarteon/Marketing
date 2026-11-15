import Image from "next/image";
import type { ContactData } from "@/lib/page-schemas";
import { cx } from "@/lib/cx";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { DeferredForm } from "@/components/ui/DeferredForm";
import { ReticleFrame } from "@/components/ui/ReticleFrame";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Section } from "@/components/ui/Section";
import styles from "./pages.module.css";

export function ContactPage({
  data,
  turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
}: {
  data: ContactData;
  turnstileSiteKey?: string;
}) {
  return (
    <Page>
      <PageHero
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
        mode="form"
        title={data.booking.title}
        body={data.booking.body}
        turnstileSiteKey={turnstileSiteKey}
      />

      <Section tone="stone" id="brief" aria-labelledby="brief-title">
        <div className={styles.contactGrid}>
          <ScrollReveal
            variant="slide"
            stagger
            className={cx(styles.sectionHeader, styles.contactBriefHeader)}
          >
            <h2 id="brief-title" className={styles.sectionTitle}>
              {data.brief.title}
            </h2>
            <p className={styles.sectionIntro}>{data.brief.intro}</p>
            <div className={styles.contactBriefMedia}>
              <Image
                src="/images/editorial/contact-message.jpg"
                alt="Hand sketching project notes and workflow diagrams on a wooden desk"
                width={960}
                height={640}
                sizes="(max-width: 980px) 100vw, 38vw"
                className={styles.editorialPhoto}
              />
            </div>
          </ScrollReveal>

          <ScrollReveal variant="settle">
            <DeferredForm kind="brief" turnstileSiteKey={turnstileSiteKey} />
          </ScrollReveal>
        </div>
      </Section>

      <Section tone="lime" id="message" aria-labelledby="message-title">
        <ReticleFrame showCorners={false} className={styles.messageFrame}>
          <ScrollReveal variant="wipe" className={styles.messagePanel}>
            <h2 id="message-title" className={styles.sectionTitle}>
              {data.message.title}
            </h2>
            <p className={styles.sectionIntro}>{data.message.body}</p>
            <div className={styles.messageAction}>
              <Button href={`mailto:${data.message.email}`} variant="dark" size="large">
                Email {data.message.email}
              </Button>
            </div>
          </ScrollReveal>
        </ReticleFrame>
      </Section>
    </Page>
  );
}
