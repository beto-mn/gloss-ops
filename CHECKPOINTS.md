# CHECKPOINTS — Final state evaluation

> In multi-agent systems, you evaluate the destination, not the path.

## C1 — Harness is complete

- [ ] Core files exist: `AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md`
- [ ] Doc files exist: `docs/harness/architecture.md`, `docs/harness/conventions.md`, `docs/harness/verification.md`
- [ ] Agent definitions exist: `.claude/agents/leader.md`, `.claude/agents/implementer.md`, `.claude/agents/reviewer.md`
- [ ] `./init.sh` exits with code 0

## C2 — State is consistent

- [ ] At most one feature in `in_progress` in `feature_list.json`
- [ ] Every `done` feature has associated passing tests
- [ ] `progress/current.md` is empty or describes the active session

## C3 — Code respects the architecture

- [ ] `src/` only contains the modules described in `docs/harness/architecture.md`
- [ ] No loose debug prints or TODOs without context
- [ ] Repository pattern followed: `PrismaService` only in `infrastructure/`, interfaces only in services

## C4 — Verification is real

- [ ] At least one test per module in `src/`
- [ ] Tests use real in-memory resources (no Prisma or Redis mocks)
- [ ] Test command shows > 0 tests and all green
- [ ] Baseline: 596 API tests across 54 suites

## C5 — Session was closed properly

- [ ] `progress/history.md` has an entry for the last session
- [ ] The last feature worked on is in its correct status

## C6 — Spec Driven Development (OpenSpec)

- [ ] Every feature with `sdd: true` in status `spec_ready`, `in_progress`, or `done`
      has `openspec/changes/<name>/` with `proposal.md`, `design.md`, and `tasks.md`
- [ ] Every `done` feature with `sdd: true` has all tasks marked `[x]`
- [ ] `done` features have had `/opsx:sync` run — delta specs merged into `openspec/specs/`
- [ ] `done` features are in `openspec/changes/archive/YYYY-MM-DD-<name>/`
- [ ] `openspec/specs/` reflects the current state of the system
