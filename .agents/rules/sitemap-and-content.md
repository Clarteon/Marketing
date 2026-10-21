# Sitemap and content rules

## Pages

Seven pages plus a privacy page. Our work and Insights have individual pages beneath them.

| Page | Purpose | Sections, in order |
| --- | --- | --- |
| Home | Explain the solution-first approach and prompt a first action | Hero with three calls to action, problem cards, four-step process, proof, closing booking section |
| Solutions | Help visitors find their problem and see the likely solution | Problems grouped by theme, each with its likely solution type and a way to book |
| How we work | Make the process feel clear and low risk | Diagnose, recommend, build, support, and what to expect on a discovery call |
| Our work | Build credibility | Case studies framed as problem, solution, result, then founder bios and certifications |
| Insights | Show expertise and keep fresh content flowing | Short articles tied to common problems, each ending in a booking section |
| About | Tell the story behind the name and the team | Meaning of Clarteon, the team, how Clarteon works with clients |
| Contact | Offer every way in | Discovery call booking, project brief form, direct message |
| Privacy | Explain how chats and forms are handled | What Clara and the forms collect, third-party AI processing, analytics, how to request removal |
| Terms of use (draft) | Website terms, kept in draft until a lawyer approves | Drafted in `content/pages/terms.md`. On publish, add a footer link next to Privacy |

## On every page

Header with a Book a call button, a booking section, Clara's chat widget, and a footer with a Privacy link.

## Content as files

Default: page copy, case studies, insight articles and FAQs live as Markdown or MDX files in the repo under `content/`, so they are free, versioned, reviewable and easy to sync into Clara's knowledge. If the team later chooses a CMS, the sync step must keep working from it.

Each content file has front matter: `title`, `slug`, `type` (page, case-study, insight, faq), `status` (draft or published), `summary`, `tags` and `synonyms`. Only `status: published` content is shown on the site and synced to Clara.

## Proof

- Case studies come from shareable projects, framed as problem, solution, result. Use only results the client or your records support.
- A case study is published only with the client's written permission to be named, or to be described anonymously.
- Clara may mention a case study only once it is published.
- Founder bios and certifications are placeholders until supplied by the founders.

## Calls to action

Primary: Book a free discovery call (pending the team's final decision). Secondary: Send a project brief, and Or message us.
