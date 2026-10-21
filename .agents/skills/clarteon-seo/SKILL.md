---
name: clarteon-seo
description: Make the Clarteon site discoverable in search (P1 basics, P7 launch, P8 ongoing): page titles and descriptions, canonical host, sitemap and robots, structured data, share images, Google Search Console, and writing Insights articles that answer real problem searches. Use whenever the task mentions SEO, Google, search results, ranking, indexing, Search Console, meta tags, sitemap, robots, structured data, schema markup, share previews, keywords, or writing or editing an Insights article, even if SEO is not named.
---

# Clarteon SEO

Goal: searching "Clarteon" shows clarteon.tech first with the right name and description, and each Insights article answers one problem a business owner would search for.

Follow `.agents/rules/seo.md`, `.agents/rules/brand-and-copy.md` and `.agents/rules/sitemap-and-content.md`. Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/` before changing metadata files.

## Where things live

| Concern | File |
| --- | --- |
| Per-page title, description, canonical, Open Graph, Twitter | `src/lib/metadata.ts` (`metadataForPage`) |
| Site defaults, `metadataBase`, robots meta | `src/app/layout.tsx` |
| Sitemap and robots | `src/app/sitemap.ts`, `src/app/robots.ts` |
| Structured data | `src/lib/structured-data.ts`, `src/components/ui/JsonLd.tsx` |
| Share image | `src/app/opengraph-image.tsx` |
| Site URL and indexing switch | `src/lib/site.ts` (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ALLOW_INDEXING`) |
| Checks | `tests/seo.test.ts`, `tests/metadata.test.ts` |

## Page checklist

1. Front matter has a title and summary that work in a search result, or `seoTitle` and `seoDescription` that do. Run `npm test -- seo` to check length and uniqueness.
2. The route's `generateMetadata` calls `metadataForPage`. New content types get a path in `pathForPage`, and the sitemap uses it.
3. One `h1`, logical headings, descriptive links.
4. Articles render `<JsonLd data={articleJsonLd(page, getSiteUrl())} />`. Never add markup for facts the site does not publish.

## Writing an Insights article

1. Pick one problem from the Solutions page or the unanswered-question queue. Write down the phrase a business owner would type, for example "automate invoice data entry". That phrase is the focus. Do not invent search volumes.
2. Title: the problem in plain words, at most 49 characters so the suffix fits. Description: what the reader will learn, 50 to 160 characters.
3. Structure: name the problem and what it costs day to day, why it happens, the realistic options (including "you may not need software"), the likely solution type, and what to ask before choosing. End with the booking section (the article layout adds it).
4. Facts: no invented statistics, clients, results or prices. Use bracket placeholders and `status: draft` for anything a human must supply.
5. Links: link the matching Solutions section (for example `/solutions#operations`) and a published case study if one fits. Update an older article to link to the new one when relevant.
6. Front matter: `type: insight`, `tags` and `synonyms` holding the focus phrase and its variants, `publishedAt` on publish, `updatedAt` on later meaningful edits.
7. A human reads the final text before `status: published`.

## Launch: getting found for "Clarteon"

Humans own the accounts. Ask before creating any of them.

1. In Vercel, add `clarteon.tech` as the production domain and redirect `www.clarteon.tech` to it.
2. Set `NEXT_PUBLIC_SITE_URL=https://clarteon.tech` and `NEXT_PUBLIC_ALLOW_INDEXING=true` for Production only, then redeploy.
3. Confirm on production: `/robots.txt` allows the site and lists the sitemap, `/sitemap.xml` uses `https://clarteon.tech` URLs, the home page has no `noindex`, and `/opengraph-image` returns the image.
4. Validate the home page and one article in the Rich Results Test and the Schema Markup Validator.
5. In Google Search Console, add a Domain property for `clarteon.tech`, verified by DNS TXT record. Submit `https://clarteon.tech/sitemap.xml` and request indexing for the home page. Optionally import the property into Bing Webmaster Tools.
6. Check a preview deployment still sends `noindex` and a disallow-all robots file.

## After launch (monthly, part of the P8 review)

- Search Console: is the home page the first result for "Clarteon"? Which pages are not indexed, and why? Which queries bring impressions without clicks (rewrite those titles and descriptions)?
- Turn real problem queries into new Insights articles.

## Done when

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass, the page checklist holds for every changed page, and for launch work every step above is done or has a named owner.
