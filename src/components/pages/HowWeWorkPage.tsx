import Image from "next/image";
import type { HowWeWorkData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
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
    heading: callStepHeadings[index] ?? `Point ${index + 1}`,
    body: point,
  };
}

export function HowWeWorkPage({ data }: { data: HowWeWorkData }) {
  return (
    <Page>
      <PageHero
        tone="paper"
        title={data.hero.title}
        intro={data.hero.intro}
        actions={
          <Button href="/contact#book" size="large">
            Book a free discovery call
          </Button>
        }
      />

      <Section aria-labelledby="steps-title">
        <ScrollReveal className={styles.processIntroSplit}>
          <div className={styles.processIntroCopy}>
            <h2 id="steps-title" className={styles.sectionTitle}>
              From problem to working system.
            </h2>
            <p className={styles.sectionIntro}>
              Each step has a clear output, so you can decide whether to keep going before the next
              one starts.
            </p>
          </div>
          <div className={styles.processIntroMedia}>
            <Image
              src="/images/editorial/process-flowchart.jpg"
              alt="Mapping a workflow process and data flow across decisions on a studio whiteboard"
              width={960}
              height={640}
              sizes="(max-width: 960px) 100vw, 44vw"
              className={styles.editorialPhoto}
            />
          </div>
        </ScrollReveal>

        <ProcessConduit steps={data.steps} tone="paper" />
      </Section>

      <Section tone="stone" aria-labelledby="call-title">
        <div className={styles.discoverySplitGrid}>
          <div className={styles.discoverySticky}>
            <h2 id="call-title" className={styles.calloutTitle}>
              {data.call.title}
            </h2>
            <p className={styles.calloutIntro}>{data.call.intro}</p>
            <div className={styles.discoveryMedia}>
              <Image
                src="/images/editorial/discovery-call.jpg"
                alt="Direct conversation across a table with open notebooks and a laptop during a discovery call"
                width={960}
                height={640}
                sizes="(max-width: 960px) 100vw, 40vw"
                className={styles.editorialPhoto}
              />
            </div>
            <div className={styles.discoveryAction}>
              <Button href="/contact#book" size="large">
                Book a free discovery call
              </Button>
            </div>
          </div>

          <ScrollReveal as="ol" stagger className={styles.discoveryAgendaList}>
            {data.call.points.map((point, index) => {
              const { heading, body } = getPointHeading(point, index);
              return (
                <li key={point} className={styles.discoveryAgendaItem}>
                  <span className={styles.discoveryAgendaDot} aria-hidden="true" />
                  <div className={styles.discoveryAgendaContent}>
                    <h3 className={styles.stepHeading}>{heading}</h3>
                    <p className={styles.calloutStepBody}>{body}</p>
                  </div>
                </li>
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
