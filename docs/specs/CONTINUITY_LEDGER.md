# CONTINUITY_LEDGER.md
**Status:** Proposed contract baseline  
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 2 Block A contract baseline for `ContinuityLedger`.

It persists cross-session continuity truth for unresolved, still-relevant items that must survive closeout.

## Boundary

`ContinuityLedger` defines continuity qualification, persistence, carry-forward aging, and operator outcome handling.

This spec does not define:

- standing-risk scoring or derivation
- omission coverage analysis
- board grouping or board presentation
- watcher or anomaly metadata
- adaptive trust or autonomy logic
- rights or warranty policy layers
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Continuity Ledger`
- Internal build name: `ContinuityLedger`
- Core contract object: `ContinuityEntry`

## Qualifying Entry Types

`entryType` must be one of:

- `hold`
- `blocked_operation`
- `operator_deferred_decision`
- `omission_finding`

## Non-Qualifying Exclusions

Entries must be rejected when classified as:

- `rejected_unauthorized_change`
- `dismissed_false_positive`
- `informational_note`
- `completed_closed_event`

## ContinuityEntry Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `entryId` | string | Yes | Stable identifier for the continuity entry. |
| `entryType` | enum | Yes | Must be one of `hold`, `blocked_operation`, `operator_deferred_decision`, or `omission_finding`. |
| `summary` | string | Yes | Operator-readable continuity summary. |
| `originSessionId` | string | Yes | Session identifier where the continuity item originated. |
| `lastSeenSessionId` | string | Yes | Most recent session identifier where the entry remained unresolved and relevant. |
| `sessionCount` | integer | Yes | Number of distinct session contexts in which the unresolved entry has persisted. |
| `carryCount` | integer | Yes | Number of carry-forward transitions for the entry. |
| `sourceRefs` | string[] | Yes | Source artifact references such as hold/evaluation/receipt ids. |
| `evidenceRefs` | string[] | No | Supporting evidence references. |
| `operationClass` | enum | No | Required when `entryType=blocked_operation`; must be `protected` or `destructive`. |
| `stillRelevant` | boolean | No | Required when `entryType=blocked_operation`; must be `true` to persist. |
| `operatorOutcome` | enum | No | Optional terminal outcome: `resolve`, `dismiss`, or `explicitly_accept`. |
| `createdBy` | enum | Yes | Actor that created the entry. Initial values: `architect` or `ai`. |
| `createdAt` | string | Yes | Timestamp in ISO 8601 format. |
| `updatedAt` | string | No | Latest mutation timestamp in ISO 8601 format. |
| `resolvedAt` | string | No | Terminal outcome timestamp in ISO 8601 format when `operatorOutcome` is set. |
| `notes` | string | No | Plain-language maintenance notes. |

## Aging Model

Aging is session-count and carry-count based:

- `sessionCount` increments when an unresolved entry is observed in a new session id.
- `carryCount` increments with each unresolved carry-forward transition.
- Wall-clock age is not used as Block A age state.

## Operator Outcome Rules

`operatorOutcome` is constrained to:

- `resolve`
- `dismiss`
- `explicitly_accept`

When a terminal outcome is recorded, the entry is no longer carry-forward eligible.

## Ingestion Rules

1. New entries must be unresolved and qualifying.
2. `blocked_operation` entries must be both still relevant and explicitly classified as `protected` or `destructive`.
3. Non-qualifying exclusions must be rejected and not persisted.
4. Junk-drawer fields from other layers (for example standing-risk scores or board-grouping metadata) must be rejected.

## Contract Invariants

- Continuity persistence remains bounded to unresolved, still-relevant entries only.
- `sessionCount` and `carryCount` must be monotonically non-decreasing.
- Source and evidence linkage must remain visible and append-minded.
- Terminal outcomes stop carry-forward behavior for that entry.

## Example ContinuityEntry

```json
{
  "entryId": "continuity_hold_001",
  "entryType": "hold",
  "summary": "Protected file change remains blocked pending explicit authorization.",
  "originSessionId": "wave2_s01",
  "lastSeenSessionId": "wave2_s03",
  "sessionCount": 3,
  "carryCount": 2,
  "sourceRefs": [
    "hold_live_001",
    "receipt_intervention"
  ],
  "evidenceRefs": [
    "tests/live/wave1.operator-flow.live.test.js"
  ],
  "createdBy": "ai",
  "createdAt": "2026-03-29T15:00:00Z",
  "updatedAt": "2026-03-29T16:00:00Z"
}
```

## Current Implementation Truth

- This is a contract/spec artifact.
- `ContinuityLedger` runtime implementation exists at `src/ContinuityLedger.js`.
- Golden proof for this contract exists at `tests/golden/ContinuityLedger.golden.test.js`.
