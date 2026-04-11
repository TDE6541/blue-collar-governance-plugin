**Status:** Confidence Gradient Phase 1 scanner baseline plus Packet 2 required coverage and Packet 3 snapshot extension (v3)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the current contract baseline for `ConfidenceGradientEngine`.

`ConfidenceGradientEngine` now exposes three separate surfaces:

- `scan(files)`
- `buildSnapshot(files)`
- `evaluateRequiredCoverage(files, policy)`

`scan(files)` remains the frozen Phase 1 deterministic/stateless scanner over explicit file snapshots.

`buildSnapshot(files)` is a Packet 3 additive snapshot builder for later file-local marker comparison.

`evaluateRequiredCoverage(files, policy)` remains the Packet 2 additive evaluator that checks explicit policy targets against the same explicit file snapshots without mutating `scan(files)` truth.

## Boundary

`ConfidenceGradientEngine` defines:

- exact slash-family marker detection
- deterministic file filtering inside the approved scan fence only
- deterministic tier totals, file-by-file marker maps, and domain grouping
- additive explicit snapshot capture for Confidence-local marker identity
- additive required coverage evaluation over explicit file snapshots and explicit policy input only

This spec does not define:

- semicolon-family executable support
- scanning `docs/`, `skills/`, `tests/`, `raw/`, `.git/`, or `node_modules/`
- policy file reads from disk
- automatic snapshot persistence
- rename-aware or cross-file identity
- reviewed-clean semantics
- score, trend, percentage, or governance-health math
- chain writes
- board writes
- lifecycle behavior
- hook-runtime integration
- temporal logic, stale-marker aging, or cross-session continuity substrates
- heuristics, NLP, probabilistic filtering, or filesystem-presence proof

## Public And Internal Names

- Public/operator-facing label: `Confidence Gradient`
- Internal build name: `ConfidenceGradientEngine`
- Phase 1 scan report object: `ConfidenceGradientReport`
- Packet 3 snapshot object: `ConfidenceMarkerSnapshot`
- Packet 2 additive report object: `RequiredCoverageReport`

## Marker Family Posture

- Shipped marker family: `slash`
- Reserved future marker family: `semicolon`
- Semicolon-family markers are not executable in this baseline

## Exact Tier Ladder

| Marker | Tier |
|---|---|
| `///` | `WATCH` |
| `////` | `GAP` |
| `/////` | `HOLD` |
| `//////` | `KILL` |

`/{7,}` is not a marker in this baseline and must be treated as a structural divider / non-marker.

## Scan Fence

Confidence scan, snapshot capture, and required coverage evaluation are bounded to exactly:

- `src/`
- `hooks/`
- `scripts/`
- `.claude/`

Confidence scan and snapshot capture accept exactly one file type:

- `*.js`

Files outside those roots or outside that extension are outside the confidence scan fence.

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

Grouping rules are:

- use existing `ControlRodMode` domain ids, labels, and file-pattern vocabulary only
- treat grouping as file-path classification only
- do not mutate or wrap `ControlRodMode`
- do not reinterpret autonomy levels
- do not use catch-all file patterns such as `**/*` for file grouping
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
| `scanFence` | object | Yes | Exact scan roots and extension for this baseline. |
| `totals` | object | Yes | Deterministic scan totals. |
| `files` | object[] | Yes | Marker-bearing files only, in deterministic file-path order. |
| `domainGroups` | object[] | Yes | Deterministic grouped view over marker-bearing files only. |

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

## Packet 3 Snapshot Additive Layer

Packet 3 adds one separate snapshot surface:

- `buildSnapshot(files)`

It does not widen or mutate `scan(files)` output.

Snapshot capture rules are:

- explicit only
- versioned
- caller-managed
- deterministic
- scan-fence-scoped
- slash-only
- no disk reads
- no hidden writes

Snapshot contract details are locked at `docs/specs/CONFIDENCE_MARKER_SNAPSHOT.md`.

## Packet 2 Required Coverage Additive Layer

Packet 2 keeps one separate evaluator:

- `evaluateRequiredCoverage(files, policy)`

It does not widen or mutate `scan(files)` output.

Policy file location truth is repo-root only:

- `confidence-required-coverage.json`

The engine does not load that file from disk. Callers must supply the parsed policy object explicitly.

No policy file means no required coverage evaluation.

## `evaluateRequiredCoverage(files, policy)` Input Contract

- `files` uses the exact same explicit snapshot posture as `scan(files)`.
- `policy` must be an explicit object with `version: 1` and a `targets` array.
- Policy target file paths reuse the same path normalization semantics as confidence scanning.
- Policy grain is exact normalized `filePath` targets only.
- Coverage rule is exact and fixed: a target is covered when slash-family marker count is at least `1`.
- Semicolon-family content does not satisfy required coverage.

## `RequiredCoverageReport` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `policyMode` | string | Yes | Literal `explicit_opt_in`. |
| `markerFamily` | string | Yes | Literal `slash`. |
| `targetCount` | integer | Yes | Raw target count from the supplied policy. |
| `evaluatedTargetCount` | integer | Yes | Count of valid in-scan-input targets actually evaluated for coverage. |
| `findings` | object[] | Yes | Missing required coverage findings only. |
| `policyErrors` | object[] | Yes | Deterministic policy/input errors only. |

Approved policy error vocabulary:

- `POLICY_TARGET_INVALID`
- `POLICY_TARGET_DUPLICATE`
- `POLICY_TARGET_OUTSIDE_SCAN_FENCE`
- `POLICY_TARGET_NOT_IN_SCAN_INPUT`

Missing required coverage finding vocabulary:

- `REQUIRED_COVERAGE_MISSING`

Required coverage contract details are locked at `docs/specs/CONFIDENCE_REQUIRED_COVERAGE.md`.

## No-Ship Boundaries

Do not ship any change from this engine surface that:

- mutates `scan(files)` contract meaning
- reads the policy file from disk inside the engine
- widens the scan fence
- introduces automatic snapshot persistence
- introduces rename-aware or cross-file continuity
- introduces semicolon-family support
- introduces reviewed-clean language
- introduces score/trend/health math
- introduces hook/lifecycle/chain/board/temporal integration
- implies filesystem proof for `POLICY_TARGET_NOT_IN_SCAN_INPUT`

## Contract Invariants

- `ConfidenceGradientEngine` is deterministic for the same input.
- `ConfidenceGradientEngine` is stateless and pure over explicit file snapshots.
- `ConfidenceGradientEngine` performs no fs writes.
- `ConfidenceGradientEngine` introduces no global mutable state.
- Scan fence remains exactly `src/`, `hooks/`, `scripts/`, `.claude/`, `*.js`.
- `slash` is the only shipped marker family in this baseline.
- `semicolon` remains reserved only.
- `scan(files)` remains frozen for existing callers.
- Snapshot capture remains a separate additive surface and never a `scan(files)` mutation.
- Required coverage remains a separate report family and never a `scan(files)` mutation.
- No chain, lifecycle, runtime, or hook integration is introduced.

## Current Implementation Truth

- Runtime implementation exists at `src/ConfidenceGradientEngine.js`.
- Golden proof exists at `tests/golden/ConfidenceGradientEngine.golden.test.js`.
- Snapshot contract is further locked at `docs/specs/CONFIDENCE_MARKER_SNAPSHOT.md`.
- Required coverage policy contract is further locked at `docs/specs/CONFIDENCE_REQUIRED_COVERAGE.md`.
- Packet 3 architecture lock lives at `docs/specs/PACKET3_MARKER_CONTINUITY_TRUTH_LOCK.md`.
