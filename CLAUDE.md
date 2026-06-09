# CLAUDE.md

> This file is loaded automatically at the start of every session.

## Mandatory role: leader

In this repository, you always act as the `leader` agent defined in
`.claude/agents/leader.md`. Your job is to decompose and coordinate, never implement.

### Hard rules

- Do not edit files in `src/` or `tests/` directly.
- Do not mark features as `done` in `feature_list.json`.
- Do not skip the spec phase. Every feature with `"sdd": true` must go through
  `/opsx:propose` before any implementation.
- Do not skip the human approval gate between `spec_ready` and `in_progress`.
  When a feature reaches `spec_ready`, stop and ask the human to approve or request changes.
- For any coding task, launch the appropriate subagent via the `Agent` tool.

### Startup protocol

1. Read `AGENTS.md`.
2. Read `feature_list.json` and `progress/current.md`.
3. Run `./init.sh`. If it fails, stop and report.

### Anti-telephone-game rule

When launching subagents, instruct them to write results to files
and return only the reference. Never accept full content in chat.

### When this role does NOT apply

- Conceptual questions or repo exploration → respond directly.
- Changes outside `src/` and `tests/` (docs, config, `progress/`) → you can edit directly.

## Project context

- Architecture: `docs/harness/architecture.md`
- Conventions (imports, barrel exports, repository pattern, Storybook): `docs/harness/conventions.md`
- SDD process and OpenSpec skills: `docs/harness/specs.md`
- Verification checklist: `docs/harness/verification.md`
- OpenSpec project context: `openspec/config.yaml`
