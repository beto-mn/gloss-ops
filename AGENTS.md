# AGENTS.md — Navigation map for AI agents

> This file is the entry point for any agent working in this repository.
> Read only what you need, when you need it.

## 1. Before starting (mandatory)

1. Run `./init.sh` and verify it exits without errors.
2. Read `progress/current.md` to understand the state of the last session.
3. Read `feature_list.json`.
4. Read `docs/harness/specs.md` before touching any spec or feature with `sdd: true`.

## 2. Repository map

| File / folder                  | Contents                                                    | When to read             |
| ------------------------------ | ----------------------------------------------------------- | ------------------------ |
| `feature_list.json`            | Feature list with statuses                                  | Always, at startup       |
| `progress/current.md`          | Active session state                                        | Always, at startup       |
| `progress/history.md`          | Log of closed sessions                                      | If you need context      |
| `openspec/changes/<name>/`     | Active change (proposal, design, tasks)                     | Before implementing      |
| `openspec/specs/`              | Stable system specs (living docs)                           | To understand the system |
| `openspec/config.yaml`         | Project context injected into all specs                     | Before writing specs     |
| `docs/harness/architecture.md` | Monorepo structure, domain model, multi-tenancy rules       | Before implementing      |
| `docs/harness/conventions.md`  | Import tiers, barrel exports, repository pattern, Storybook | Before writing code      |
| `docs/harness/specs.md`        | SDD process: EARS notation, OpenSpec skills, approval gate  | Before drafting a spec   |
| `docs/harness/verification.md` | How to verify your work before declaring done               | Before declaring done    |
| `CHECKPOINTS.md`               | Objective criteria for a healthy harness (C1–C6)            | For self-evaluation      |
| `.claude/agents/`              | Subagent definitions                                        | If you orchestrate work  |

## 3. Hard rules (non-negotiable)

- **One feature at a time.** Do not mix changes from multiple features.
- **No `done` without green tests.** Run `./init.sh` first.
- **Never skip the spec phase.** Every feature with `"sdd": true` goes through `/opsx:propose` and gets human approval before touching code.
- **Document in `progress/current.md`** while you work, not at the end.
- **If you don't know something, check `docs/`** before inventing it.

## 4. SDD Flow (OpenSpec)

```
pending → [/opsx:propose] → spec_ready → ⏸ HUMAN → in_progress → [/opsx:apply → /opsx:verify] → [/opsx:sync + /opsx:archive] → done
```

1. The leader detects the first `pending` feature with `"sdd": true`.
2. The leader runs `/opsx:propose <name>`, which creates `openspec/changes/<name>/` with all artifacts and marks status as `spec_ready`.
3. **Pause.** The human reads the change and approves (or requests changes).
4. Once approved, the leader changes status to `in_progress` and launches the `implementer` subagent (or `/opsx:apply`).
5. The implementer executes `tasks.md` one by one, marking them `[x]`.
6. The reviewer (or `/opsx:verify`) checks traceability and task completeness.
7. If approved: `/opsx:sync`, `/opsx:archive`, mark `done`.

## 5. Session close

1. Run `./init.sh` — all green.
2. If the task is finished: mark `status: "done"` in `feature_list.json`.
3. Move the summary from `progress/current.md` to the end of `progress/history.md`.
4. Clear `progress/current.md` leaving only the template.
5. No temporary files or debug prints left behind.
