---
name: clarteon-design-system
description: Implement the Clarteon brand as design tokens and shared UI components (roadmap phase P1): palette, Fraunces and Inter typography, buttons, sections, cards, header, footer and the aperture logo. Use whenever the task involves styling, theming, fonts, colors, the logo, buttons or reusable components for the Clarteon site, even if the user does not mention the design system.
---

# Clarteon design system

Goal: one small, consistent set of tokens and components that makes every page look clean, corporate and bold, with lime used sparingly.

Read `.claude/rules/brand-and-copy.md` first. It is the source of truth for colors, fonts and the lime rule.

## Tokens

Define the tokens once (CSS variables or the framework's theme config) and use them everywhere:

```
--ink: #0A0A0A;  --paper: #FFFFFF;  --stone: #F4F4F2;
--graphite: #5C5C58;  --lime: #C6F432;  --line: #E4E4E0;
```

- Fonts via the framework's font loader: Fraunces for headlines (weight 400 to 600, tight negative letter spacing), Inter for body and interface.
- Headline sizes scale fluidly with viewport width. Body is 18 to 20 px with generous line height.
- Spacing steps of 8 px. Corner radius 8 px for small elements, 20 px for cards, fully rounded for buttons.

## Components

Build these as small, typed components with accessible defaults:

- `Button` (primary lime with Ink text, secondary Ink outline, text link), minimum 44 px tall
- `Section` (width limit, vertical rhythm, optional Stone or Ink background)
- `Card` (Stone or bordered, used for problem cards and case studies)
- `Header` (logo, navigation, Book a call button) and `Footer` (links, Privacy link)
- `Logo` (aperture tile plus wordmark, plus a symbol-only variant for favicon and avatar)
- `BookingSection` (shell only now, wired up in the booking phase)
- `ChatWidgetSlot` (mount point only, wired up in the Clara phase)

## Rules to enforce

- Lime appears only as a fill with Ink text on top, never as text on a light background.
- Every interactive element has a visible focus state and works by keyboard.
- Text meets WCAG AA contrast. Images have alt text or are decorative.
- No decorative shadows or gradients. Flat, minimal, plenty of whitespace.

## Done when

Components render in a simple preview page, pass the automated accessibility check, and a reviewer can see lime used only for actions and highlights.
