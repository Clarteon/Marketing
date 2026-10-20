export const navItems = [
  { href: "/solutions", label: "Solutions" },
  { href: "/how-we-work", label: "How we work" },
  { href: "/our-work", label: "Our work" },
  { href: "/insights", label: "Insights" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const site = {
  name: "Clarteon",
  tagline: "Technology that starts with your problem.",
  cta: { href: "/contact#book", label: "Book a call" },
} as const;

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .trim();
  if (vercelDomain) return `https://${vercelDomain}`;

  return "http://localhost:3000";
}

export function isIndexingAllowed(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
}
