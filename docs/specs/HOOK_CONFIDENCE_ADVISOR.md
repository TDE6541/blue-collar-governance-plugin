# HOOK_CONFIDENCE_ADVISOR.md
**Status:** Packet 7A ConfidenceAdvisor helper baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Packet 7A helper baseline for `ConfidenceAdvisor`.

`ConfidenceAdvisor` is a pure hook-side helper that surfaces presence-only advisory awareness for existing on-disk confidence markers already present in one file.

## Boundary

`ConfidenceAdvisor` defines:

- one deterministic helper entrypoint
- file-path-only input
- on-disk read of the current file only
- reuse of the existing Confidence Gradient slash-family parser rules
- reuse of the existing Confidence Gradient scan fence only
- structured internal advisory output for existing `HOLD` / `KILL` presence only

This spec does not define:

- tool-payload inspection
- future intended-content inference
- before/after diffing
- removal-awareness
- `WATCH` or `GAP` advisory output
- `/confidence` behavior
- `PostToolUse` behavior
- chain writes
- state writes
- host-facing schema changes
- operator-facing skill surfaces
- semicolon-family support

## Public And Internal Names

- Internal build name: `ConfidenceAdvisor`
- Helper entrypoint: `buildConfidenceAdvisory(filePath)`

No new public operator route is introduced in this lane.

## Input Contract

The helper accepts exactly one input:

- `filePath` - string path to one candidate file

The helper reads only the current on-disk contents of that file when the file is inside the existing confidence scan fence.

## Scan And Marker Lock

Marker family remains fixed to:

- `slash`

Reserved marker family remains:

- `semicolon`

ConfidenceAdvisor must reuse the current Confidence Gradient fence only:

- `src/`
- `hooks/`
- `scripts/`
- `.claude/`
- `*.js`

ConfidenceAdvisor must reuse the current Confidence Gradient parser rules only:

- line-leading markers only
- optional leading spaces/tabs allowed
- exact slash counts `3`, `4`, `5`, and `6` only
- marker run must be followed by space, tab, or end-of-line
- `/{7,}` is not a marker

## Advisory Trigger Lock

Advisory output is allowed only for existing on-disk:

- `HOLD`
- `KILL`

The following remain advisory-silent:

- no marker
- missing file
- unreadable file
- out-of-fence file
- `WATCH` only
- `GAP` only
- mixed `WATCH` / `GAP` without `HOLD` or `KILL`

## Output Contract

`buildConfidenceAdvisory(filePath)` returns a structured internal object:

| Field | Type | Required | Description |
|---|---|---|---|
| `markerFamily` | string | Yes | Literal `slash`. |
| `filePath` | string or null | Yes | Normalized echo of the input file path when available. |
| `present` | boolean | Yes | `true` only when on-disk `HOLD` or `KILL` markers are present. |
| `tierTotals` | object | Yes | Counts for `HOLD` and `KILL` only. |
| `markers` | object[] | Yes | `HOLD` / `KILL` markers only, in deterministic line order. |
| `summary` | string | Yes | Human-readable advisory fragment for existing message composition, or empty string when advisory is absent. |

`markers` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `lineNumber` | integer | Yes | 1-based marker line number. |
| `tier` | string | Yes | `HOLD` or `KILL`. |
| `marker` | string | Yes | Exact slash marker run. |
| `slashCount` | integer | Yes | Exact slash count (`5` or `6`). |

## Error Behavior

The helper must collapse the following to empty advisory rather than throw:

- missing file
- unreadable file
- out-of-fence file
- current-file read failure

This helper does not own hook governance decisions. Hook-runtime-local isolation of unexpected advisor failure is handled separately inside `handlePreToolUse`.

## Contract Invariants

- deterministic for the same on-disk file contents
- stateless
- reads at most one current on-disk file
- no fs writes
- no network calls
- no hook state mutation
- no decision mutation
- no marker-family widening
- no scan-fence widening

## Current Implementation Truth

- Runtime helper implementation exists at `src/ConfidenceAdvisor.js`.
- Golden proof exists at `tests/golden/ConfidenceAdvisor.golden.test.js`.
- Hook wiring truth lives at `src/HookRuntime.js`.
