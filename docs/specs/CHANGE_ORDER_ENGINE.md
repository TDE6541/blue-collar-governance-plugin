# CHANGE_ORDER_ENGINE.md
**Status:** Wave 4 Block B1 contract baseline
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 4 Block B1 contract baseline for `ChangeOrderEngine`.

`ChangeOrderEngine` is the formal live governance document flow for scope drift.

## Boundary

`ChangeOrderEngine` defines drift-sourced change-order creation, deterministic decision statuses, and deferred promotion mapping into existing continuity paths.

This spec does not define:

- auto-approval behavior
- auto-revert behavior
- board redesign or continuity redesign
- non-drift finding handling
- cost estimation or domain pricing logic
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Change Order`
- Internal build name: `ChangeOrderEngine`
- Core contract object: `ChangeOrder`

## Statuses

`status` must be one of:

- `APPROVED`
- `REJECTED`
- `DEFERRED`

## Drift-Only Source Rule

- Change orders may be generated only from `DRIFT` callouts.
- Non-drift callouts must be rejected deterministically.

## ChangeOrder Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `changeOrderId` | string | Yes | Stable change-order identifier. |
| `sessionId` | string | Yes | Session id where drift occurred. |
| `calloutType` | string | Yes | Must be `DRIFT`. |
| `calloutRef` | string | Yes | Source callout reference. |
| `summary` | string | Yes | Plain-language drift summary. |
| `requestedChange` | string | Yes | Requested scope/path adjustment. |
| `scopeBoundary` | string | Yes | Explicit boundary of requested adjustment. |
| `impactStatement` | string | Yes | Operator-readable impact statement. |
| `sourceRefs` | string[] | Yes | Source references for drift context. |
| `evidenceRefs` | string[] | Yes | Evidence references for drift context. |
| `status` | enum | Yes | `APPROVED`, `REJECTED`, or `DEFERRED`. |
| `decisionReason` | string | Yes | Decision rationale. |
| `decisionBy` | string | Yes | Decision actor. |
| `decidedAt` | string | Yes | Decision timestamp in ISO 8601 format. |
| `createdBy` | string | Yes | Actor creating the change-order document. |
| `createdAt` | string | Yes | Creation timestamp in ISO 8601 format. |

## Decision Outcome Rules

- `APPROVED`:
  - drifted path may continue
  - downstream accountability reflects approved change
  - no auto-revert
- `REJECTED`:
  - drifted path halts
  - no auto-revert
- `DEFERRED`:
  - drifted path pauses
  - change order promotes through existing continuity paths

## Deferred Continuity Promotion Mapping

Deferred decisions map to existing continuity semantics via:

- `entryType=operator_deferred_decision`
- continuity-compatible refs/evidence linkage
- no new continuity substrate

## Contract Invariants

- Change Order is formal live drift governance only.
- No auto-approve logic exists.
- No auto-revert logic exists.
- Continuity remains the only cross-session operational substrate.
- Open Items Board contract is not widened by this block.

## Current Implementation Truth

- This is a Block B1 spec baseline.
- Runtime implementation exists at `src/ChangeOrderEngine.js`.
- Golden proof exists at `tests/golden/ChangeOrderEngine.golden.test.js`.
