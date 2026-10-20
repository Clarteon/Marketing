import Link from "next/link";
import type { HomeData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import styles from "./pages.module.css";

export function HomePage({ data }: { data: HomeData }) {
  return (
    <Page>
      <PageHero
        variant="home"
        eyebrow={data.hero.eyebrow}
        title={data.hero.title}
        intro={data.hero.intro}
        actions={data.hero.actions.map((action) => (
          <Button
            key={`${action.label}-${action.href}`}
            href={action.href}
            variant={action.variant}
            size={action.variant === "text" ? "default" : "large"}
          >
            {action.label}
          </Button>
        ))}
      />

      <Section tone="stone" aria-labelledby="problems-title">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Problems</p>
          <h2 id="problems-title" className={styles.sectionTitle}>
            Tell us what is slowing you down.
          </h2>
          <p className={styles.sectionIntro}>
            Start with the work that repeats or the handoff that breaks. The right solution usually
            becomes clearer from there.
          </p>
        </div>

        <div className={styles.problemGrid}>
          {data.problems.map((problem) => (
            <Card as="article" key={problem.title} className={styles.problemCard}>
              <h3 className={styles.problemTitle}>{problem.title}</h3>
              <p className={styles.problemBody}>{problem.body}</p>
              <p className={styles.solution}>
                <span>Often solved with</span>
                {problem.href ? (
                  <Link href={problem.href}>{problem.solution}</Link>
                ) : (
                  <span>{problem.solution}</span>
                )}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section aria-labelledby="process-title">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Process</p>
          <h2 id="process-title" className={styles.sectionTitle}>
            Four steps. No jargon.
          </h2>
          <p className={styles.sectionIntro}>
            The same four steps for a small automation or a larger build. You always know where you
            are.
          </p>
        </div>

        <ol className={styles.steps}>
          {data.steps.map((step, index) => (
            <li className={styles.step} key={step.title}>
              <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="stone" aria-labelledby="proof-title">
        <div className={styles.proof}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Proof</p>
            <h2 id="proof-title" className={styles.sectionTitle}>
              {data.proof.title}
            </h2>
            <p className={styles.sectionIntro}>{data.proof.body}</p>
          </div>
          <div className={styles.proofActions}>
            <Button href={data.proof.href} variant="secondary">
              {data.proof.linkLabel}
            </Button>
          </div>
        </div>
      </Section>

      <BookingSection />
    </Page>
  );
}
