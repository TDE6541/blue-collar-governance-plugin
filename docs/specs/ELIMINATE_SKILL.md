# ELIMINATE_SKILL.md
**Status:** Wave 5B post-keystone read/query/render-only slice contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B contract baseline for `EliminateSkill`.

The slice introduces one operator-facing route as a read/query/render hold-route view:

- `/eliminate`

## Boundary

`EliminateSkill` defines:

- deterministic read/query/render output for one route
- route output over existing hold snapshot truth and existing derived scarcity truth
- direct `holdId` join only between supplied holds and supplied scarcity assessments
- explicit null scarcity rendering when no direct `holdId` match exists

This spec does not define:

- any state mutation path
- any new engine logic
- any route beyond `/eliminate`
- recommendation behavior
- ranking, weighting, or scoring behavior
- option-pruning behavior
- inferred scarcity behavior

## Public And Internal Names

- Public/operator-facing label: `Eliminate Skill`
- Internal build name: `EliminateSkill`
- Core route: `/eliminate`

## Fixed Mapping Rule

- `/eliminate` maps to existing `HoldEngine` snapshot truth and existing `HoldEngineScarcitySignal` report truth only.
- Route behavior remains read/query/render-only.
- Join behavior is exact `holdId` string match only.
- Mapping reinterpretation is not allowed in this slice.

## Read/Query/Render-Only Posture

- The slice consumes existing hold snapshot input only.
- The slice consumes existing scarcity report input only.
- The slice renders deterministic route views only.
- The slice introduces no hidden mutation behavior.
- The slice introduces no shared-contract widening.

## `/eliminate`

Input includes two required fields:

- `holdSnapshots`: object[] from existing Hold snapshot read truth
- `scarcityReport`: object with existing derived scarcity assessments

`holdSnapshots` minimum shape used by this route:

- `holdId`: string
- `summary`: string
- `status`: string
- `blocking`: boolean
- `reason`: string
- `impact`: string
- `evidence`: string[]
- `options`: string[]
- `resolutionPath`: string

`scarcityReport` minimum shape used by this route:

- `assessments`: object[] where each item contains:
  - `holdId`: string
  - `scarcityState`: string
  - `optionCount`: number
  - `rationale`: string

Route behavior:

- preserve source order from `holdSnapshots`
- render existing hold snapshot fields as supplied
- join scarcity by exact `holdId` match only
- if no scarcity match exists, render `scarcityAssessment: null`
- perform no fallback scarcity inference

Deterministic clean rule:

- when `holdSnapshots` is empty, return deterministic clean/no-eliminate output

### `/eliminate` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/eliminate`. |
| `holdCount` | integer | Yes | Count of supplied hold snapshots. |
| `holds` | object[] | Yes | Hold route rows rendered from supplied hold snapshots. |
| `renderNote` | string | Yes | Deterministic render note. |

`holds` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `holdId` | string | Yes | Existing hold id. |
| `summary` | string | Yes | Existing hold summary. |
| `status` | string | Yes | Existing hold status. |
| `blocking` | boolean | Yes | Existing hold blocking flag. |
| `reason` | string | Yes | Existing hold reason. |
| `impact` | string | Yes | Existing hold impact. |
| `evidence` | string[] | Yes | Existing hold evidence refs. |
| `options` | string[] | Yes | Existing hold options. |
| `resolutionPath` | string | Yes | Existing hold resolution path. |
| `scarcityAssessment` | object \| null | Yes | Existing scarcity assessment match by `holdId`, or `null` when no match exists. |

`scarcityAssessment` shape when present:

| Field | Type | Required | Description |
|---|---|---|---|
| `scarcityState` | string | Yes | Existing scarcity state from derived report. |
| `optionCount` | integer | Yes | Existing scarcity option count from derived report. |
| `rationale` | string | Yes | Existing scarcity rationale from derived report. |

## Contract Invariants

- route set is fixed to exactly `/eliminate`
- output is deterministic for same input
- input objects remain unchanged after rendering
- scarcity join is exact `holdId` match only
- missing scarcity match is rendered as `null`
- no recommendation, ranking, pruning, or scoring behavior is introduced
- no hidden write path is introduced

## Current Implementation Truth

- Runtime adapter implementation exists at `src/EliminateSkill.js`.
- Golden proof exists at `tests/golden/EliminateSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/eliminate/SKILL.md`.
