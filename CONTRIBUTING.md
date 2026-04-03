# Contributing

## Read First

Contributors are expected to orient to the canonical repo truth before making changes.

Read these files first:

1. `README.md`
2. `CLAUDE.md`
3. `TEAM_CHARTER.md`
4. `AI_EXECUTION_DOCTRINE.md`
5. `docs/specs/WAVE1_TRUST_KERNEL.md`
6. `MIGRATIONS.md`

## Working Rules

- Treat this repo as a runtime governance layer, not the methodology repo.
- Follow the governed flow: plan, approve, execute, verify, close out.
- Keep diffs minimal and scoped to the approved wave.
- Do not widen beyond the current approved scope without explicit approval.
- Do not leave stale front-door or navigation docs behind after behavior or spec changes.

## Contract Discipline

If a change touches a schema, interface, shared data shape, or other load-bearing contract:

1. State why the change is needed.
2. State exactly what changes.
3. Define the migration path or explain why none is needed.
4. Define verification evidence.
5. Log the change in `MIGRATIONS.md`.

Bootstrap-only documentation work does not get fake migration entries.

## Canon And Reference Boundaries

- Canon lives in the root governance files and promoted docs under `docs/specs/`.
- `raw/governed-workflow/` is reference material only.
- `raw/starters/` is starter/template material only.
- Do not treat reference or starter material as authoritative unless it has been promoted into canon.

## When Uncertain

Use `HOLD` instead of guessing:

```text
HOLD: [one-sentence summary]
Evidence: [what is known or missing]
Impact: [why guessing would be risky]
Options:
1. [safe path]
2. [alternative path]
3. [question to resolve]
Resolution: [what closes the HOLD]
```

## Commit Hygiene

- Keep one coherent change per commit.
- Do not bundle unrelated cleanup.
- Do not commit unverified scope expansion.
