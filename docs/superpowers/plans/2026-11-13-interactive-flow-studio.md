# Interactive Flow Studio & Collage Redesign Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan cleanly task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Clarteon into an interactive, low-verbiage Swiss/Bauhaus flow studio pairing runnable `n8n` + AI Agent workflows, `bookofshapes.com`-style SVG geometric playgrounds, `WebGpuFieldCanvas` atmospheric layers, and monochrome/lime HD architectural & instrument photo collages.

**Architecture:** Build three modular client components (`N8nAgentStudio`, `ShapeSpecimenTile`, `CollageFrame`) strictly adhering to Clarteon's `#0A0A0A / #FFFFFF / #F4F4F2 / #5C5C58 / #C6F432` palette and `Fraunces` + `Schibsted Grotesk` fonts, then recompose `HomePage`, `SolutionsPage`, `HowWeWorkPage`, `OurWorkPage`, `AboutPage`, and `InsightsPage` onto fitted mosaic tile boards with crisp 4–8 word hooks and open-license photography credits in `Footer`. Preserve `Home` required `<h1>`, `#elastic-highlight`, content front-matter schemas, booking/chat slots, zero inline code comments (`code-conventions.md`), and WCAG AA compliance.

**Tech Stack:** Next.js App Router (TypeScript), React 19, CSS Modules, SVG, WebGPU/Canvas2D (`WebGpuFieldCanvas`), Vitest + Testing Library + vitest-axe, Playwright, `impeccable` detector, `design-taste-frontend` `inspect.mjs`.

**Spec:** [docs/superpowers/specs/2026-11-13-interactive-flow-studio-design.md](file:///c:/Users/aldre/OneDrive/Documents/Clarteon/docs/superpowers/specs/2026-11-13-interactive-flow-studio-design.md)

## Global Constraints

- Exact Clarteon palette: `#0A0A0A` (Ink), `#FFFFFF` (Paper), `#F4F4F2` (Stone), `#5C5C58` (Graphite), `#C6F432` (Lime fill with Ink text only; never lime text on light backgrounds).
- Exact fonts: `Fraunces` headlines (`<= 2` lines across widths), `Schibsted Grotesk` body/UI; no invented stats/clients/prices; zero `[ALL CAPS]` placeholders.
- Home keeps `<h1 />` `"Technology that starts with your problem."`, `getByTestId("elastic-highlight")` with `"problem."`, and approved `hero` copy in `content/pages/home.md`.
- Zero comments added to new/modified TypeScript/CSS files per `.agents/rules/code-conventions.md`.

## Review Focus

- Interactive SVG node canvas overflow or overlapping nodes on 390px mobile screens -> provide responsive wrapping/horizontal rail + 44px min touch targets.
- Animation loop leaks or broken `prefers-reduced-motion` fallback in `N8nAgentStudio` / `ShapeSpecimenTile` -> clean up timers and render static crisp vector output immediately on reduced motion.
- Accidental removal of Home `<h1>`, `#elastic-highlight`, or `booking`/`brief`/`message` contact test hooks -> verify with unit a11y tests + full Playwright suite.
- Text length/wrapping blowing up headline line counts (`<= 2` lines) on mobile -> enforce `font-size: clamp(...)` and short scannable headings.
- Attribution compliance for Wikimedia Commons CC BY-SA plates -> render subtle readable credit links in `Footer.tsx`.

---

### Task 1: Build `ShapeSpecimenTile` + Unit Tests
**Files:**
- Create: `src/components/ui/ShapeSpecimenTile.tsx`, `src/components/ui/shape-specimen.module.css`
- Test: `tests/visualizations.test.tsx`

- [ ] Implement deterministic seeded Swiss SVG generator supporting 4 geometric modes (`truchet`, `radial`, `wave`, `matrix`) strictly in Clarteon palette (`#0A0A0A`, `#FFFFFF`, `#F4F4F2`, `#C6F432`).
- [ ] Add interactive controls: Pattern switcher (`Truchet` / `Radial` / `Wave` / `Matrix`), hairline Density range slider (`3..8`), and Seed randomizer (`↻`).
- [ ] Respect `prefers-reduced-motion: reduce` and minimum `44px` interactive control targets.
- [ ] Add Vitest coverage asserting SVG updates when switching patterns, incrementing seed, or adjusting density slider.

### Task 2: Build `N8nAgentStudio` + Unit Tests
**Files:**
- Create: `src/components/ui/N8nAgentStudio.tsx`, `src/components/ui/n8n-agent-studio.module.css`
- Test: `tests/visualizations.test.tsx`

- [ ] Build 3 runnable Clarteon workflows grounded in real case studies:
  1. `order-router` (*Order & Stock Router*: `Webhook Form` -> `Validate` -> `Stock > 0?` branching to `[Sheet + Gmail + Telegram]` vs `[Backorder + Owner Alert]`)
  2. `support-triager` (*AI Support Triager*: `Support Intake` -> `AI Triage` -> `FAQ Lookup` branching to `[Urgent Escalation]` vs `[Dept Slack + Draft Reply]`)
  3. `voice-policy-agent` (*AI Policy & KPI Agent*: `Voice Query` -> `AI Agent Core` with tool sub-nodes `Live KPI DB`, `Policy Docs RAG`, `Citation Guard` branching to `[Cited Answer]` vs `[Honest Refusal]`)
- [ ] Support **`Run scenario`** step-by-step live trace execution (`idle -> running -> passed`), **Trigger branch flip** toggle (e.g. `Simulate: Out of stock` / `Simulate: Urgent` / `Simulate: Missing doc`), scenario tabs, and click-to-inspect node payload strip (1 compact live status bar).
- [ ] Mount `WebGpuFieldCanvas` atmospheric field unobtrusively behind the studio stage so WebGPU/Canvas2D + node diagrams fuse cohesively.
- [ ] Add Vitest + Testing Library coverage for running scenario, flipping branch outcome, switching scenarios, and inspecting nodes.

### Task 3: Build `CollageFrame` + Footer Photography Credits
**Files:**
- Create: `src/components/ui/CollageFrame.tsx`, `src/components/ui/collage-frame.module.css`
- Modify: `src/components/ui/Footer.tsx`, `src/components/ui/ui.module.css`
- Test: `tests/visualizations.test.tsx`

- [ ] Build `CollageFrame` supporting layered monochrome grayscale photo plates (`public/images/collage/*` and real case-study screenshots in `public/images/work/*`), Lime `#C6F432` registration corners, crop coordinates, and optional geometric SVG cutouts.
- [ ] Add compact, WCAG-compliant open-license photography credits strip cleanly in `Footer.tsx` (`Wikimedia Commons` links + licenses).
- [ ] Add unit test verifying clean accessible image rendering (explicit width/height, descriptive alt text).

### Task 4: Recompose Pages into Fitted Dense-Tile Mosaic + Trim Verbiage
**Files:**
- Modify: `src/components/pages/HomePage.tsx`, `src/components/pages/SolutionsPage.tsx`, `src/components/pages/HowWeWorkPage.tsx`, `src/components/pages/OurWorkPage.tsx`, `src/components/pages/AboutPage.tsx`, `src/components/pages/InsightsPage.tsx`, `src/components/pages/WorkShowcase.tsx`, `src/components/pages/pages.module.css`
- Test: `e2e/hero-flow.spec.ts`, `e2e/visualizations.spec.ts`

- [ ] **Home (`/`):** Keep required `<h1>` (`"Technology that starts with your problem."` with `#elastic-highlight`) + primary CTAs, add an editorial visual collage mosaic plate beside hero, compress 4 Problem tiles to sharp 4–8 word Problem -> Solution hooks with direct `/solutions#*` links, replace `HeroFlowVisualization` with `<N8nAgentStudio initialScenario="order-router" />` + paired `<ShapeSpecimenTile />` mosaic row, tighten 4-step process conduit, and frame Proof (`Work you can look at.`) with real work collage thumbnails.
- [ ] **Solutions (`/solutions`):** Lead with `<N8nAgentStudio />`, then convert verbose theme sections into dense fitted Problem -> Outcome tiles (concise titles + crisp solution tags + compact `"Book for this"` action) interleaved with geometric shape specimen accents and hardware/architectural collage plates.
- [ ] **How We Work (`/how-we-work`):** Pair the 4-panel `Diagnose -> Recommend -> Build -> Support` progression with a tight 5-tile visual discovery expectations board (`30 min call`, `Small first step`, `Plain recommendation`, `Honest fit check`, `Zero prep`).
- [ ] **Our Work, About, Insights:** Integrate monochrome/lime `CollageFrame` + geometric tiles + tighter metadata framing without altering Markdown schemas or losing detail inside Case Studies / Insights articles.
- [ ] Update `e2e/hero-flow.spec.ts` and `e2e/visualizations.spec.ts` cleanly for the upgraded `N8nAgentStudio` + `ShapeSpecimenTile` components.

### Task 5: Build, Visual Inspection (`inspect.mjs` + `impeccable`), E2E, and Final Verification
- [ ] Run `npm run format`, `npm run verify`, and `npm run build`.
- [ ] Restart local server on `http://localhost:3199/`, run `impeccable.cmd detect --json` on modified UI files, and run `node .agents/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:3199/ --widths 1440,768,390` (+ `/solutions`).
- [ ] Inspect desktop (`1440px`) and mobile (`390px`) screenshots directly with `read_file` and execute a single batched fix pass if any layout, contrast, or spacing flaw appears.
- [ ] Run `npx playwright test --workers=2` and confirm 0 failures, then refresh `:3199/` in the browser preview tab cleanly.
