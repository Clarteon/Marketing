# SEO rules

Goal: a search for "Clarteon" finds clarteon.tech first, and searches for the problems Clarteon solves find the Solutions page and Insights articles. Honest, useful pages beat tricks.

## Host and indexing

- Canonical host: `https://clarteon.tech`. `www.clarteon.tech` redirects permanently to it (set in the Vercel domain settings, not in code).
- Production sets `NEXT_PUBLIC_SITE_URL=https://clarteon.tech` and `NEXT_PUBLIC_ALLOW_INDEXING=true`. Preview and development leave indexing off, so robots blocks everything and pages carry `noindex`.
- `robots.ts` allows the site, disallows `/api/` and points to the sitemap. `sitemap.ts` lists only published content. Drafts never render and never appear in the sitemap.

## Every page

- Metadata comes from `metadataForPage` in `src/lib/metadata.ts`. Do not handwrite per-page title, canonical or Open Graph tags.
- Title: unique, at most 60 characters including the ` | Clarteon` suffix. Description: unique, 50 to 160 characters. Set `seoTitle` and `seoDescription` in front matter when the page title or summary does not work for search. `tests/seo.test.ts` enforces this on all published content.
- The home page title and description name Clarteon.
- One `h1`, headings in logical order, descriptive link text (never "click here"), alt text per the brand rule.

## Structured data

- JSON-LD only through `src/lib/structured-data.ts` and the `JsonLd` component. Organization and WebSite on the home page; Article on insights and case studies.
- Only facts already published on the site. No address, ratings, reviews, prices, founders, social profiles (`sameAs`) or FAQ markup until they are real and approved. The honesty rules for copy apply to markup too.
- `JsonLd` is the only allowed use of `dangerouslySetInnerHTML`. It takes repo content only, never visitor or model text, and always serializes through `serializeJsonLd`.

## Dates

- Published insights and case studies need `publishedAt` (YYYY-MM-DD); the content schema fails the build without it. Set `updatedAt` on meaningful edits. Never backdate.

## Content

- Write for a person searching for a problem, in Clarteon's voice. No keyword stuffing, hidden text, doorway pages or bulk machine-written pages.
- Tags and synonyms double as the search terms a page should answer. Keep them honest.
- Link new articles to the matching Solutions section and, if published, a case study.
- Clara's chats are never published or indexed.

## Images

- `src/app/opengraph-image.tsx` is the default share image for every page. A page-specific image is optional and follows the brand palette.

## Ask first

- Adding an SEO tool, tracking script, verification file or third-party service. Prefer Search Console domain verification by DNS record, which needs no code.
