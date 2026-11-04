import type { HowWeWorkData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { ProcessConduit } from "@/components/ui/ProcessConduit";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Section } from "@/components/ui/Section";
import styles from "./pages.module.css";

const callStepHeadings: Record<number, string> = {
  0: "Understand what is slowing you down",
  1: "Find the smallest useful step",
  2: "Agree on direction and fit",
  3: "Give an honest recommendation",
  4: "No homework required",
};

function getPointHeading(point: string, index: number): { heading: string; body: string } {
  if (point.includes(" — ")) {
    const [heading, ...rest] = point.split(" — ");
    return { heading: heading.trim(), body: rest.join(" — ").trim() };
  }
  if (point.includes(": ")) {
    const [heading, ...rest] = point.split(": ");
    return { heading: heading.trim(), body: rest.join(": ").trim() };
  }
  return {
    heading: callStepHeadings[index] ?? `Step ${index + 1}`,
    body: point,
  };
}

export function HowWeWorkPage({ data }: { data: HowWeWorkData }) {
  return (
    <Page>
      <PageHero
        title={data.hero.title}
        intro={data.hero.intro}
        actions={
          <Button href="/contact#book" size="large">
            Book a free discovery call
          </Button>
        }
      />

      <Section aria-labelledby="steps-title">
        <ScrollReveal className={styles.sectionHeader}>
          <p className={styles.eyebrow}>The process</p>
          <h2 id="steps-title" className={styles.sectionTitle}>
            From problem to working system.
          </h2>
          <p className={styles.sectionIntro}>
            Each step has a clear output, so you can decide whether to keep going before the next
            one starts.
          </p>
        </ScrollReveal>

        <ProcessConduit steps={data.steps} tone="paper" />
      </Section>

      <Section tone="stone" aria-labelledby="call-title">
        <div className={styles.calloutSingle}>
          <div className={styles.calloutHeaderSingle}>
            <p className={styles.eyebrow}>Discovery call</p>
            <h2 id="call-title" className={styles.calloutTitle}>
              {data.call.title}
            </h2>
            <p className={styles.calloutIntro}>{data.call.intro}</p>
          </div>

          <ScrollReveal as="ol" stagger className={styles.calloutSteps}>
            {data.call.points.map((point, index) => {
              const { heading, body } = getPointHeading(point, index);
              const stepNumber = String(index + 1).padStart(2, "0");
              return (
                <Card as="li" key={point} className={styles.calloutStep}>
                  <span className={styles.stepNumber} aria-hidden="true">
                    {stepNumber.split("").map((digit, digitIndex) => (
                      <span className={styles.stepDigitWindow} key={`${stepNumber}-${digitIndex}`}>
                        <span className={styles.stepDigit}>{digit}</span>
                      </span>
                    ))}
                  </span>
                  <div className={styles.stepContent}>
                    <h3 className={styles.stepHeading}>{heading}</h3>
                    <p className={styles.calloutStepBody}>{body}</p>
                  </div>
                </Card>
              );
            })}
          </ScrollReveal>
        </div>
      </Section>

      <ScrollReveal>
        <BookingSection />
      </ScrollReveal>
    </Page>
  );
}
