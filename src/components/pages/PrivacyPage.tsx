import type { SimplePageData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { HeroDirectory } from "@/components/ui/HeroDirectory";
import { Markdown } from "@/components/ui/Markdown";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { ReadingProgress } from "@/components/ui/ReadingProgress";
import { Section } from "@/components/ui/Section";
import styles from "./pages.module.css";

const privacyDirectoryItems = [
  { label: "Entity status and scope", href: "#1-entity-status-and-scope" },
  {
    label: "Information we collect",
    href: "#2-information-we-collect-and-purposes-of-processing",
  },
  {
    label: "Cookie notice and preferences",
    href: "#3-cookie-notice-and-preference-management",
  },
  { label: "Your rights and requests", href: "#7-your-rights-and-requests" },
] as const;

const termsDirectoryItems = [
  { label: "Acceptance of terms", href: "#1-acceptance-of-terms" },
  {
    label: "Discovery calls and briefs",
    href: "#4-discovery-call-scheduling-and-project-briefs",
  },
  { label: "Clara, our AI assistant", href: "#5-clara-our-ai-assistant" },
  {
    label: "Governing law and disputes",
    href: "#10-governing-law-and-dispute-resolution",
  },
] as const;

export function PrivacyPage({ data, body }: { data: SimplePageData; body: string }) {
  const isTerms = data.hero.title.toLowerCase().includes("terms");
  const effectiveMatch = body.match(/^Effective date:\s*(.+)$/m);
  const effectiveNote = effectiveMatch
    ? `Effective ${effectiveMatch[1].trim()} · Republic of the Philippines`
    : "Republic of the Philippines";

  return (
    <Page>
      <PageHero
        title={data.hero.title}
        intro={data.hero.intro}
        visual={
          <HeroDirectory
            heading={isTerms ? "Key sections" : "Policy contents"}
            note={effectiveNote}
            items={isTerms ? termsDirectoryItems : privacyDirectoryItems}
          />
        }
      />
      <Section width="narrow">
        <ReadingProgress>
          <Markdown className={styles.legalProse}>{body}</Markdown>
        </ReadingProgress>
      </Section>
      <BookingSection />
    </Page>
  );
}
