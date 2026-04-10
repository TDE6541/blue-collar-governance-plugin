**Status:** Confidence Gradient Phase 1 read/query/render-only slice contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Phase 1 contract baseline for `ConfidenceSkill`.

The slice introduces one operator-facing route as a read/query/render-only surface:

- `/confidence`

## Boundary

`ConfidenceSkill` defines:

- deterministic read/query/render output for one route
- canonical render over existing `ConfidenceGradientEngine` output only
- tier totals
- file-by-file marker map
- domain grouping
- deterministic top `HOLD` / `KILL` locations

This spec does not define:

- any state mutation path
- any new scan engine logic
- semicolon-family execution
- score, trend-line, percentage, or governance-health output
- board writes
- chain writes
- lifecycle behavior
- hook-runtime integration
- any route beyond `/confidence`

## Public And Internal Names

- Public/operator-facing label: `Confidence Skill`
- Internal build name: `ConfidenceSkill`
- Core route: `/confidence`

## Fixed Mapping Rule

- `/confidence` maps to existing `ConfidenceGradientEngine.scan(...)` output only.
- The canonical route object is the first-class output.
- The skill may derive only route-local render structure from existing engine output.
- Mapping reinterpretation is not allowed in this slice.

## Read/Query/Render-Only Posture

- The slice consumes existing `ConfidenceGradientEngine` output only.
- The slice renders deterministic route views only.
- The slice introduces no hidden mutation behavior.
- The slice introduces no board or chain writes.
- The slice introduces no shared-contract widening.

## `/confidence`

Input includes one required field:

- `confidenceGradientView`: object shaped as existing `ConfidenceGradientEngine.scan(...)` output

Route behavior:

1. Read the existing engine report.
2. Return the canonical route render first.
3. Surface exact tier totals.
4. Surface the file-by-file marker map.
5. Surface domain grouping.
6. Surface deterministic top `HOLD` / `KILL` locations only.

`topHoldKillLocations` ordering is:

1. `KILL`
2. `HOLD`
3. file path ascending
4. line number ascending

### `/confidence` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/confidence`. |
| `markerFamily` | string | Yes | Literal `slash`. |
| `tierTotals` | object | Yes | Exact totals for `WATCH`, `GAP`, `HOLD`, and `KILL`. |
| `fileMarkerMap` | object[] | Yes | File-by-file marker map copied from engine truth. |
| `domainGrouping` | object[] | Yes | Grouped domain view copied from engine truth. |
| `topHoldKillLocations` | object[] | Yes | Deterministic `HOLD` / `KILL` location list only. |

`topHoldKillLocations` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `filePath` | string | Yes | Marker-bearing file path. |
| `lineNumber` | integer | Yes | 1-based marker line number. |
| `tier` | string | Yes | `HOLD` or `KILL`. |
| `marker` | string | Yes | Exact slash marker run. |
| `domainId` | string | Yes | Deterministic file domain id. |
| `domainLabel` | string | Yes | Deterministic file domain label. |

## Contract Invariants

- route set is fixed to exactly `/confidence`
- output is deterministic for same input
- input objects remain unchanged after rendering
- canonical render remains primary
- no score is introduced
- no trend line is introduced
- no health percentage is introduced
- no hidden write path is introduced
- no board or chain write path is introduced

## Current Implementation Truth

- Runtime adapter implementation exists at `src/ConfidenceSkill.js`.
- Golden proof exists at `tests/golden/ConfidenceSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/confidence/SKILL.md`.
