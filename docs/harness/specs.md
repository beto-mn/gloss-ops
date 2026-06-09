# Spec-Driven Development (SDD)

## Flow

```
pending → [/opsx:propose] → spec_ready → ⏸ HUMAN APPROVAL → in_progress → [/opsx:apply → /opsx:verify] → [/opsx:sync + /opsx:archive] → done
```

## OpenSpec Skills

| Skill                   | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `/opsx:explore [topic]` | Explore ideas before creating a change                           |
| `/opsx:propose [name]`  | Create change + all artifacts in one step                        |
| `/opsx:apply [name]`    | Implement tasks from the change                                  |
| `/opsx:verify [name]`   | Validate implementation (completeness + correctness + coherence) |
| `/opsx:sync [name]`     | Merge delta specs into `openspec/specs/`                         |
| `/opsx:archive [name]`  | Archive the completed change                                     |

## Change artifact structure

After `/opsx:propose`:

```
openspec/changes/<name>/
├── .openspec.yaml      # metadata
├── proposal.md         # what and why (scope, capabilities, impact)
├── specs/              # delta specs: ADDED/MODIFIED/REMOVED sections
│   └── *.md
├── design.md           # how (architectural decisions, non-goals, tradeoffs)
└── tasks.md            # implementation steps with checkboxes [ ]
```

## EARS Notation

Requirements use EARS (Easy Approach to Requirements Syntax):

```
[WHILE <pre-condition>] WHEN <trigger> THE SYSTEM SHALL <response>
```

Examples:

- `R1: WHEN the user submits the form THE SYSTEM SHALL validate all required fields`
- `R2: WHILE the session is active WHEN the token expires THE SYSTEM SHALL refresh it automatically`
- `R3: IF the file does not exist WHEN load() is called THE SYSTEM SHALL return an empty list`

Each requirement carries a unique `R<n>` identifier and must be verifiable with a test.

## Delta spec format

```markdown
# Spec: domain-name

## ADDED

### Requirement: [name]

[Description using MUST/SHALL/SHOULD — RFC 2119]

#### Scenario: Happy path

- WHEN [condition]
- THEN [expected result]
```

## Human approval gate

1. `/opsx:propose` completes → status changes to `spec_ready` → **PAUSE**
2. The human reads `openspec/changes/<name>/proposal.md` and `design.md`
3. Human responds "approved" or requests specific changes
4. Only then does the leader change status to `in_progress`

**Never skip this gate.** Even for "small" features.

## Closing a feature

1. All tasks `[x]` in `tasks.md`
2. `/opsx:verify <name>` — no CRITICAL issues
3. `/opsx:sync <name>` — delta specs merged into `openspec/specs/`
4. `/opsx:archive <name>` — change moved to `openspec/changes/archive/YYYY-MM-DD-<name>/`
5. Mark `done` in `feature_list.json`
