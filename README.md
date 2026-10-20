# Clarteon AI development kit: rules

This zip holds the always-on guidance for building the Clarteon website and the Clara chatbot with an AI coding agent. A second zip, `clarteon-skills.zip`, holds the step-by-step playbooks (skills) for each build phase.

## What is inside

- `CLAUDE.md`: project overview, stack, working agreements, and an index of rules and skills
- `ROADMAP.md`: the phased build plan with exit criteria
- `.claude/rules/`: short rule files the agent should always follow (brand and copy, security, privacy, Clara's behavior, free-tier limits, code conventions, sitemap and content)

## Install

1. Create the project repo.
2. Unzip `clarteon-rules.zip` at the repo root. This creates `CLAUDE.md`, `ROADMAP.md` and `.claude/rules/`.
3. Unzip `clarteon-skills.zip` at the repo root. This creates `.claude/skills/<skill-name>/SKILL.md`.
4. Start your agent in the repo. In Claude Code, `CLAUDE.md` loads automatically and skills load when a task matches their description.

Other agents: copy the contents of `CLAUDE.md` into that tool's instruction file (for example `AGENTS.md`) and keep the `.claude/rules/` files where the tool can read them.

## Rules versus skills

Rules are short and always apply. Skills are longer playbooks that the agent loads only when the task matches, such as "build the booking flow" or "run the Clara test script".

## Facts only humans can supply

Bracketed items like `[FOUNDER NAMES AND BIOS]`, `[CERTIFICATIONS]`, `[CONTACT EMAIL]` and `[LOCATION AND HOURS]` are placeholders. The agent must never invent them, and a build check must fail if any bracket placeholder reaches production.

## Dates and limits

Free-tier limits in these files were checked on October 20, 2026. Providers change limits often, so re-verify before launch.

Plan document: https://claude.ai/artifact/REhBN9Ebruj14D2VAmaZxZ
