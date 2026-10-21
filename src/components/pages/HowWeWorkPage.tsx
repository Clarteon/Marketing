import type { HowWeWorkData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import styles from "./pages.module.css";

export function HowWeWorkPage({ data }: { data: HowWeWorkData }) {
  return (
    <Page>
      <PageHero
        eyebrow={data.hero.eyebrow}
        title={data.hero.title}
        intro={data.hero.intro}
        actions={
          <Button href="/contact#book" size="large">
            Book a free discovery call
          </Button>
        }
      />

      <Section aria-labelledby="steps-title">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>The process</p>
          <h2 id="steps-title" className={styles.sectionTitle}>
            From problem to working system.
          </h2>
          <p className={styles.sectionIntro}>
            Each step has a clear output, so you can decide whether to keep going before the next
            one starts.
          </p>
        </div>

        <ol className={styles.steps}>
          {data.steps.map((step, index) => (
            <li className={styles.step} key={step.title}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="stone" aria-labelledby="call-title">
        <div className={styles.callout}>
          <div className={styles.calloutHeader}>
            <p className={styles.eyebrow}>Discovery call</p>
            <h2 id="call-title" className={styles.calloutTitle}>
              {data.call.title}
            </h2>
            <p className={styles.calloutIntro}>{data.call.intro}</p>
          </div>

          <ul className={styles.calloutList}>
            {data.call.points.map((point) => (
              <li className={styles.calloutItem} key={point}>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <BookingSection />
    </Page>
  );
}
