**Status:** Confidence marker snapshot additive contract baseline (Packet 3 v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the additive Packet 3 snapshot contract for Confidence marker identity comparison.

Snapshot capture is explicit, versioned, caller-managed, deterministic, and bounded to the existing Confidence scan fence.

It does not change `ConfidenceGradientEngine.scan(files)` meaning.

## Truth Lock

Engine method truth is fixed to:

- `ConfidenceGradientEngine.buildSnapshot(files)`

Snapshot posture is fixed to:

- marker family `slash`
- current scan fence only
- explicit file snapshots only
- no automatic persistence
- no hidden substrate writes

## Boundary

This slice defines:

- the additive snapshot method
- snapshot versioning
- scan-fence echo
- deterministic file ordering
- deterministic marker ordering
- per-marker anchor material for later file-local comparison

This slice does not define:

- `scan(files)` mutation
- required coverage policy semantics
- semicolon-family support
- disk persistence
- hook/lifecycle behavior
- chain/board/continuity writes
- rename-aware or cross-file identity
- temporal behavior

## Input Contract

`buildSnapshot(files)` uses the exact same explicit snapshot posture as `scan(files)`.

Each input file must include:

| Field | Type | Required | Description |
|---|---|---|---|
| `filePath` | string | Yes | Repo-relative or path-normalizable file path. |
| `content` | string | Yes | File contents to scan. |

The engine does not read from disk.

## Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `snapshotVersion` | integer | Yes | Literal `1`. |
| `markerFamily` | string | Yes | Literal `slash`. |
| `scanFence` | object | Yes | Exact scan fence echo. |
| `totals` | object | Yes | Deterministic scan totals copied from current scan truth. |
| `files` | object[] | Yes | Marker-bearing files only, in deterministic file-path order. |

`scanFence` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `roots` | string[] | Yes | Exact confidence scan roots. |
| `extension` | string | Yes | Literal `.js`. |

`totals` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `scannedFileCount` | integer | Yes | Count of files inside the scan fence. |
| `markerFileCount` | integer | Yes | Count of scan-fence files that contain at least one valid marker. |
| `markerCount` | integer | Yes | Count of all valid markers detected. |
| `tierTotals` | object | Yes | Exact totals for `WATCH`, `GAP`, `HOLD`, and `KILL`. |

`files` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `filePath` | string | Yes | Normalized file path. |
| `markerCount` | integer | Yes | Count of valid markers in the file. |
| `markers` | object[] | Yes | Valid markers in ascending line order. |

`markers` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `lineNumber` | integer | Yes | 1-based line number. |
| `tier` | string | Yes | One of `WATCH`, `GAP`, `HOLD`, or `KILL`. |
| `marker` | string | Yes | Exact marker run. |
| `slashCount` | integer | Yes | Exact slash count. |
| `trailingText` | string or null | Yes | Normalized trailing marker text when present; otherwise `null`. |
| `anchor` | object | Yes | File-local anchor material for later identity comparison. |

`anchor` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `contextFingerprint` | string | Yes | Deterministic structural-neighborhood fingerprint. |
| `neighborhoodLines` | string[] | Yes | Deterministic normalized nearby non-marker lines used to derive the fingerprint. |

## Identity Posture

Snapshot identity material is bounded to:

- normalized file path as the hard boundary
- stable `anchor.contextFingerprint` as the primary proof
- normalized `trailingText` as optional support
- existing line-local marker facts already present in Phase 1

Snapshot output must not introduce:

- domain-keyed identity
- comment-text-only identity
- rename-aware logic
- cross-file identity

## Determinism Rules

- file ordering is path-ascending
- marker ordering is ascending line order
- the same input produces the same snapshot
- repeated calls do not mutate inputs
- repeated calls do not mutate previous outputs

## No-Ship Boundaries

Do not ship any Packet 3 snapshot change that:

- mutates `scan(files)` meaning
- widens the scan fence
- widens marker families
- persists snapshots automatically
- writes to continuity/chain/board/hook/lifecycle substrates
- introduces temporal or cross-file semantics

## Current Implementation Truth

- Runtime implementation lives at `src/ConfidenceGradientEngine.js`.
- Golden proof lives at `tests/golden/ConfidenceGradientEngine.golden.test.js`.
- Packet 3 architecture lock lives at `docs/specs/PACKET3_MARKER_CONTINUITY_TRUTH_LOCK.md`.
