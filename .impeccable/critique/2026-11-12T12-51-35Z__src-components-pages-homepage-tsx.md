---
target: Clarteon website UI (HomePage + sitewide components)
total_score: 19
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 4
target_identity: "file:C:\\Users\\aldre\\OneDrive\\Documents\\Clarteon\\src\\components\\pages\\HomePage.tsx"
target_fingerprint: "sha256:e879120bf757793851d96ba7f05c647a11755b442aad709c64665f14394299aa"
target_path: "C:\\Users\\aldre\\OneDrive\\Documents\\Clarteon\\src\\components\\pages\\HomePage.tsx"
timestamp: 2026-11-12T12-51-35Z
slug: src-components-pages-homepage-tsx
---
Method: dual-agent (A: b20ff7cb-14d6-4592-988d-fac072cf34f9 · B: 7abf3b28-c61e-4f56-9d24-a27920ef7839)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Booking, chat, and brief forms report state well, though disabled Turnstile-gated submit buttons lack an inline "verifying" hint and `/contact` shows blank `"Loading ... form..."` boxes on initial load. |
| 2 | Match System / Real World | 3 | Copy speaks plain business English, but `HeroFlowVisualization` hides all 8 node labels behind hover tooltips and `ReticleFrame` / `CustomCursor` introduce camera-viewfinder metaphors. |
| 3 | User Control and Freedom | 2 | `CustomCursor` hides the native OS pointer (`cursor: none !important`), and `ClaraChat` blocks first-time users behind a mandatory privacy interstitial before revealing quick starts. |
| 4 | Consistency and Standards | 2 | `PageHero` forces `min-height: calc(100svh - 74px)` on content-light inner pages; `CustomCursor` enlarges on non-clickable `.step` blocks; focus indicators vary from 3px Ink to low-contrast lime `box-shadow`. |
| 5 | Error Prevention | 3 | Strong booking calendar constraints, timezone auto-detection, `<details>` progressive disclosure, and idempotent `requestId` booking checks. |
| 6 | Recognition Rather Than Recall | 2 | `HeroFlowVisualization` renders 8 icon-only `60x60` nodes with `opacity: 0` labels at rest; mobile/touch users cannot scan what any icon means without tapping one by one. |
| 7 | Flexibility and Efficiency | n/a | Persuade/marketing surface; power-user shortcuts do not apply (aside from calendar arrow keys in `BookingForm`). |
| 8 | Aesthetic and Minimalist Design | 1 | Visual chrome overwhelms content: spinning emerald conic border beams, 30–102 static box-shadows, 547-line `CoordinateGrid` canvas, viewfinder corner reticles, floating blur pill navbar, and 4 simultaneous infinite loops on `ClaraChat`. |
| 9 | Error Recovery | 3 | Plain-language error states and automatic fallback paths ("Send a project brief" / direct email) on booking and chat failures. |
| 10 | Help and Documentation | n/a | Marketing site; `HowWeWorkPage` and `ClaraChat` cover pre-call questions without a docs portal. |
| **Total** | | **19/32** | **59% — Acceptable (needs simplification and chrome removal before launch)** |

---

### Design Specificity Verdict

**LLM assessment**: The *words and problem-first structure* feel genuinely authored for Clarteon. However, the *visual and interaction layer* reads like a maximalist "modern creative agency" template packed with generic AI-slop and gallery-fashion ornaments (`ReticleFrame`, `CoordinateGrid`, conic border beams, `01`/`02`/`03` kickers, glass pill navbar, custom cursor, pulsing live dot) that directly contradict `.agents/rules/brand-and-copy.md` ("clean and corporate, but bold and minimal. Generous whitespace, one idea per section, few elements").

**Deterministic scan**:
- **`impeccable detect` (5 warnings)**: 4 genuine `bounce-easing` hits (`cubic-bezier(0.34, 1.56, 0.64, 1)` in `hero-aperture.module.css:182` and `ui.module.css:371, 422, 804`) plus 1 false-positive `side-tab` on standard `.prose blockquote` styling (`globals.css:225`).
- **`taste-skill lint.mjs` (146 files → 173 FAIL, 72 WARN)**: Caught 19 `[eyebrow]` violations, 17 `[hairline]` rules, 102 `[shadow]` declarations, 32 `[gradient]` fills, 3 `[gradient-text]` declarations, 59 `[outlined-box]` rules, 4 `[glass]` `backdrop-filter` usages, 6 `[numbering]` hits (3 UI `padStart(2, "0")` in `SolutionsPage`, `HowWeWorkPage`, `WorkShowcase`; 3 false positives in booking/prompt time formatting), and 6 em dashes.
- **`taste-skill inspect.mjs` (real browser at 1440 / 768 / 390 across 5 routes)**: Measured **9–12 FAILs and 2–7 WARNs per route** — notably 30 static shadows on `/`, 12–17 outlined boxes on `/solutions` and `/our-work`, 14–16 distinct font sizes (ceiling is 5), 0–1 real raster pictures on 4 of 5 routes, 0 videos, off-centre margins on `/solutions` (`120px` left vs `239px` right), 3–4 line case-study headlines on `/our-work`, and empty right ~40% desktop hero folds (`filled[0]` = `0.16–0.24`).

**Visual overlays**: Not injected (real-browser verification was performed via `taste-skill/scripts/inspect.mjs` DOM measurements and multi-viewport screenshots in `.taste-skill/before/*`).

---

### Overall Impression

Clarteon has unusually honest copy and solid form engineering wrapped in a noisy, template-heavy shell. Stripping the decorative AI chrome (`ReticleFrame`, border beams, `CustomCursor`, `01` kickers, `100svh` empty hero canvases, lime washes) and upgrading `HeroFlowVisualization` and `/solutions` into genuinely interactive, readable, problem-first tools will immediately elevate both clarity and craft.

### What's Working

1. **Problem-First Copy & Honest IA**: `home.md`, `solutions.md`, `how-we-work.md`, and `WorkShowcase.tsx` frame bottlenecks plainly without buzzword fluff.
2. **Resilient Booking & Brief Forms**: `BookingForm.tsx` and `ProjectBriefForm.tsx` offer timezone detection, keyboard-accessible calendar navigation, `<details>` progressive disclosure, idempotency, and graceful error recovery.
3. **Real Case Study Dossiers**: `/our-work` pairs real system screenshots with clear outcomes, avoiding fake stats or generic mockups.

---

### Priority Issues

- **[P0] Full-Viewport (`100svh`) Empty Heroes, Broken 4-Col Grid on `/solutions`, and Blank Deferred Forms**
  - **Why it matters**: Every inner page wastes nearly an entire viewport on an empty coordinate grid (`filled[0] = 0.16–0.24`), `/solutions` leaves a 25% empty right column on all 4 theme sections (`120px` left vs `239px` right) because `repeat(4, ...)` renders 3 cards, and `/contact` shows giant white `"Loading ... form..."` boxes on initial paint.
  - **Fix**: Scope tall hero height only to `.heroHome` (and pair it with a real interactive visual in the right column), make inner `PageHero` compact, switch `.problemGrid` on `/solutions` to 3 columns / `auto-fit`, and render `BookingForm` / `ProjectBriefForm` directly without the jarring deferred placeholder card.
  - **Suggested command**: `$impeccable layout`

- **[P1] AI-Slop Chrome & Brand Rule Violations (Border Beams, Shadows, Reticles, Custom Cursor, Lime Washes)**
  - **Why it matters**: `Card.tsx` (`.borderBeam`), `Button.tsx` (conic borders + gradients + ripples), `ReticleFrame.tsx` (viewfinder brackets + uppercase badges), `CustomCursor.tsx` (`cursor: none`), floating `backdrop-filter` header pill, and full-bleed `tone="lime"` sections (`HomePage.tsx:112`, `ContactPage.tsx:60`) trigger 173 `taste-skill` lint FAILs and directly violate `brand-and-copy.md` ("Lime is a spotlight, never a wash", "never small tracked capitals").
  - **Fix**: Remove `.borderBeam`, `ReticleFrame`, `CustomCursor`, button gradients/conic borders, hairline rules, and `tone="lime"` section washes (use `tone="ink"` or `tone="stone"` instead, saving Lime strictly for primary CTA fills and tight active highlights). Replace `WorkFolioIllustration` + `ReticleFrame` with real case study previews.
  - **Suggested command**: `$impeccable distill`

- **[P1] Unreadable Icon-Only `HeroFlowVisualization` & Duplicate Home Problem Section**
  - **Why it matters**: `HomePage.tsx` shows 4 problem cards and immediately repeats the same 4 problems in `HeroFlowVisualization.tsx`, where all 8 nodes render as `60x60` mystery icons (`opacity: 0` labels at rest) with 5 unapproved off-brand colors (coral, amber, emerald, cyan, yellow-green) and glowing SVG filters.
  - **Fix**: Merge the problem cards and flow diagram into one unmistakable, always-labeled interactive diagnostic explorer (using only Ink, Paper, Stone, and Lime) placed directly in the Home hero's empty right column or replacing the redundant section.
  - **Suggested command**: `$impeccable bolder`

- **[P1] Unfinished `/insights` & `/about` Pages + Cluttered `/our-work` Case Study Cards**
  - **Why it matters**: Primary nav links lead to an empty `"No articles are published yet"` page (`/insights`) and a placeholder note on `/about`, while `/our-work` fails `[headline-lines]`, `[micro-label]`, `[small-text]`, and `[hairline]` with 3–4 line case-study headlines and `01 / THE PROBLEM` boxes.
  - **Fix**: Remove `Insights` from top-level nav until real articles exist, expand `/about` with concrete team/practice substance (or concise real structure), tighten `/our-work` card headlines to <=2 lines, and replace `01 / THE PROBLEM` uppercase micro-labels with clean sentence-case structure.
  - **Suggested command**: `$impeccable clarify`

- **[P2] Hyperactive 4-Loop `ClaraChat` FAB & Excessive Scroll-Reveal Motion**
  - **Why it matters**: `ClaraChat` runs 4 simultaneous infinite animations (`launcherBeckon`, 2 sonar rings, emerald live dot, animated dots) and blocks quick-starts behind a privacy gate; `PageHero` blurs every headline word sequentially; `Markdown.tsx` wraps every paragraph in `ScrollReveal`.
  - **Fix**: Make the Clara launcher calm and purposeful (single crisp pill or clean button with subtle hover, no bouncing/sonar/live-dot), render hero `<h1>` crisp on first paint, and reserve motion for meaningful state transitions.
  - **Suggested command**: `$impeccable animate`

---

### Persona Red Flags

- **Jordan (Confused First-Timer)**: Encounters 8 unlabeled icon buttons in `HeroFlowVisualization` (`opacity: 0` labels), an empty `/insights` page straight from the top navbar, and disabled submit buttons during Turnstile loading with no inline status hint.
- **Casey (Mobile Visitor)**: Sees 8 icon-only nodes with hover tooltips disabled on touch, loses the `"Book a call"` header CTA below `980px` (`display: none`), and must tap 3 times (open FAB -> accept privacy card -> pick prompt) just to start chatting with Clara.
- **Sam (Accessibility-Dependent)**: Native pointer is hidden by `CustomCursor` (`cursor: none !important`) which falsely enlarges on non-interactive `.step` blocks; focus indicators drop to low-contrast lime `box-shadow` on `ProjectBriefForm`; `PageHero` splits `<h1>` into per-word `<span>`s.

---

### Minor Observations

- Missing 3rd Hero CTA on Home (`brand-and-copy.md` specifies `"Book a free discovery call"`, `"Send a project brief"`, `"Or message us"`, while `home.md` only has two).
- Typography scale uses 13–16 distinct font sizes per page (ceiling is 5) and running text on several pages renders in `#5c5c58` Graphite rather than full `#0a0a0a` Ink.
- Only 0–1 raster images appear on 4 of 5 pages (failing `taste-skill`'s 4-picture floor on non-`/our-work` pages).

---

### Questions to Consider

- What if the Home hero's empty right half held a live, readable "Pick what's slowing you down" diagnostic preview instead of a decorative `CoordinateGrid`?
- If `01`–`04` badges, reticle corners, and spinning conic glows disappeared tomorrow, what uniquely Clarteon visual structure would remain?
- Why make visitors read two sections of identical problem cards on Home and four identical 3-card grids on `/solutions` when an interactive before/after workflow explorer could prove how Clarteon works?
