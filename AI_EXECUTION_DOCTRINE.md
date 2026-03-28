# AI_EXECUTION_DOCTRINE.md
**Version:** 0.1  
**Status:** Operational

## Document Hierarchy

```text
TEAM_CHARTER.md           <- governing doctrine
AI_EXECUTION_DOCTRINE.md  <- execution field manual
docs/specs/*              <- canonical product/runtime specs
conversation context      <- ephemeral working context
```

If documents conflict, the higher item in this list wins. If canon is stale, update it or HOLD.

## Repo Map

```text
.
├── src/
├── tests/
│   ├── golden/
│   └── live/
├── docs/
│   ├── specs/
│   ├── indexes/
│   └── INDEX.md
├── raw/
│   ├── governed-workflow/
│   └── starters/
├── scripts/
├── README.md
├── CLAUDE.md
├── REPO_INDEX.md
├── TEAM_CHARTER.md
├── AI_EXECUTION_DOCTRINE.md
├── CONTRIBUTING.md
└── MIGRATIONS.md
```

`raw/` is reference-only. It does not define repo truth.

## Operating Rules

- Start with preflight for meaningful work.
- Produce a governed plan and wait for approval before implementation.
- Keep work inside the approved wave.
- Preserve evidence and do not invent missing runtime behavior.
- Treat contract changes as load-bearing.
- Keep README, CLAUDE, and navigation surfaces aligned with the work.

## Planning Gate

Before execution, provide:

- Goal
- In scope
- Anti-goals
- Truth sources
- Contracts touched
- Migration guard
- Acceptance criteria
- Constraints
- Risk scan
- Surface sync impact scan
- Wave-by-wave plan

Do not execute until the Architect approves the plan.

## Execution Rules

- Change only the files named in the approved wave.
- Stop if unexpected repo truth appears.
- Do not widen into non-goals.
- Do not claim compatibility paths, package surfaces, or runtime behavior unless they exist in the repo.
- Do not start implementation for future waves early.

## Verification Rules

Verification can include:

- git preflight checks
- file inspection
- spec-to-surface consistency checks
- test execution when code exists

If a required truth surface would be left stale, the wave is not complete.

## Contract And Migration Rules

When a shared contract changes:

1. explain the reason
2. define the exact shape change
3. define migration handling
4. define acceptance evidence
5. update `MIGRATIONS.md`

Bootstrap documentation and structure work does not require fake migration entries.

## HOLD Format

```text
HOLD: [summary]
Evidence: [what is known]
What's unknown: [specific gap]
Impact: [why guessing is risky]
Options:
1. [safe path]
2. [alternative]
3. [question]
Resolution: [what closes the HOLD]
```

## Closeout Format

Every governed execution closeout should include:

- Changes made
- Acceptance criteria status
- Remaining HOLDs
- Next actions
- Signoff status
