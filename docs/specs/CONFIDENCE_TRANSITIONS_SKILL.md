# CONFIDENCE_TRANSITIONS_SKILL.md
**Status:** Packet 6 `/confidence-transitions` authoring surface baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Packet 6 first-lane contract baseline for `ConfidenceTransitionsSkill`.

The slice introduces one dedicated operator-facing authoring surface:

- `/confidence-transitions`

## Boundary

`ConfidenceTransitionsSkill` defines:

- deterministic preview of append-ready transition entries from explicit compare input
- explicit operator-invoked append through existing `ForensicChain.appendEntry(...)` only
- generated transition entries constrained to existing `FINDING` type only

This spec does not define:

- any `/confidence` mutation path
- resolution semantics
- restoration semantics
- auto-append
- auto-resolution
- linked history traversal
- shared-contract widening

## Public And Internal Names

- Public/operator-facing label: `Confidence Transitions Skill`
- Internal build name: `ConfidenceTransitionsSkill`
- Core route: `/confidence-transitions`

## Fixed Mapping Rule

- `/confidence-transitions` maps explicit compare input through `generateConfidenceTransitionEntries(...)`.
- Generated entries are append-ready `ForensicChain` entry shapes only.
- Generated transitions are restricted to `NEWLY_OBSERVED`, `NO_LONGER_OBSERVED`, and `RETIERED`.
- `MATCHED` without retiered flag produces no generated entry.
- `AMBIGUOUS` produces no generated entry.
- Generated entries use `entryType: FINDING` only.

## Append Gate Rule

- Default behavior is preview only.
- Append behavior is allowed only when the operator explicitly requests append.
- Append behavior must call existing `ForensicChain.appendEntry(...)` as-is.
- No `ForensicChain` contract changes are allowed in this slice.

## `/confidence-transitions`

Input includes explicit compare and append-shape fields:

- `markerContinuityView`: object shaped as existing `MarkerContinuityEngine.compare(...)` output
- `sessionId`: string
- `recordedAt`: ISO 8601 string
- optional `entryIdPrefix`: string
- optional `sourceArtifact`: string
- optional `sourceLocationPrefix`: string
- optional `append`: boolean (defaults to `false`)
- optional `chain`: existing `ForensicChain` instance-like object used only when `append` is `true`

Route behavior:

1. Normalize explicit compare and append-shape input.
2. Generate append-ready entries through `generateConfidenceTransitionEntries(...)`.
3. Return preview output when `append` is not explicitly `true`.
4. Append generated entries only when `append` is explicitly `true`.

### `/confidence-transitions` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/confidence-transitions`. |
| `action` | string | Yes | `preview` or `append`. |
| `appendRequested` | boolean | Yes | Whether append was explicitly requested. |
| `generatedCount` | integer | Yes | Count of generated append-ready entries. |
| `generatedEntries` | object[] | Yes | Generated append-ready `ForensicChain` entry shapes. |
| `appendedCount` | integer | Yes | Count of entries appended in this call. |
| `appendedEntryIds` | string[] | Yes | Appended entry ids in append order; empty for preview. |

## Contract Invariants

- route set is fixed to exactly `/confidence-transitions`
- default path is preview-only
- append path requires explicit append request
- generated entries are `FINDING` only
- generated entries keep `linkedEntryRefs` as empty arrays in this slice
- input objects remain unchanged after rendering
- no `/confidence` mutation path is introduced
- no resolution or restoration semantics are introduced
- no shared-contract widening is introduced

## Current Implementation Truth

- Runtime adapter implementation exists at `src/ConfidenceTransitionsSkill.js`.
- Runtime generator implementation exists at `src/ConfidenceTransitionGenerator.js`.
- Golden proof exists at `tests/golden/ConfidenceTransitionsSkill.golden.test.js`.
- Golden proof exists at `tests/golden/ConfidenceTransitionGenerator.golden.test.js`.
- Operator-facing skill artifact exists at `skills/confidence-transitions/SKILL.md`.
