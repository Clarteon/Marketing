# Local Safe-Change Guard Skill

- Objective: Create a globally discoverable local Codex skill that prevents unapproved backend changes and makes cross-component impact, verification, and failure risks visible before implementation.
- Created: 2026-10-23 15:45:33 +08:00 (Asia/Manila)
- Last updated: 2026-10-23 16:15:32 +08:00 (Asia/Manila)
- Status: Complete.

## Steps

- [x] Inspect the skill-writing guidance, local hook configuration, and repository guardrails.
- [x] Create `safe-change-guard` under the local Codex skills directory, keeping automatic discovery enabled.
- [x] Define a pre-change approval gate for backend edits and clear impact explanations, including affected consumers, pages, data/security boundaries, validation, and rollback.
- [x] Define scoped approval, no silent behavior changes, and disclosure expectations; leave hook config unchanged.
- [x] Review the skill files and metadata.
- [x] Copy the skill entrypoint into this project’s `.agents/skills` folder.
- [x] Commit and push only the project skill and this plan to `main`.

## Notes

- 2026-10-23 15:45:33 +08:00 (Asia/Manila): Existing global hooks are configured for Discord presence across many Codex lifecycle events. A focused skill is the lower-risk fit for this request; no hook config changes are proposed.
- 2026-10-23 15:48:00 +08:00 (Asia/Manila): User approved the design. Installed the skill in `C:\Users\Windows 11\.codex\skills\safe-change-guard`.
- 2026-10-23 15:51:53 +08:00 (Asia/Manila): Manually reviewed the skill instructions and generated UI metadata. The bundled validator could not run because the host Python lacks `PyYAML`; no package was installed. The required frontmatter and metadata were visually checked.
- 2026-10-23 15:54:01 +08:00 (Asia/Manila): The initial project-folder write was denied by the workspace sandbox; the authorized elevated retry created `.agents/skills/safe-change-guard/SKILL.md`. Source and project copies have matching SHA-256 hashes. No hook configuration or unrelated project files were changed.
- 2026-10-23 16:14:24 +08:00 (Asia/Manila): Confirmed the checkout is `main` and `origin/main` is at the current commit. The existing modification to `src/lib/knowledge/generated/index.json` and another untracked plan were excluded from the push.
- 2026-10-23 16:15:32 +08:00 (Asia/Manila): Commit `a7ffd681a2f92c21d0290f22f282db81e7d38283` was pushed to `origin/main`; local `main` and `origin/main` matched afterward.
