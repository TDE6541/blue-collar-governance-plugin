**Status:** Confidence Gradient Phase 1 contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Phase 1 contract baseline for `ConfidenceGradientEngine`.

`ConfidenceGradientEngine` is a deterministic, stateless scanner that reads explicit file snapshots and reports line-leading confidence markers inside the approved Phase 1 scan fence.

## Boundary

`ConfidenceGradientEngine` defines:

- exact slash-family marker detection
- deterministic file filtering inside the approved scan fence only
- deterministic tier totals, file-by-file marker maps, and domain grouping
- read-only grouping vocabulary derived from existing `ControlRodMode` truth

This spec does not define:

- semicolon-family executable support
- scanning `docs/`, `skills/`, `tests/`, `raw/`, `.git/`, or `node_modules/`
- chain writes
- board writes
- lifecycle behavior
- hook-runtime integration
- temporal logic, stale-marker aging, or cross-session identity
- heuristics, NLP, probabilistic filtering, or content scoring
- trend lines, health percentages, or governance-health math

## Public And Internal Names

- Public/operator-facing label: `Confidence Gradient`
- Internal build name: `ConfidenceGradientEngine`
- Core contract object: `ConfidenceGradientReport`

## Marker Family Posture

- Shipped marker family: `slash`
- Reserved future marker family: `semicolon`
- Semicolon-family markers are not executable in Phase 1

## Exact Tier Ladder

| Marker | Tier |
|---|---|
| `///` | `WATCH` |
| `////` | `GAP` |
| `/////` | `HOLD` |
| `//////` | `KILL` |

`/{7,}` is not a marker in Phase 1 and must be treated as a structural divider / non-marker.

## Scan Fence

Phase 1 scans exactly:

- `src/`
- `hooks/`
- `scripts/`
- `.claude/`

Phase 1 scans exactly one file type:

- `*.js`

Files outside those roots or outside that extension are not scanned in this phase.

## Parser Rules

- Marker detection is line-leading only.
- Optional leading spaces or tabs are allowed before the marker run.
- Only exact slash counts `3`, `4`, `5`, and `6` are valid markers.
- The marker run must be followed by a space, a tab, or end-of-line.
- `///foo` is a non-marker.
- Mid-line slash runs are non-markers.
- `/{7,}` is a non-marker divider.
- Parsing is deterministic and stateless.
- No heuristics, NLP, temporal logic, or probabilistic filtering are allowed.

## Control Rod Grouping Posture

Domain grouping remains read-only and uses a frozen read from existing `ControlRodMode` truth through `require()`.

Phase 1 grouping rules are:

- use existing `ControlRodMode` domain ids, labels, and file-pattern vocabulary only
- treat grouping as file-path classification only
- do not mutate or wrap `ControlRodMode`
- do not reinterpret autonomy levels
- do not use catch-all file patterns such as `**/*` for file grouping in this phase
- route unmatched files to `unclassified`

Domain-group ordering follows the surviving `ControlRodMode` baseline order, with `unclassified` last when present.

## `scan(files)` Input Contract

`files` must be an array of explicit file snapshot objects.

Each file snapshot must include:

| Field | Type | Required | Description |
|---|---|---|---|
| `filePath` | string | Yes | Repo-relative or path-normalizable file path. |
| `content` | string | Yes | File contents to scan. |

The engine does not read from disk. It scans only the provided file snapshots.

## `ConfidenceGradientReport` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `markerFamily` | string | Yes | Literal `slash`. |
| `reservedMarkerFamily` | string | Yes | Literal `semicolon`. |
| `scanFence` | object | Yes | Exact scan roots and extension for this phase. |
| `totals` | object | Yes | Deterministic scan totals. |
| `files` | object[] | Yes | Marker-bearing files only, in deterministic file-path order. |
| `domainGroups` | object[] | Yes | Deterministic grouped view over marker-bearing files only. |

`scanFence` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `roots` | string[] | Yes | Exact Phase 1 scan roots. |
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
| `domain` | object | Yes | Deterministic domain grouping result for the file. |
| `markerCount` | integer | Yes | Count of valid markers in the file. |
| `tierTotals` | object | Yes | File-local totals for `WATCH`, `GAP`, `HOLD`, and `KILL`. |
| `markers` | object[] | Yes | Valid markers in ascending line order. |

`markers` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `lineNumber` | integer | Yes | 1-based line number. |
| `tier` | string | Yes | One of `WATCH`, `GAP`, `HOLD`, or `KILL`. |
| `marker` | string | Yes | Exact marker run (`///`, `////`, `/////`, or `//////`). |
| `slashCount` | integer | Yes | Exact slash count (`3`, `4`, `5`, or `6`). |

`domainGroups` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `domainId` | string | Yes | Group identifier from existing `ControlRodMode` truth or `unclassified`. |
| `label` | string | Yes | Operator-readable group label. |
| `fileCount` | integer | Yes | Count of marker-bearing files in the group. |
| `markerCount` | integer | Yes | Count of markers in the group. |
| `tierTotals` | object | Yes | Group-local totals for `WATCH`, `GAP`, `HOLD`, and `KILL`. |
| `filePaths` | string[] | Yes | Marker-bearing file paths in deterministic order. |

## Contract Invariants

- `ConfidenceGradientEngine` is deterministic for the same input.
- `ConfidenceGradientEngine` is stateless and pure over explicit file snapshots.
- `ConfidenceGradientEngine` performs no fs writes.
- `ConfidenceGradientEngine` introduces no global mutable state.
- Scan fence remains exactly `src/`, `hooks/`, `scripts/`, `.claude/`, `*.js`.
- `slash` is the only shipped marker family in Phase 1.
- `semicolon` remains reserved only.
- No chain, lifecycle, runtime, or hook integration is introduced.

## Current Implementation Truth

- Runtime implementation exists at `src/ConfidenceGradientEngine.js`.
- Golden proof exists at `tests/golden/ConfidenceGradientEngine.golden.test.js`.
