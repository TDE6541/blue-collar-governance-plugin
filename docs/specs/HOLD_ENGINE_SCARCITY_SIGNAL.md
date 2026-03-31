# HOLD_ENGINE_SCARCITY_SIGNAL.md
**Status:** Wave 5A Block C contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5A Block C contract baseline for `HoldEngineScarcitySignal`.

`HoldEngineScarcitySignal` is an additive, derived-only enrichment layer that evaluates scarcity pressure from existing Hold snapshots. It does not widen the shared `HoldEngine` contract and does not introduce a persistence substrate.

## Boundary

`HoldEngineScarcitySignal` defines:

- deterministic scarcity-state derivation from hold snapshots
- explicit aggregate scarcity summary for a point-in-time evaluation
- per-hold scarcity assessment objects

This spec does not define:

- changes to `HoldEngine` lifecycle, fields, or transitions
- SessionBrief schema changes
- Control Rod enum/profile changes
- Operator Trust Ledger or Journeyman Trust Engine changes
- Warranty substrate behavior
- skills, skins, onboarding, package, install, runtime-hook, compatibility, or marketplace behavior
- telemetry, phone-home, external API, account-required, or payment-gate behavior
- scarcity persistence store, ledger, registry, or writeback path

## Public And Internal Names

- Public/operator-facing label: `Scarcity Signal`
- Internal build name: `HoldEngineScarcitySignal`
- Core report object: `ScarcitySignalReport`

## Derived-Only Posture

- `HoldEngineScarcitySignal` reads hold snapshots only.
- `HoldEngineScarcitySignal` derives an assessment report only.
- `HoldEngineScarcitySignal` does not mutate hold snapshots.
- `HoldEngineScarcitySignal` does not write to `HoldEngine`.
- `HoldEngineScarcitySignal` does not create a new persistence substrate.

## Inputs

### Hold Snapshot Input

`holdSnapshots` is a required array. Each item must include:

- `holdId` (string)
- `status` (enum: `proposed`, `active`, `accepted`, `resolved`, `dismissed`)
- `blocking` (boolean)
- `evidence` (string[])
- `options` (string[])
- `createdAt` (ISO 8601 string)

Optional fields:

- `updatedAt` (ISO 8601 string)
- `resolvedAt` (ISO 8601 string)

### Evaluation Input

`input` must include:

| Field | Type | Required | Description |
|---|---|---|---|
| `evaluatedAt` | string | Yes | ISO 8601 timestamp for derivation pass. |

## Scarcity States

Derived scarcity states must be one of:

- `CLEAR`
- `WATCH`
- `TIGHT`
- `CRITICAL`

## Per-Hold Derivation Rules

1. Terminal hold statuses (`accepted`, `resolved`, `dismissed`) derive to `CLEAR`.
2. `active` + `blocking=true` + `options.length <= 1` derives to `CRITICAL`.
3. `active` + `blocking=true` derives to `TIGHT`.
4. `proposed` + `blocking=true` derives to `WATCH`.
5. `active` + `blocking=false` derives to `WATCH`.
6. All other combinations derive to `CLEAR`.

## ScarcitySignalReport Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `evaluatedAt` | string | Yes | Evaluation timestamp. |
| `overallScarcityState` | enum | Yes | Highest severity state across all assessments. |
| `holdCount` | number | Yes | Total hold snapshots assessed. |
| `activeHoldCount` | number | Yes | Count of `active` holds. |
| `blockingActiveHoldCount` | number | Yes | Count of `active` + `blocking=true` holds. |
| `stateCounts` | object | Yes | Counts by `CLEAR`, `WATCH`, `TIGHT`, `CRITICAL`. |
| `assessments` | object[] | Yes | Deterministic per-hold scarcity assessments. |

Per-item `assessments[]` contract:

| Field | Type | Required | Description |
|---|---|---|---|
| `holdId` | string | Yes | Hold identifier. |
| `status` | enum | Yes | Hold status snapshot. |
| `blocking` | boolean | Yes | Hold blocking flag snapshot. |
| `scarcityState` | enum | Yes | Derived per-hold scarcity state. |
| `evidenceRefCount` | number | Yes | Evidence array length from snapshot. |
| `optionCount` | number | Yes | Options array length from snapshot. |
| `hasEscalationSignal` | boolean | Yes | `true` when `status=active` and `blocking=true`. |
| `rationale` | string | Yes | Deterministic plain-language rationale. |

## Aggregate Rule

`overallScarcityState` is the highest-severity state present in `assessments`:

`CRITICAL` > `TIGHT` > `WATCH` > `CLEAR`

## Anti-Gamification Rule

`HoldEngineScarcitySignal` must not emit:

- `score`
- `points`
- `badge`
- `rank`
- `leaderboard`
- engagement analytics or social comparison outputs

## Contract Invariants

- Deterministic output for the same input.
- Derived-only behavior; no persistence layer introduced.
- Existing `HoldEngine` shared contract remains unchanged.
- No SessionBrief or Control Rod widening is introduced.

## Current Implementation Truth

- This is a Block C v1 spec baseline.
- Runtime implementation exists at `src/HoldEngineScarcitySignal.js`.
- Golden proof exists at `tests/golden/HoldEngineScarcitySignal.golden.test.js`.
