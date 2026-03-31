---
name: keystone
description: "Render the deterministic keystone finding from existing Foreman's Walk output."
---

# /keystone

## Purpose

Render the single keystone finding from existing Foreman's Walk findings using a fixed deterministic rule.

## Input Source

- Use existing `ForemansWalk.evaluate(...)` output only.
- Keep finding values exactly as supplied.

## Render Path

1. Gather current Walk evaluation output.
2. Pass it to `KeystoneSkill.renderKeystone`.
3. Return deterministic route output.

## Selection Rule

- Select the first finding in source order among the highest existing severity present.
- If findings are empty, return deterministic clean/no-keystone output.

## Output Contract

Route output includes:

- `route`
- `keystone`
- `rationale`

`keystone` includes existing Walk finding fields only:

- `issueRef`
- `findingType`
- `severity`
- `pass`
- `summary`
- `evidenceRefs`

## Must Not

- alter runtime state
- alter Walk data
- add dependency analysis
- add ranking, weighting, scoring, or confidence fields
- add recommendation-engine behavior
- add any route beyond `/keystone`
