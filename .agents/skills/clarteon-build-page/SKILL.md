---
name: clarteon-build-page
description: Build a Clarteon website page from the sitemap (roadmap phase P1): Home, Solutions, How we work, Our work, Insights, About, Contact or Privacy, with content in Markdown or MDX files, SEO metadata and the booking section and chat slot on every page. Use whenever the user asks to create, edit or fill in a page, section or copy on the Clarteon site, even if they only name the page.
---

# Build a Clarteon page

Goal: a page that matches the sitemap, uses approved copy, and ships with no placeholders.

Follow `.agents/rules/sitemap-and-content.md` and `.agents/rules/brand-and-copy.md` first.

## Process

1. Find the page in the sitemap table. Use its purpose and its sections in order. Do not add or drop sections without asking.
2. Put copy in a content file under `content/` with the required front matter (`title`, `slug`, `type`, `status`, `summary`, `tags`, `synonyms`). The page component renders from that file, so copy can change without code changes, and the knowledge sync can read it.
3. Use only components from the design system. If a needed component is missing, add it to the design system first.
4. Write copy in Clarteon's voice: name the problem before the product, plain words, short sentences, say "discovery call". Use the approved homepage headline and subhead exactly.
5. Include on every page: the header with Book a call, the booking section near the end, the chat widget slot, and the footer with the Privacy link.
6. Follow `.agents/rules/seo.md` and the page checklist in the `clarteon-seo` skill: metadata through `metadataForPage`, unique title and description within the tested lengths, one `h1`, logical headings, and JSON-LD on articles.
7. For Insights articles: use the article playbook in `clarteon-seo`. Tie the article to one common problem, end with a booking section, and link the most relevant published case study if one exists.
8. For Our work and case studies: only published content with recorded client permission. Use `clarteon-case-study-writer` to create case studies.
9. Replace nothing with invented facts. Unknown facts stay as `[BRACKET PLACEHOLDERS]` in draft content, and `status: draft` keeps them off production.

## Page-specific notes

- Home: hero (approved headline and subhead, three actions), four problem cards each ending in "Often solved with" and the likely solution type, a four-step process (diagnose, recommend, build, support), proof (two case study teasers and the founders strip when available), closing booking section.
- Solutions: problems grouped by theme on one page, each with the likely solution type and a way to book.
- Contact: all three ways in. The project brief form posts to `/api/lead` (see `clarteon-lead-and-email`).
- Privacy: what is collected, why, who processes it (including the third-party AI provider), retention, and how to request removal. Mark it for lawyer review before launch.

## Done when

The page renders responsively, passes the accessibility check, contains no bracket placeholders in published content, and the booking section and chat slot are present.
