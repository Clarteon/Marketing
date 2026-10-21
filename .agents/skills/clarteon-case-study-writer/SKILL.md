---
name: clarteon-case-study-writer
description: Turn a finished Clarteon project into an approved, honest case study page (roadmap phase P7) framed as problem, solution, result, with a client permission checklist, support for anonymous versions, and published front matter that syncs to Clara. Use whenever the user wants to write, edit or publish a case study, sample project, portfolio entry or "Our work" content, or share a past project on the site.
---

# Case study writer

Goal: a short, credible case study that shows the solution-first idea, with only claims that are true and approved.

Follow `.agents/rules/brand-and-copy.md` and `.agents/rules/sitemap-and-content.md`. Use `references/template.md`.

## Before writing

Ask a human for the facts. Do not invent any of them:

- The project, the client (or how to describe an anonymous client by size and kind of business), and what the client originally asked for
- The problem in the client's own words
- What was built or changed, and the solution type (automation, AI agent, integration, custom software and so on)
- The results, with numbers only if the client or Clarteon's records support them
- Whether there is a short quote the client agrees to publish

## Permission checklist (must all be true before status is published)

- [ ] Written okay from the client to be named, or to be described anonymously
- [ ] Every number confirmed with the client or from records
- [ ] Screenshots and text checked for private data, internal URLs, names and credentials
- [ ] Anything under NDA removed or reworded with permission
- [ ] The permission is recorded in the content file's front matter `permission` field (who approved and when)

## Writing guidance

- Lead with the problem, in plain words. Then the solution and why it fit. Then the result.
- One clear takeaway per case study. Short paragraphs. No jargon the client would not use.
- No superlatives and no claims you cannot back up. If a result is not measured, describe it honestly.
- Name the likely solution type so the page reinforces "problem first, product second".
- End with a booking section.

## Publishing

Create a content file in `content/case-studies/` with `type: case-study`, `status: draft` until the checklist is complete, then `published` with `publishedAt` set to the publish date (the build fails without it). Follow `.agents/rules/seo.md` for the title and description. Publishing triggers the knowledge sync, after which Clara may mention it. Link the most relevant case study from related Insights articles.

## Done when

The checklist is complete, the page passes the placeholder check, and a human has read the final text.
