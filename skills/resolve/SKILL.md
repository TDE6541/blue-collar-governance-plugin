---
name: resolve
description: "Record a deterministic restoration action from explicit finding identity and surface continuity-safe Board projection eligibility."
---

# /resolve

## Purpose

Use when you want to record a restoration outcome from explicit finding identity without creating a second restoration store.

## Input Source

- Use explicit restoration input only.
- Let `RestorationEngine.createRecord(...)` derive `findingRef`.
- For manual findings, require explicit `manualFindingKey`, `findingType`, `sourceArtifact`, and `sourceLocation`.
- Do not fall back to summary-only manual identity.

## Authoring Path

1. Gather explicit restoration input.
2. Pass it to `recordResolve(...)`.
3. If persistence is desired, append the returned record through an existing `ForensicChain` `OPERATOR_ACTION` entry only.
4. Surface the returned projection eligibility exactly as supplied.

## Output Contract

Route output includes:

- `route`
- `action`
- `record`
- `projectionEligibility`
- `chainEntryId`

## Must Not

- guess manual identity from free text
- mutate continuity directly
- write Board state directly
- create a hidden restoration ledger
- add new `ForensicChain` entry families
