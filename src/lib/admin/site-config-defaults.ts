import { DEFAULT_TEAM_MEMBERS } from "@/lib/team";

export const SITE_CONFIG_PAGE_SLUGS = [
  "home",
  "solutions",
  "how-we-work",
  "our-work",
  "insights",
  "about",
  "contact",
  "privacy",
  "terms",
] as const;

export type SiteConfigPageSlug = (typeof SITE_CONFIG_PAGE_SLUGS)[number];

export const SITE_CONFIG_PAGE_LABELS: Record<SiteConfigPageSlug, string> = {
  home: "Home",
  solutions: "Solutions",
  "how-we-work": "How we work",
  "our-work": "Our work",
  insights: "Insights",
  about: "About",
  contact: "Contact",
  privacy: "Privacy Policy & Cookies",
  terms: "Terms of Service",
};

export interface HeroOverrideConfig {
  title?: string;
  intro?: string;
}

export interface SiteConfig {
  sections: {
    showHomeProblems: boolean;
    homeProblemsTitle: string;
    showHomeFlow: boolean;
    showHomeProcess: boolean;
    showHomeFeaturedWork: boolean;
    homeFeaturedWorkTitle: string;
    showHomeClara: boolean;
    showAboutOrgChart: boolean;
    aboutOrgTitle: string;
    showBookingSection: boolean;
  };
  pageHeroes: Partial<Record<SiteConfigPageSlug, HeroOverrideConfig>>;
  media: {
    serviceWorkflow: string;
    serviceDiscovery: string;
    serviceApiCode: string;
    serviceSoftwareBuild: string;
    aboutClarity: string;
    insightsNotes: string;
    teamPhotos: Record<string, string>;
  };
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  sections: {
    showHomeProblems: true,
    homeProblemsTitle: "Tell us what is slowing you down.",
    showHomeFlow: true,
    showHomeProcess: true,
    showHomeFeaturedWork: true,
    homeFeaturedWorkTitle: "Built around real bottlenecks.",
    showHomeClara: true,
    showAboutOrgChart: true,
    aboutOrgTitle: "Organizational structure",
    showBookingSection: true,
  },
  pageHeroes: {},
  media: {
    serviceWorkflow: "/images/services/workflow-mapping.jpg",
    serviceDiscovery: "/images/services/team-discovery.jpg",
    serviceApiCode: "/images/services/api-code.jpg",
    serviceSoftwareBuild: "/images/services/software-build.jpg",
    aboutClarity: "/images/editorial/about-clarity.jpg",
    insightsNotes: "/images/editorial/insights-notes.webp",
    teamPhotos: Object.fromEntries(
      DEFAULT_TEAM_MEMBERS.map((member) => [member.id, member.photoUrl ?? ""]),
    ),
  },
};

export interface AdminProjectRecord {
  slug: string;
  title: string;
  summary: string;
  client: string | null;
  category: "operations" | "conversations" | "software" | "web";
  categoryLabel: string | null;
  solution_type: string | null;
  image: string | null;
  imageAlt: string | null;
  secondaryImage: string | null;
  secondaryImageAlt: string | null;
  liveUrl: string | null;
  problemBrief: string | null;
  approachBrief: string | null;
  outcomeBrief: string | null;
  highlights: string[];
  tags: string[];
  body: string;
  publishedAt: string | null;
  order: number;
  featuredOnHome: boolean;
  status: "draft" | "published";
}

export const PROJECT_CATEGORIES = [
  { value: "operations", label: "Orders, stock & payments" },
  { value: "conversations", label: "Customer support & AI coaching" },
  { value: "software", label: "Private on-device tools & custom software" },
  { value: "web", label: "Websites & web applications" },
] as const;
