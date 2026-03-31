# KEYSTONE_SKILL.md
**Status:** Wave 5B post-diagnose read/query/render-only slice contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B contract baseline for `KeystoneSkill`.

The slice introduces one operator-facing route as a deterministic keystone-finding view:

- `/keystone`

## Boundary

`KeystoneSkill` defines:

- deterministic read/query/render output for one route
- route output over existing Foreman's Walk findings only
- deterministic source-order selection among highest existing severity labels

This spec does not define:

- any state mutation path
- any engine logic change
- any route beyond `/keystone`
- dependency analysis
- ranking, weighting, or scoring math
- confidence math
- recommendation or advisory behavior

## Public And Internal Names

- Public/operator-facing label: `Keystone Skill`
- Internal build name: `KeystoneSkill`
- Core route: `/keystone`

## Fixed Mapping Rule

- `/keystone` maps to existing `ForemansWalk` finding truth only.
- Route behavior remains read/query/render-only.
- Mapping reinterpretation is not allowed in this slice.

## Read/Query/Render-Only Posture

- The slice consumes existing Walk read truth only.
- The slice renders deterministic route views only.
- The slice introduces no hidden mutation behavior.
- The slice introduces no shared-contract widening.

## `/keystone`

Input includes one required field:

- `walkEvaluation`: object with existing Walk findings

`walkEvaluation` minimum shape:

- `findings`: object[] where each item contains `issueRef`, `findingType`, `severity`, `pass`, `summary`, `evidenceRefs`

Selection rule:

- choose the first finding in existing Walk source order among the highest existing severity present
- use existing severity labels only
- preserve source order for same-severity ties

Deterministic clean rule:

- when `findings` is empty, return a deterministic clean/no-keystone result

### `/keystone` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/keystone`. |
| `keystone` | object \| null | Yes | Selected finding object when present, otherwise `null` for clean/no-keystone. |
| `rationale` | string | Yes | Deterministic selection rationale. |

`keystone` object shape when present:

| Field | Type | Required | Description |
|---|---|---|---|
| `issueRef` | string | Yes | Existing Walk issue reference. |
| `findingType` | string | Yes | Existing Walk finding type. |
| `severity` | string | Yes | Existing Walk severity label. |
| `pass` | string | Yes | Existing Walk pass label. |
| `summary` | string | Yes | Existing Walk summary. |
| `evidenceRefs` | string[] | Yes | Existing Walk evidence refs. |

## Contract Invariants

- route set is fixed to exactly `/keystone`
- output is deterministic for same input
- input objects remain unchanged after rendering
- no dependency-analysis behavior is introduced
- no ranking/weighting/scoring behavior is introduced
- no hidden write path is introduced

## Current Implementation Truth

- Runtime adapter implementation exists at `src/KeystoneSkill.js`.
- Golden proof exists at `tests/golden/KeystoneSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/keystone-SKILL.md`.
