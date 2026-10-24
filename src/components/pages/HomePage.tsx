import Link from "next/link";
import type { HomeData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HeroFlowVisualization } from "@/components/ui/HeroFlowVisualization";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { ProcessConduit } from "@/components/ui/ProcessConduit";
import { ReticleFrame } from "@/components/ui/ReticleFrame";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Section } from "@/components/ui/Section";
import { WorkFolioIllustration } from "@/components/ui/WorkFolioIllustration";
import { cx } from "@/lib/cx";
import styles from "./pages.module.css";

export function HomePage({ data }: { data: HomeData }) {
  return (
    <Page>
      <PageHero
        variant="home"
        eyebrow={data.hero.eyebrow}
        title={data.hero.title}
        highlight={data.hero.highlight}
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
        <ScrollReveal className={styles.sectionHeader}>
          <p className={styles.eyebrow}>What we hear most</p>
          <h2 id="problems-title" className={styles.sectionTitle}>
            Tell us what is slowing you down.
          </h2>
        </ScrollReveal>

        <ScrollReveal stagger className={styles.problemGrid}>
          {data.problems.map((problem) => (
            <Card
              as="article"
              key={problem.title}
              className={cx(styles.problemCard, problem.href ? styles.interactiveCard : undefined)}
            >
              <h3 className={styles.problemTitle}>{problem.title}</h3>
              <p className={styles.problemBody}>{problem.body}</p>
              <p className={styles.solution}>
                <span className={styles.solutionPrefix}>Often solved with</span>
                {problem.href ? (
                  <Link href={problem.href} className={styles.solutionLink}>
                    {problem.solution}
                  </Link>
                ) : (
                  <span className={styles.solutionStatic}>{problem.solution}</span>
                )}
              </p>
            </Card>
          ))}
        </ScrollReveal>

        <ScrollReveal className={styles.problemVisualization}>
          <div className={styles.visualizationHeader}>
            <p className={styles.eyebrow}>How we connect the dots</p>
            <h3 className={styles.visualizationTitle}>See how your problems find the right fix.</h3>
          </div>
          <HeroFlowVisualization />
        </ScrollReveal>
      </Section>

      <Section tone="ink" className={styles.processSection} aria-labelledby="process-title">
        <ScrollReveal className={styles.sectionHeader}>
          <p className={styles.eyebrow}>How we work</p>
          <h2 id="process-title" className={styles.sectionTitle}>
            Four steps. Clear and simple.
          </h2>
        </ScrollReveal>

        <ProcessConduit steps={data.steps} />
      </Section>

      <Section aria-labelledby="proof-title">
        <ReticleFrame className={styles.proofFrame}>
          <div className={styles.proof}>
            <div className={styles.proofCopy}>
              <div className={styles.sectionHeader}>
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
            <div className={styles.proofVisual} aria-hidden="true">
              <WorkFolioIllustration className={styles.proofIcon} />
            </div>
          </div>
        </ReticleFrame>
      </Section>

      <BookingSection tone="lime" />
    </Page>
  );
}
