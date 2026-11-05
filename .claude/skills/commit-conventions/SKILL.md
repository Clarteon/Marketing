---
name: commit-conventions
description: Standardize Git commit messages, pull request titles, and atomic commit grouping across all developers and AI coding agents. Use whenever staging changes, writing a commit message, amending a commit, or preparing a pull request.
---

# Commit conventions

Write every commit message in the same format so history stays readable across human developers and AI agents.

## Subject line format

Use Conventional Commits:

```text
<type>(<optional-scope>): <imperative summary>
```

### Rules for the subject line

1. **Type** (required, lowercase):
   - `feat`: new user-facing feature, page, case study, or capability
   - `fix`: bug fix, broken behavior fix, or regression fix
   - `docs`: documentation, rules, or agent skill updates only
   - `style`: visual or CSS adjustments and formatting that do not change logic
   - `refactor`: code restructuring that does not change external behavior
   - `perf`: performance, bundle size, or Core Web Vitals improvement
   - `test`: adding or updating unit, integration, or end-to-end tests
   - `build`: build scripts, dependencies, lockfiles, or bundler configuration
   - `ci`: GitHub Actions workflows or deployment pipelines
   - `chore`: maintenance, tooling, backups, or repository housekeeping
   - `revert`: reverting a previous commit
2. **Scope** (optional, lowercase noun in parentheses):
   - Name the area touched, such as `work`, `home`, `chat`, `booking`, `lead`, `seo`, `ui`, `content`, `skills`, `deps`.
   - Omit the scope when the change spans multiple areas.
3. **Summary** (required):
   - Start with a lowercase letter after `: ` (except proper nouns and acronyms like `Clara`, `Groq`, `Next.js`, `SEO`, `CSP`).
   - Use the imperative mood (`add`, `fix`, `remove`, `update`, not `added`, `adds`, or `adding`).
   - Keep the entire subject line at or under 72 characters.
   - Do not end the subject line with a period.

### Examples

```text
feat(work): add five client case studies and problem filter
fix(chat): keep booking slots when the current timezone is reselected
style(ui): match the booking highlight to the home hero marker
docs(skills): install humanizer and commit-conventions skills
build(deps): update lighthouse ci to 0.16.0
```

## Commit body

- Leave one blank line between the subject line and the body.
- Omit the body for small, self-explanatory changes where the subject line already states what changed and why.
- Include a short body (1 to 4 sentences, wrapped at 72 characters) when the reason, trade-off, or constraint is not obvious from the subject line.
- State what changed and why in plain prose. Do not paste a file-by-file diff list.
- Apply `humanizer` rules to the commit body: no *not-X-but-Y* staging, no em-dashes (`—`), no forced triads, and no stock AI vocabulary.

## Atomic commits and staging

- Stage specific files by path (`git add <file>...`) rather than blind `git add .` when unrelated or untracked files exist in the working tree.
- Keep each commit focused on one logical change. If a task includes both a tooling/skill update and a feature change, split them into separate commits.
- Run the project verification suite before pushing.

## Hard bans

- Never include `Co-Authored-By`, `Generated with`, `Assisted-by`, model names, or any AI/agent attribution in commit messages or pull requests.
- Never use vague subjects like `fix bug`, `update files`, `misc changes`, or `wip`.
