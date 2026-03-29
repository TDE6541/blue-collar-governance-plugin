# HOLD_ENGINE.md
**Status:** Proposed contract baseline  
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 1 contract baseline for `HoldEngine`. It covers the core Hold object, required fields, status lifecycle, and invariants for how a Hold is raised, confirmed, and closed.

## Boundary

`HoldEngine` defines Hold records and their lifecycle only.

This spec does not define:

- persistent never-do rules
- dangerous-action taxonomies
- asked-vs-done comparison logic
- session-start briefing structure
- session-receipt structure
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Holds`
- Internal build name: `HoldEngine`
- Core contract object: `Hold`

## Hold Object Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `holdId` | string | Yes | Stable identifier for the Hold record within the current trust context. |
| `summary` | string | Yes | Short operator-readable statement of what is uncertain or blocked. |
| `status` | enum | Yes | Lifecycle state. Must be one of `proposed`, `active`, `accepted`, `resolved`, or `dismissed`. |
| `blocking` | boolean | Yes | Whether work should stop until the Hold is explicitly handled. |
| `reason` | string | Yes | Why the Hold was raised. |
| `evidence` | string[] | Yes | Facts, repo truth, or explicit operator statements that support the Hold. |
| `impact` | string | Yes | What goes wrong if the Hold is ignored or guessed through. |
| `options` | string[] | Yes | Safe next paths visible to the operator. |
| `resolutionPath` | string | Yes | The action or evidence needed to close the Hold safely. |
| `createdBy` | enum | Yes | Actor that raised the Hold. Initial values: `architect` or `ai`. |
| `createdAt` | string | Yes | Timestamp in ISO 8601 format. |
| `scopeRef` | string | No | Session, wave, or artifact reference that locates where the Hold applies. |
| `updatedAt` | string | No | Latest lifecycle-change timestamp in ISO 8601 format. |
| `resolutionNotes` | string | No | Plain-language notes explaining how the Hold was closed or accepted. |
| `resolvedBy` | enum | No | Actor that closed or accepted the Hold. Initial values: `architect` or `ai`. |
| `resolvedAt` | string | No | Timestamp for the terminal lifecycle event in ISO 8601 format. |

## Status Lifecycle

| Status | Meaning | Terminal |
|---|---|---|
| `proposed` | A Hold has been raised but not yet confirmed as an active session condition. | No |
| `active` | The Hold is confirmed and currently constrains or blocks work. | No |
| `accepted` | The operator explicitly accepted the uncertainty or risk for the current scope. | Yes |
| `resolved` | The missing evidence arrived or the scope changed enough to close the Hold safely. | Yes |
| `dismissed` | The Hold is no longer applicable or was raised in error. | Yes |

## Lifecycle Rules

1. New Holds begin in `proposed`.
2. `proposed` may transition to `active` or `dismissed`.
3. `active` may transition to `accepted`, `resolved`, or `dismissed`.
4. Terminal statuses require `resolvedAt` and a plain-language `resolutionNotes` entry.
5. `accepted` may be used only when the operator explicitly accepts the uncertainty or risk for the current scope.
6. `resolved` may be used only when new evidence or a scope change removes the uncertainty.
7. Original evidence must not be silently overwritten when lifecycle fields change.

## Contract Invariants

- Every Hold must be operator-readable without code review.
- Every Hold must preserve evidence and impact in plain language.
- `blocking=true` means the current wave should stop until the Hold is handled or explicitly accepted.
- `blocking=false` means the Hold remains visible but does not stop the current wave.
- `holdId` must remain stable for the life of the Hold.
- Lifecycle changes must be append-minded: update status and resolution metadata without erasing the original reason or evidence.

## Example Hold

```json
{
  "holdId": "hold_wave1_001",
  "summary": "Need explicit approval before changing a protected surface",
  "status": "active",
  "blocking": true,
  "reason": "The requested change touches a sync-blocking canon surface outside the approved wave.",
  "evidence": [
    "Approved wave scope excludes that surface.",
    "CLAUDE.md marks stale sync surfaces as ship blockers."
  ],
  "impact": "Proceeding would create unauthorized change drift.",
  "options": [
    "Narrow the change to the approved files.",
    "Ask the Architect to widen the wave.",
    "Stop and carry the Hold forward."
  ],
  "resolutionPath": "Architect approval or scope reduction.",
  "createdBy": "ai",
  "createdAt": "2026-03-28T00:00:00Z",
  "scopeRef": "Wave 1"
}
```

## Current Implementation Truth

- This is a contract/spec artifact only.
- `HoldEngine` runtime implementation now exists at `src/HoldEngine.js` with golden coverage in `tests/golden/HoldEngine.golden.test.js`.
- Persistence, transport, and UI surfaces remain undefined at this stage.
