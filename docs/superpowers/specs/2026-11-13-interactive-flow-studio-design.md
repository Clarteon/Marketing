# Clarteon Interactive Flow Studio Redesign Specification

**Date:** 2026-11-13  
**Scope:** Site-wide visual & interactive redesign (`Home`, `Solutions`, `How We Work`, `Our Work`, `About`, `Insights`)  
**Palette:** Paper (`#FFFFFF`), Stone (`#F4F4F2`), Ink (`#0A0A0A`), Graphite (`#5C5C58`), Lime (`#C6F432` spotlight fill with Ink text only)  
**Typography:** `Fraunces` (display headlines, `<= 2` lines across viewports), `Schibsted Grotesk` (UI, controls, short copy)

---

## 1. Problem & Goal

The current site reads too verbosely and still relies on standard bordered card grids. Visitors need to **see and play with** how Clarteon connects broken workflows and AI agents within five seconds—with sharp 4–8 word value hooks that sell the outcome, Swiss geometric playfulness inspired by `bookofshapes.com`, real runnable `n8n`-style + AI Agent flow simulations based on Clarteon's actual systems, and monochrome/lime HD photography collages—without diluting our brand palette or inventing unverified claims.

---

## 2. Structural Approaches Considered

1. **Interactive Flow Studio (`dense-tiles` + Interactive Node Sandbox + Geometric Specimens) — Selected**  
   12-column fitted mosaic grid across pages where text blocks shrink to punchy 4–8 word hooks, paired with a runnable `n8n` + AI Agent canvas, interactive Book-of-Shapes SVG specimen tiles, and cropped monochrome/lime HD photo collage frames.  
   - *Trade-off:* Requires custom responsive tile choreography on mobile (`2-column` stack) and strict bundle/performance care (`lighthouserc.json` + Playwright `--workers=2`), while delivering maximum tactile impact and clarity.
2. **Editorial Magazine Collage Hero + Conventional Stacked Bands**  
   Rich hero collage above unchanged lower section bands.  
   - *Rejected:* Leaves inner sections feeling text-heavy and templated compared to the hero.
3. **Full Dark-Mode Shader Canvas**  
   Turns the whole landing flow `#0A0A0A`.  
   - *Rejected:* Clashes with Clarteon's Paper/Stone editorial identity and light/dark chapter rhythm.

---

## 3. Core Architecture & Interactive Modules

### A. Condensing Copy Without Losing Conversion (`humanizer` + Marketing Clarity)
- **Home (`/`)**: Keep the required `<h1>` (`"Technology that starts with your problem."` + Lime stroke on `"problem."`) and three primary actions (`Book a free discovery call`, `Send a project brief`, `Or message us`). Cut card multi-sentence paragraphs down to crisp 4–8 word problem -> outcome hooks (e.g., `"Manual copy-paste"` -> `"Zero-touch sync"`, `"Repeated inbox questions"` -> `"Policy-cited answers"`). Longer explanations live inside clicked node inspections and Case Studies / Insights detail pages.
- **Solutions (`/solutions`)**: Lead with the runnable n8n + AI Agent Studio, followed by clean dense-tile problem groups with scannable 1-line problem -> fix pairs and direct `"Book for this"` / `"Inspect build"` links.
- **How We Work (`/how-we-work`)**: Replace wordy prose cards with an interactive 4-panel tinted progression (`Diagnose`, `Recommend`, `Build`, `Support`) + crisp 5-tile visual expectations board (`30 min`, `Small first step`, `Plain recommendation`, `Honest fit check`, `Zero homework`).
- **Our Work (`/our-work`), About (`/about`), Insights (`/insights`)**: Apply the fitted tile board aesthetic, HD collage frames (using real screenshots from `public/images/work/` alongside open-licensed architectural photography), concise story tiles explaining Clarteon (`clarté`), and clear article index tiles.

### B. Runnable n8n + AI Agent Flow Studio (`N8nAgentStudio.tsx`)
An interactive SVG + HTML node-graph canvas styled in Clarteon Ink/Paper/Stone/Lime, demonstrating **real Clarteon system patterns** (grounded in `content/case-studies/`):
1. **Order & Stock Router (Workflow Automation)**  
   `Webhook Form` -> `Validate Fields` -> `Router: Stock > 0?` -> branches into `[Decrement Sheet + Gmail Receipt + Telegram Alert]` vs `[Backorder Queue + Team Alert]`
2. **AI Customer Support Triager (Automation + Classifier)**  
   `Support Intake` -> `AI Triage Node (Topic · Tone · Urgency)` -> `FAQ Policy Lookup` -> branches into `[Urgent Escalation Channel]` vs `[Slack Channel + Draft Reply + Airtable]`
3. **Voice & Policy AI Coach (Multi-tool AI Agent)**  
   `Voice / Chat Query` -> `Clarteon AI Agent Core` (wired to sub-nodes: `Live KPI DB`, `Policy Docs RAG`, `Source Citation Guard`) -> `Cited Answer + Action Plan` (or `"No policy doc found"` refusal when missing)

**Interactions:**
- Visitors click **`Run scenario`** (or switch scenario tabs) to watch animated signal packets travel edge-by-edge along bezier wires (`queued -> running -> passed`), highlighting real data transformations at each node.
- Visitors can click **Trigger branch flip** (e.g., `Simulate: Out of stock` / `Simulate: Missing policy` / `Simulate: Urgent tone`) to see the automation route differently in real time—proving safety and honesty visually.
- Clicking any node updates a compact 1-line inspector bar at the bottom of the canvas (never bloating page height).

### C. Book-of-Shapes Geometric Playgrounds (`ShapeSpecimenTile.tsx`)
Algorithmic Swiss SVG tiles inspired by `bookofshapes.com` rendered strictly in Ink (`#0A0A0A`), Paper (`#FFFFFF`), Stone (`#F4F4F2`), Graphite (`#5C5C58`), and Lime (`#C6F432`):
- **Patterns:** `Quarter-Circle Truchet`, `Radial Focus Grid`, `Sine Interference Waves`, `Modular Matrix`.
- **Interactivity:** Subtle hairline tactile controls inside accent collage tiles (`Pattern switcher`, compact `Density` / `Angle` slider, and `↻ Seed` randomize button) plus smooth hover/pointer deflection—zero verbose captions, pure visual rhythm.
- **Reduced Motion:** Honors `prefers-reduced-motion: reduce` cleanly with static crisp vector output.

### D. HD Copyright-Free Photo Collage & Shader Atmosphere (`CollageFrame.tsx` + `WebGpuFieldCanvas.tsx`)
- Download 4–6 verified high-resolution CC0 / public-domain / CC-BY architectural & optical/technology images locally to `public/images/collage/` via `design-taste-frontend/scripts/assets.mjs` (plus real project screenshots from `public/images/work/`).
- Treat photos consistently as high-contrast monochrome grayscale plates with angled Lime (`#C6F432`) registration tabs, overlapping Book-of-Shapes SVG overlays, and existing `WebGpuFieldCanvas` particle fields (`hero`, `aperture`, `conduit` modes).
- Credit open-licensed photography honestly in a compact footer/provenance strip per `design-taste-frontend`.

---

## 4. Compatibility, Integrity & Quality Gates

- **Brand & Copy Rules:** Palette `#0A0A0A / #FFFFFF / #F4F4F2 / #5C5C58 / #C6F432` unchanged; lime used exclusively as fill with Ink text on top; `Fraunces` + `Schibsted Grotesk` unchanged; no invented metrics, testimonials, or prices.
- **Test & Accessibility Continuity:** Keep `<h1 />` (`"Technology that starts with your problem."`) and `#elastic-highlight` (`"problem."`), maintain WCAG AA contrast, 44px touch targets, zero `axe` violations, and pass `npm run verify`, `npm run build`, and `npx playwright test --workers=2`.
- **Design Checks:** Verify updated desktop (`1440px`) and mobile (`390px`) screenshots via `design-taste-frontend/scripts/inspect.mjs` and run `impeccable detect --json` on modified UI files after building.
