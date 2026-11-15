# Global toast notification system

- **Objective:** Give Clarteon one reusable, accessible way to show short-lived operation feedback where a toast improves the experience.
- **Created:** 2026-10-25 16:57:55 +08:00 (Asia/Manila)
- **Last updated:** 2026-10-25 17:30:52 +08:00 (Asia/Manila)
- **Status:** Approved design; implementation complete.

## Intent and constraints

The website needs consistent, low-distraction feedback for completed actions and temporary operation states. The system must match the existing Clarteon tokens and typography, work from client components across the app, and remain keyboard accessible. It must not duplicate inline feedback that already suits a form, chat, or booking flow. Preserve existing behavior and unrelated in-progress edits.

## Proposed design

Add a client-side `ToastProvider` under `src/components/ui/`, mounted once in `src/app/layout.tsx`, with a shared fixed viewport rendered inside it. Expose a typed hook for components to enqueue, update, and dismiss toasts. Keep state and timeout cleanup in the provider; use CSS modules and existing design tokens, with no new dependency.

The provider will support success, error, warning, information, and loading variants; optional action buttons; explicit dismissal; and optional deduplication keys. Loading entries remain until updated or dismissed. Success and information entries dismiss after about 4.5 seconds; warning and error entries remain longer, with a persistent option for messages that need it. Hovering or keyboard focus pauses the dismissal timer. A single viewport stacks entries without overlap and sits at the lower right on wide screens, matching the admin cards: a tinted panel with a hairline border, an accent rule on the leading edge and brand colours instead of generic status colours. On narrow screens it spans the width above the safe-area inset. Motion lasts about 200 ms and is disabled for reduced-motion preferences.

Use a polite live region for routine status and information, and an assertive alert announcement for important errors. Each notification includes a visible label and icon as well as its color, an accessible close button, adequate contrast and touch targets, and a stable announcement while it is visible. Do not steal focus when a toast appears.

## Interaction audit and integration

- **Admin review:** Replace the transient queue-level success message with a toast after a successful approval or rejection, including the current distinction when an answer publishes but the index refresh is deferred. Keep validation and request failures beside the affected item, where they remain actionable. Keep the existing confirmation dialog before rejection.
- **Project brief form:** Keep field validation, progress, and the confirmed save/email status inline. The current success text reports the actual API outcome and should not be repeated in a toast.
- **Booking:** Keep availability progress, slot conflicts, request errors, and the confirmed booking panel inline. The confirmation panel includes useful booking details and is more appropriate than a disappearing toast.
- **Clara chat:** Keep model, network, and degraded-mode messages in the chat conversation. A global toast would interrupt the chat flow and duplicate local status.
- **Navigation and visual selectors:** Do not emit toasts for route changes, menu toggles, or selecting/resetting the hero visualization; these actions already have direct visual feedback.
- **Other actions:** The audit found no copy, upload, download, subscription, or visitor account actions that need a toast today. The hook remains available for future operations when they are added.

## Verification design

Add focused unit/component coverage for each variant, update-in-place loading transitions, deduplication, close behavior, timeout pause/resume, timer cleanup, and accessible announcements. Add a browser-level check for the admin review success path and responsive viewport placement if it can be covered without changing external services. Then run the repository's relevant checks, including format, lint, typecheck, unit tests, browser tests, and build, subject to the existing local environment.

## Decisions and limitations

The project `AGENTS.md` identifies a Claude artifact as the decision source, but it was inaccessible through the available browser tool. This proposal therefore reflects the readable repository rules and code; compare it with that artifact before implementation if it contains a conflicting decision. The worktree already contains unrelated uncommitted changes in forms, admin UI, tests, and package files; those must be preserved and reviewed separately from this work.

## Review checklist

- [x] User approves the written design.
- [ ] Confirm no conflicting decision in the linked source-of-truth plan (the artifact was inaccessible).
- [x] Implement provider, viewport, and the approved integration points.
- [x] Verify implementation with focused and repository checks.
