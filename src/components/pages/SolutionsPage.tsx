import type { SolutionsData } from "@/lib/page-schemas";
import { BookingSection } from "@/components/ui/BookingSection";
import { Button } from "@/components/ui/Button";
import { HeroDirectory } from "@/components/ui/HeroDirectory";
import { Page } from "@/components/ui/Page";
import { PageHero } from "@/components/ui/PageHero";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SolutionMarquee } from "@/components/ui/SolutionMarquee";
import { SolutionsCatalog } from "./SolutionsCatalog";

export function SolutionsPage({ data }: { data: SolutionsData }) {
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
        visual={
          <HeroDirectory
            heading="Problem areas"
            note={`${data.themes.length} areas covered on this page`}
            items={data.themes.map((theme) => ({
              label: theme.title,
              meta: `${theme.problems.length} operational pain points`,
              href: `#${theme.id}`,
            }))}
          />
        }
        bottomBand={<SolutionMarquee />}
      />

      <SolutionsCatalog themes={data.themes} />

      <ScrollReveal>
        <BookingSection />
      </ScrollReveal>
    </Page>
  );
}
