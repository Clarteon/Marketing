# Agent-neutral Clarteon kit

This directory holds the agent-neutral conversion of the Claude-native kit that lives in `.claude/`. The originals were not changed.

## What to load

- `../AGENTS.md` (repo root): project overview, stack, commands, working agreements, a rules index and the skill index. OpenCode, Codex and other agents that follow the `AGENTS.md` convention read it automatically.
- `.agents/rules/*.md`: the always-on rules. OpenCode loads them automatically through the `instructions` entry in `../opencode.json`. Other agents must read every file in this directory before starting work; `AGENTS.md` says so.
- `.agents/skills/<skill-id>/SKILL.md`: the converted playbooks. Each one keeps its `references/` files beside it, and paths inside a skill are relative to its own directory. OpenCode discovers this directory as a project skill source; other agents can read the files directly or be pointed at this folder.
- `.agents/skills/design-taste-frontend/`: the installed third-party tasteskill v2 design-review skill. Use it to critique layout, typography and motion with a real browser; it does not override the Clarteon brand rules, content honesty rules or security rules.

## Mapping

| Claude-native original | Agent-neutral copy |
| --- | --- |
| `CLAUDE.md` | `AGENTS.md` |
| `.claude/rules/*.md` | `.agents/rules/*.md`, loaded by `opencode.json` and indexed in `AGENTS.md` |
| `.claude/skills/<id>/SKILL.md` | `.agents/skills/<id>/SKILL.md` |
| `.claude/skills/<id>/references/*` | `.agents/skills/<id>/references/*` (unchanged) |

The conversion only changes how the guidance is loaded and referenced:

- Claude's `@.claude/rules/...` import lines became an `instructions` glob in `opencode.json`, so the same rule files load automatically.
- Rule references inside skills now point at the matching file in `.agents/rules/`.
- `CLAUDE.md` mentions became `AGENTS.md`.
- Skill IDs, descriptions, checklists and technical guidance are unchanged.

## Keeping the two in sync

`.claude/` stays the source kit for Claude Code. If a rule, skill or reference changes, update both copies in the same change. Do not delete either tree: some tools read one, some read the other, and agents that support both resolve duplicate skill IDs by source precedence, not by file content.

## Adding a rule or skill

For a rule, add the Markdown file to `.agents/rules/` and `.claude/rules/`, then add a row to the rules index in `AGENTS.md` and an `@` import line to `CLAUDE.md`.

For a skill, create `.agents/skills/<lowercase-kebab-id>/SKILL.md` with `name` and `description` frontmatter, then mirror it into `.claude/skills/` if Claude Code should see it too. Keep the description specific about when to use the skill, because it is the only text most agents see before deciding to load the playbook.
