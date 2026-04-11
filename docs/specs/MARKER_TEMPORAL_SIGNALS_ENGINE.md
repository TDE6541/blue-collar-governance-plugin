**Status:** Marker temporal signals additive contract baseline (Packet 4 v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the additive Packet 4 temporal contract for deterministic Confidence-local temporal interpretation over explicit dated snapshot timelines.

The temporal lane consumes explicit dated snapshot entries only.

## Truth Lock

Engine method truth is fixed to:

- `MarkerTemporalSignalsEngine.evaluateTimeline(timelineEntries, options)`

Temporal posture is fixed to:

- explicit dated timeline entries only
- slash-family Packet 3 snapshots only
- Packet 3 lineage rules as the age gate
- current-tier age only
- bounded trend summary only

## Boundary

This slice defines:

- dated timeline entry shape
- timeline validation rules
- temporal findings
- deterministic temporal error vocabulary
- current-tier age rules
- bounded trend summary

This slice does not define:

- `scan(files)` mutation
- `buildSnapshot(files)` mutation
- `compare(previousSnapshot, currentSnapshot)` mutation
- required coverage temporalization
- rename-aware continuity
- cross-file continuity
- standing-risk promotion
- resolution semantics
- score, priority, or health output
- hook/lifecycle behavior
- chain/board writes

## Timeline Input Contract

`timelineEntries` must be an array of explicit dated entries.

Each entry must include:

| Field | Type | Required | Description |
|---|---|---|---|
| `observedAt` | string | Yes | Explicit ISO 8601 UTC datetime for this snapshot. |
| `snapshot` | object | Yes | Explicit Packet 3 `ConfidenceMarkerSnapshot`. |

Timeline validation rules:

- minimum entry count is `2`
- `observedAt` must be a valid ISO 8601 UTC datetime
- order must be strictly increasing
- every snapshot must use `markerFamily: slash`
- every snapshot must echo the Packet 3 scan fence exactly

## Options Contract

`options` must be an explicit object with:

| Field | Type | Required | Description |
|---|---|---|---|
| `staleHoldDays` | integer | Yes | Non-negative threshold for `STALE_HOLD`. |
| `unresolvedKillDays` | integer | Yes | Non-negative threshold for `UNRESOLVED_KILL`. |

Thresholds are per evaluation only and must be echoed in output.

## Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `temporalVersion` | integer | Yes | Literal `1`. |
| `markerFamily` | string | Yes | Literal `slash`. |
| `thresholds` | object | Yes | Echo of evaluation thresholds. |
| `timeline` | object | Yes | Entry count plus earliest/latest observed timestamps when valid. |
| `findings` | object[] | Yes | Bounded temporal findings only. |
| `errors` | object[] | Yes | Deterministic timeline or lineage errors only. |
| `trendSummary` | object or null | Yes | Bounded trend summary when evaluation succeeds; otherwise `null`. |

`thresholds` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `staleHoldDays` | integer | Yes | Echoed threshold. |
| `unresolvedKillDays` | integer | Yes | Echoed threshold. |

`timeline` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `entryCount` | integer | Yes | Raw timeline entry count. |
| `earliestObservedAt` | string or null | Yes | Earliest observed timestamp when timeline timestamps validate; otherwise `null`. |
| `latestObservedAt` | string or null | Yes | Latest observed timestamp when timeline timestamps validate; otherwise `null`. |

## Finding Vocabulary

Allowed temporal finding codes:

- `STALE_HOLD`
- `UNRESOLVED_KILL`

Finding shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | Yes | Allowed temporal finding code only. |
| `filePath` | string | Yes | Current marker file path. |
| `currentMarker` | object | Yes | Current marker in the latest snapshot. |
| `currentTierEnteredAt` | string | Yes | Timestamp when this lineage last entered its current tier. |
| `observedAt` | string | Yes | Latest timeline timestamp. |
| `ageDays` | integer | Yes | Full elapsed days in the current tier. |
| `thresholdDays` | integer | Yes | Echoed threshold used for this finding. |

`currentMarker` uses the Packet 3 comparison-marker shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `lineNumber` | integer | Yes | 1-based line number. |
| `tier` | string | Yes | One of `WATCH`, `GAP`, `HOLD`, or `KILL`. |
| `marker` | string | Yes | Exact slash marker run. |
| `slashCount` | integer | Yes | Exact slash count. |
| `trailingText` | string or null | Yes | Normalized trailing marker text when present; otherwise `null`. |

## Error Vocabulary

Allowed error codes:

- `TIMELINE_TOO_SHORT`
- `TIMELINE_TIMESTAMP_INVALID`
- `TIMELINE_ORDER_INVALID`
- `TIMELINE_MARKER_FAMILY_MISMATCH`
- `TIMELINE_SCAN_FENCE_MISMATCH`
- `TEMPORAL_LINEAGE_AMBIGUOUS`

Error shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | Yes | Allowed error code only. |
| `details` | object | Yes | Deterministic details for the emitted error. |

Approved error detail keys by code:

- `TIMELINE_TIMESTAMP_INVALID`: `timelineIndex`, `observedAt`
- `TIMELINE_ORDER_INVALID`: `timelineIndex`, `previousObservedAt`, `currentObservedAt`
- `TIMELINE_MARKER_FAMILY_MISMATCH`: `timelineIndex`, `markerFamily`
- `TIMELINE_SCAN_FENCE_MISMATCH`: `timelineIndex`
- `TEMPORAL_LINEAGE_AMBIGUOUS`: `filePath`, `currentMarker`

## Age Rules

- Packet 4 evaluates only current markers from the latest snapshot.
- Packet 4 may age only `HOLD` and `KILL`.
- Age attaches only when same-tier lineage is proven unambiguously through Packet 3 comparison truth.
- Current-tier age starts when the lineage last entered the current tier.
- Retiering resets current-tier age.
- Movement does not reset current-tier age.
- If same-tier lineage is ambiguous, emit `TEMPORAL_LINEAGE_AMBIGUOUS` and do not emit a stronger finding.
- `UNRESOLVED_KILL` requires persisted current-tier lineage across at least two dated snapshots.
- `NO_LONGER_OBSERVED` remains trend-only and does not become resolved language.

## Trend Summary Contract

`trendSummary` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `earliestObservedAt` | string | Yes | Earliest valid observed timestamp. |
| `latestObservedAt` | string | Yes | Latest valid observed timestamp. |
| `earliestTierTotals` | object | Yes | Earliest snapshot tier totals. |
| `latestTierTotals` | object | Yes | Latest snapshot tier totals. |
| `netTierDeltas` | object | Yes | Latest minus earliest tier totals. |
| `continuityCounts` | object | Yes | Aggregated Packet 3 continuity counts across adjacent timeline pairs. |

`continuityCounts` keys are fixed to:

- `matched`
- `newlyObserved`
- `noLongerObserved`
- `moved`
- `retiered`
- `ambiguous`

## Required Coverage Boundary

- Packet 2 required coverage does not enter this engine.
- `REQUIRED_COVERAGE_MISSING` is excluded from temporal findings.
- Packet 4 temporal output is marker-lineage-only.

## No-Ship Boundaries

Do not ship any Packet 4 temporal change that:

- changes `scan(files)` meaning
- changes `buildSnapshot(files)` meaning
- changes `compare(previousSnapshot, currentSnapshot)` meaning
- infers time from git, filesystem, branch age, session date, or closeout date
- ages Packet 2 required coverage
- introduces rename-aware or cross-file continuity
- introduces standing-risk, resolution, score, priority, or health semantics
- requires a file outside the approved Packet 4 structural fence

## Current Implementation Truth

- Runtime implementation lives at `src/MarkerTemporalSignalsEngine.js`.
- Golden proof lives at `tests/golden/MarkerTemporalSignalsEngine.golden.test.js`.
- Packet 4 architecture lock lives at `docs/specs/PACKET4_TEMPORAL_SIGNALS_TRUTH_LOCK.md`.
