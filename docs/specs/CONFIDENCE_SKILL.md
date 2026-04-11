**Status:** Confidence `/confidence` read/query/render-only baseline plus Packet 2 required coverage, Packet 3 marker continuity, and Packet 4 temporal signals composition (v4)
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
- optional additive marker continuity composition over existing `MarkerContinuityEngine.compare(...)` output
- optional additive temporal signals composition over existing `MarkerTemporalSignalsEngine.evaluateTimeline(...)` output

This spec does not define:

- any state mutation path
- any new scan engine logic
- policy file reads from disk
- semicolon-family execution
- reviewed-clean semantics
- score, trend-line, percentage, or governance-health output at the route root
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

- `/confidence` always maps the existing `ConfidenceGradientEngine.scan(...)` output as current observed marker truth.
- When a caller explicitly supplies existing `ConfidenceGradientEngine.evaluateRequiredCoverage(...)` output, `/confidence` may compose it additively under a separate `requiredCoverage` section.
- When a caller explicitly supplies existing `MarkerContinuityEngine.compare(...)` output, `/confidence` may compose it additively under a separate `markerContinuity` section.
- When a caller explicitly supplies existing `MarkerTemporalSignalsEngine.evaluateTimeline(...)` output, `/confidence` may compose it additively under a separate `markerTemporalSignals` section.
- No policy input means the route stays exact Packet 1 shape unless continuity or temporal input is explicitly supplied.
- No continuity input means the route stays exact Packet 1/2 shape unless temporal input is explicitly supplied.
- No temporal input means the route stays exact Packet 1/2/3 shape.
- The canonical route object is the first-class output.
- Mapping reinterpretation is not allowed in this slice.

## Read/Query/Render-Only Posture

- The slice consumes existing engine output only.
- The slice renders deterministic route views only.
- The slice introduces no hidden mutation behavior.
- The slice introduces no board or chain writes.
- The slice introduces no disk reads.
- The slice introduces no shared-contract widening beyond the approved additive route sections.

## `/confidence`

Input includes one required field and three optional fields:

- `confidenceGradientView`: object shaped as existing `ConfidenceGradientEngine.scan(...)` output
- `requiredCoverageView`: optional object shaped as existing `ConfidenceGradientEngine.evaluateRequiredCoverage(...)` output
- `markerContinuityView`: optional object shaped as existing `MarkerContinuityEngine.compare(...)` output
- `markerTemporalSignalsView`: optional object shaped as existing `MarkerTemporalSignalsEngine.evaluateTimeline(...)` output

Route behavior:

1. Read the existing scan report as current observed marker truth.
2. Return the canonical route render first.
3. Surface exact tier totals.
4. Surface the file-by-file observed marker map.
5. Surface observed-marker domain grouping.
6. Surface deterministic top `HOLD` / `KILL` locations only.
7. When `requiredCoverageView` is supplied, attach it additively as separate required coverage truth.
8. When `markerContinuityView` is supplied, attach it additively as separate continuity-change truth.
9. When `markerTemporalSignalsView` is supplied, attach it additively as separate temporal-lineage truth.

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
| `markerContinuity` | object | No | Additive marker continuity section present only when `markerContinuityView` is supplied. |
| `markerTemporalSignals` | object | No | Additive temporal signals section present only when `markerTemporalSignalsView` is supplied. |

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

`markerContinuity` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `comparisonVersion` | integer | Yes | Literal `1`. |
| `markerFamily` | string | Yes | Literal `slash`. |
| `previousSnapshotVersion` | integer or null | Yes | Previous snapshot version when present; otherwise `null` for bootstrap-only posture. |
| `currentSnapshotVersion` | integer | Yes | Current snapshot version. |
| `continuityChanges` | object[] | Yes | Deterministic non-ambiguous continuity outcomes only. |
| `ambiguousCases` | object[] | Yes | Deterministic ambiguous candidate sets only. |

`markerTemporalSignals` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `temporalVersion` | integer | Yes | Literal `1`. |
| `markerFamily` | string | Yes | Literal `slash`. |
| `thresholds` | object | Yes | Echoed temporal thresholds. |
| `timeline` | object | Yes | Entry count plus earliest/latest observed timestamps. |
| `findings` | object[] | Yes | `STALE_HOLD` and `UNRESOLVED_KILL` only. |
| `errors` | object[] | Yes | Deterministic temporal error vocabulary only. |
| `trendSummary` | object or null | Yes | Bounded trend summary when temporal evaluation succeeds; otherwise `null`. |

## Composition Rules

- Existing Packet 1 fields remain the current scan surface.
- Required coverage remains a distinct additive surface.
- Marker continuity remains a distinct additive surface.
- Temporal signals remain a distinct additive surface.
- Ambiguous continuity cases remain separate from non-ambiguous continuity changes.
- Temporal lineage ambiguity remains separate from stronger temporal findings.
- The route must not imply reviewed-and-clean semantics.
- The route must not reinterpret required coverage findings as observed marker counts.
- The route must not reinterpret continuity ambiguity into stronger continuity claims.
- The route must not reinterpret temporal ambiguity into stronger age claims.
- Packet 2 required coverage and Packet 4 temporal signals must stay separate.
- No policy input means no `requiredCoverage` section.
- No continuity input means no `markerContinuity` section.
- No temporal input means no `markerTemporalSignals` section.

## Comparison And Temporal Render Rules

Comparison render language must stay bounded to:

- current scan
- continuity changes
- ambiguous cases
- observed
- moved
- retiered
- newly observed
- no longer observed
- ambiguous

Temporal render language must stay bounded to:

- explicit timeline
- thresholds used
- current-tier age
- stale hold
- unresolved kill
- bounded earliest-versus-latest trend summary
- deterministic temporal errors

Comparison and temporal render language must not introduce:

- reviewed-clean semantics
- standing-risk semantics
- score/trend-line/health language at the route root
- resolution/fixed/improved vocabulary
- Packet 2 policy dependency for temporal output

## Contract Invariants

- route set is fixed to exactly `/confidence`
- output is deterministic for same input
- input objects remain unchanged after rendering
- canonical current-scan render remains primary
- no score is introduced at the route root
- no hidden write path is introduced
- no board or chain write path is introduced
- no new public skill methods are introduced

## Current Implementation Truth

- Runtime adapter implementation exists at `src/ConfidenceSkill.js`.
- Golden proof exists at `tests/golden/ConfidenceSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/confidence/SKILL.md`.
- Required coverage policy contract is locked at `docs/specs/CONFIDENCE_REQUIRED_COVERAGE.md`.
- Marker continuity contract is locked at `docs/specs/MARKER_CONTINUITY_ENGINE.md`.
- Marker temporal signals contract is locked at `docs/specs/MARKER_TEMPORAL_SIGNALS_ENGINE.md`.
- Packet 4 architecture lock lives at `docs/specs/PACKET4_TEMPORAL_SIGNALS_TRUTH_LOCK.md`.
