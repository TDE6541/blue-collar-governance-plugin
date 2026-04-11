**Status:** Confidence `/confidence` read/query/render-only baseline plus Packet 2 additive required coverage composition (v2)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the current contract baseline for `ConfidenceSkill`.

The slice introduces one operator-facing route as a read/query/render-only surface:

- `/confidence`

## Boundary

`ConfidenceSkill` defines:

- deterministic read/query/render output for one route
- canonical render over existing `ConfidenceGradientEngine.scan(...)` output
- exact tier totals
- file-by-file observed marker map
- observed-marker domain grouping
- deterministic top `HOLD` / `KILL` locations
- optional additive required coverage composition over existing `ConfidenceGradientEngine.evaluateRequiredCoverage(...)` output

This spec does not define:

- any state mutation path
- any new scan engine logic
- policy file reads from disk
- semicolon-family execution
- reviewed-clean semantics
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

- `/confidence` always maps the existing `ConfidenceGradientEngine.scan(...)` output as observed marker truth.
- When a caller explicitly supplies existing `ConfidenceGradientEngine.evaluateRequiredCoverage(...)` output, `/confidence` may compose it additively under a separate `requiredCoverage` section.
- No policy input means the route stays exact Packet 1 shape.
- The canonical route object is the first-class output.
- Mapping reinterpretation is not allowed in this slice.

## Read/Query/Render-Only Posture

- The slice consumes existing engine output only.
- The slice renders deterministic route views only.
- The slice introduces no hidden mutation behavior.
- The slice introduces no board or chain writes.
- The slice introduces no disk reads.
- The slice introduces no shared-contract widening beyond the approved additive route section.

## `/confidence`

Input includes one required field and one optional field:

- `confidenceGradientView`: object shaped as existing `ConfidenceGradientEngine.scan(...)` output
- `requiredCoverageView`: optional object shaped as existing `ConfidenceGradientEngine.evaluateRequiredCoverage(...)` output

Route behavior:

1. Read the existing scan report as observed marker truth.
2. Return the canonical route render first.
3. Surface exact tier totals.
4. Surface the file-by-file observed marker map.
5. Surface observed-marker domain grouping.
6. Surface deterministic top `HOLD` / `KILL` locations only.
7. When `requiredCoverageView` is supplied, attach it additively as separate required coverage truth.

`topHoldKillLocations` ordering is:

1. `KILL`
2. `HOLD`
3. file path ascending
4. line number ascending

## `/confidence` Output Contract

Packet 1 fields remain required:

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/confidence`. |
| `markerFamily` | string | Yes | Literal `slash`. |
| `tierTotals` | object | Yes | Exact totals for `WATCH`, `GAP`, `HOLD`, and `KILL`. |
| `fileMarkerMap` | object[] | Yes | File-by-file observed marker map copied from scan truth. |
| `domainGrouping` | object[] | Yes | Grouped observed-marker domain view copied from scan truth. |
| `topHoldKillLocations` | object[] | Yes | Deterministic `HOLD` / `KILL` location list only. |
| `requiredCoverage` | object | No | Additive required coverage section present only when `requiredCoverageView` is supplied. |

`topHoldKillLocations` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `filePath` | string | Yes | Marker-bearing file path. |
| `lineNumber` | integer | Yes | 1-based marker line number. |
| `tier` | string | Yes | `HOLD` or `KILL`. |
| `marker` | string | Yes | Exact slash marker run. |
| `domainId` | string | Yes | Deterministic file domain id. |
| `domainLabel` | string | Yes | Deterministic file domain label. |

`requiredCoverage` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `policyMode` | string | Yes | Literal `explicit_opt_in`. |
| `markerFamily` | string | Yes | Literal `slash`. |
| `targetCount` | integer | Yes | Raw policy target count. |
| `evaluatedTargetCount` | integer | Yes | Count of required-coverage targets actually evaluated against supplied scan input. |
| `findings` | object[] | Yes | Missing required coverage findings only. |
| `policyErrors` | object[] | Yes | Separate policy/input errors only. |

`requiredCoverage.findings` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | Yes | Literal `REQUIRED_COVERAGE_MISSING`. |
| `policyTargetId` | string | Yes | Required coverage target id. |
| `filePath` | string | Yes | Normalized target path. |
| `domain` | object | Yes | Deterministic file-path domain result. |
| `markerCount` | integer | Yes | Observed slash-family marker count for the target file. |
| `minimumMarkerCount` | integer | Yes | Literal `1`. |

`requiredCoverage.policyErrors` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | Yes | Approved policy error code only. |
| `policyTargetId` | string or null | Yes | Target id when addressable; otherwise `null`. |
| `filePath` | string or null | Yes | Normalized target path when addressable; otherwise `null`. |

## Composition Rules

- Existing Packet 1 fields remain the observed marker surface.
- Required coverage remains a distinct additive surface.
- Policy errors remain a distinct additive surface.
- The route must not imply reviewed-and-clean semantics.
- The route must not reinterpret required coverage findings as observed marker counts.
- No policy input means no `requiredCoverage` section.

## Contract Invariants

- route set is fixed to exactly `/confidence`
- output is deterministic for same input
- input objects remain unchanged after rendering
- canonical render remains primary
- no score is introduced
- no trend line is introduced
- no health percentage is introduced
- no reviewed-clean field is introduced
- no hidden write path is introduced
- no board or chain write path is introduced

## Current Implementation Truth

- Runtime adapter implementation exists at `src/ConfidenceSkill.js`.
- Golden proof exists at `tests/golden/ConfidenceSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/confidence/SKILL.md`.
- Required coverage policy contract is locked at `docs/specs/CONFIDENCE_REQUIRED_COVERAGE.md`.
