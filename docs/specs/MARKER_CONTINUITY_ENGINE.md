**Status:** Marker continuity additive contract baseline (Packet 3 v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the additive Packet 3 comparison contract for deterministic file-local marker continuity.

The compare engine consumes explicit marker snapshots only.

## Truth Lock

Engine method truth is fixed to:

- `MarkerContinuityEngine.compare(previousSnapshot, currentSnapshot)`

Comparison posture is fixed to:

- file-local comparison only
- slash-family snapshots only
- deterministic ambiguity preservation
- no continuity-substrate reuse

## Boundary

This slice defines:

- snapshot-to-snapshot comparison
- exact continuity status vocabulary
- exact `MATCHED` flag vocabulary
- bootstrap posture when no previous snapshot is supplied
- ambiguity preservation rules

This slice does not define:

- `scan(files)` behavior
- required coverage policy semantics
- rename-aware continuity
- cross-file continuity
- git-history use
- hook/lifecycle behavior
- chain/board/continuity writes
- temporal, stale, trend, risk, or resolution semantics
- LLM interpretation

## Input Contract

`previousSnapshot`:

- either a valid Confidence marker snapshot
- or `null` for bootstrap-only comparison posture

`currentSnapshot`:

- a valid Confidence marker snapshot

Both non-null snapshots must:

- use `snapshotVersion: 1`
- use `markerFamily: slash`
- echo the existing Confidence scan fence

Marker-family mismatch must fail closed.

## Identity Rules

Marker identity is bounded to one normalized file path.

Identity evidence may use:

- normalized file path as a hard boundary
- stable context fingerprint as primary proof
- normalized trailing marker text as optional support
- line movement distance as a weak hint only
- tier as supporting, non-authoritative signal

Identity must not be keyed primarily by:

- domain grouping
- tier
- comment text alone
- semantic concern models
- rename-aware or cross-file logic

## Status Vocabulary

Allowed continuity change statuses:

- `MATCHED`
- `NEWLY_OBSERVED`
- `NO_LONGER_OBSERVED`

Allowed ambiguous status:

- `AMBIGUOUS`

`MATCHED` may carry only these flags:

- `moved`
- `retiered`

Forbidden status vocabulary includes:

- `RESOLVED`
- `STALE`
- `AGING`
- `PERSISTING_RISK`
- `FIXED`
- `IMPROVED`

## Bootstrap Rule

When `previousSnapshot` is `null`:

- comparison is bootstrap only
- no continuity claims are emitted
- `previousSnapshotVersion` is `null`
- `continuityChanges` is empty
- `ambiguousCases` is empty

## Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `comparisonVersion` | integer | Yes | Literal `1`. |
| `markerFamily` | string | Yes | Literal `slash`. |
| `previousSnapshotVersion` | integer or null | Yes | Previous snapshot version when present; otherwise `null`. |
| `currentSnapshotVersion` | integer | Yes | Current snapshot version. |
| `continuityChanges` | object[] | Yes | Deterministic non-ambiguous continuity outcomes only. |
| `ambiguousCases` | object[] | Yes | Deterministic ambiguous candidate sets only. |

`continuityChanges` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string | Yes | One of `MATCHED`, `NEWLY_OBSERVED`, or `NO_LONGER_OBSERVED`. |
| `filePath` | string | Yes | Normalized file path. |
| `flags` | string[] | No | Present only for `MATCHED`; uses only `moved` and `retiered`. |
| `previousMarker` | object | No | Present for `MATCHED` and `NO_LONGER_OBSERVED`. |
| `currentMarker` | object | No | Present for `MATCHED` and `NEWLY_OBSERVED`. |

`ambiguousCases` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string | Yes | Literal `AMBIGUOUS`. |
| `filePath` | string | Yes | Normalized file path. |
| `previousCandidates` | object[] | Yes | Plausible previous candidates. |
| `currentCandidates` | object[] | Yes | Plausible current candidates. |

Marker object shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `lineNumber` | integer | Yes | 1-based line number. |
| `tier` | string | Yes | One of `WATCH`, `GAP`, `HOLD`, or `KILL`. |
| `marker` | string | Yes | Exact slash marker run. |
| `slashCount` | integer | Yes | Exact slash count. |
| `trailingText` | string or null | Yes | Normalized trailing marker text when present; otherwise `null`. |

## Matching Rules

- exact same unique file-local anchor yields `MATCHED`
- same unique anchor with a different line number adds `moved`
- same unique anchor with a different tier adds `retiered`
- current-only markers become `NEWLY_OBSERVED`
- previous-only markers become `NO_LONGER_OBSERVED`
- path changes do not count as continuity

## Ambiguity Rules

- when one previous marker plausibly maps to multiple current markers, emit `AMBIGUOUS`
- when one current marker plausibly maps to multiple previous markers, emit `AMBIGUOUS`
- ambiguous markers must not also emit `NEWLY_OBSERVED` or `NO_LONGER_OBSERVED`
- line distance and tier must not break a tie that remains plausibly ambiguous

## Determinism Rules

- output ordering is deterministic
- repeated calls with the same input produce the same output
- repeated calls do not mutate input snapshots
- no hidden fuzzy logic is allowed

## No-Ship Boundaries

Do not ship any Packet 3 continuity change that:

- reuses `ContinuityLedger`
- writes to `ForensicChain`
- widens `ForemansWalk`
- introduces rename-aware or cross-file continuity
- introduces temporal, stale, or resolution semantics
- requires a file outside the approved structural fence

## Current Implementation Truth

- Runtime implementation lives at `src/MarkerContinuityEngine.js`.
- Golden proof lives at `tests/golden/MarkerContinuityEngine.golden.test.js`.
- Packet 3 architecture lock lives at `docs/specs/PACKET3_MARKER_CONTINUITY_TRUTH_LOCK.md`.
