# OPERATOR_TRUST_LEDGER.md
**Status:** Wave 5A Block A contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5A Block A contract baseline for `OperatorTrustLedger`.

`OperatorTrustLedger` is a dedicated operator-trust substrate. It persists operator-level trust lifecycle state and trust-relevant outcomes across sessions.

## Boundary

`OperatorTrustLedger` defines:

- deterministic operator trust initialization
- trust-level transition persistence
- approved rod-adjustment history persistence
- override-outcome persistence
- trust decision history with forensic reference ids

This spec does not define:

- continuity carry-forward qualification or continuity aging rules
- control-rod profile resolution or HARD_STOP permit semantics
- forensic evidence entry authoring
- SessionBrief schema or startup contract changes
- warranty behavior
- scarcity-signal behavior
- skills, skins, onboarding, package, or install behavior
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Operator Trust Ledger`
- Internal build name: `OperatorTrustLedger`
- Core contract object: `OperatorTrustState`

## Operator Identity Rule

- `operatorKey` is an explicit runtime input.
- `operatorKey` must be passed into runtime APIs and must never be inferred from OS username, git identity, machine state, environment user, or hidden profile behavior.
- This contract introduces no auth/account system.

## Trust Levels

`trustLevel` must be one of:

- `APPRENTICE`
- `JOURNEYMAN`
- `FOREMAN`

Initialization for a new operator is deterministic:

- first persisted level is `APPRENTICE`

## OperatorTrustState Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `operatorKey` | string | Yes | Explicit operator identity key passed by caller. |
| `currentLevel` | enum | Yes | Current trust level (`APPRENTICE`, `JOURNEYMAN`, `FOREMAN`). |
| `levelTransitions` | `TrustLevelTransition[]` | Yes | Persisted level transition history. |
| `approvedRodAdjustments` | `ApprovedRodAdjustment[]` | Yes | Persisted approved control-rod adjustments relevant to operator trust posture. |
| `overrideOutcomes` | `TrustOverrideOutcome[]` | Yes | Persisted override outcomes. |
| `decisionHistory` | `TrustDecisionOutcome[]` | Yes | Persisted promotion/hold/regression decision history. |
| `createdAt` | string | Yes | ISO 8601 timestamp for first operator initialization in the ledger. |
| `updatedAt` | string | Yes | Latest ISO 8601 mutation timestamp for this operator trust state. |

## TrustLevelTransition Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `transitionId` | string | Yes | Stable transition identifier. |
| `fromLevel` | enum | Yes | Previous level. |
| `toLevel` | enum | Yes | New level after transition. |
| `reasonCodes` | string[] | Yes | Deterministic reason code list for the transition. |
| `forensicReferenceIds` | string[] | Yes | Concrete forensic entry references supporting this transition. |
| `decidedAt` | string | Yes | ISO 8601 decision timestamp. |

## ApprovedRodAdjustment Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `adjustmentId` | string | Yes | Stable adjustment identifier. |
| `fromAutonomyLevel` | enum | Yes | Prior autonomy level (`FULL_AUTO`, `SUPERVISED`, `HARD_STOP`). |
| `toAutonomyLevel` | enum | Yes | Approved autonomy level (`FULL_AUTO`, `SUPERVISED`, `HARD_STOP`). |
| `approvedAt` | string | Yes | ISO 8601 approval timestamp. |
| `approvedBy` | string | Yes | Explicit approver identifier supplied by caller. |
| `reason` | string | No | Optional plain-language adjustment reason. |
| `forensicReferenceIds` | string[] | Yes | Concrete forensic entry references supporting the adjustment. |

## TrustOverrideOutcome Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `overrideId` | string | Yes | Stable override identifier. |
| `outcome` | enum | Yes | One of `APPROVED`, `DENIED`, or `EXPIRED`. |
| `resolvedAt` | string | Yes | ISO 8601 override resolution timestamp. |
| `resolvedBy` | string | Yes | Explicit resolver identifier supplied by caller. |
| `reason` | string | No | Optional plain-language override resolution reason. |
| `forensicReferenceIds` | string[] | Yes | Concrete forensic entry references supporting the outcome. |

## TrustDecisionOutcome Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `decisionId` | string | Yes | Stable decision identifier. |
| `decisionType` | enum | Yes | One of `PROMOTION`, `HOLD`, or `REGRESSION`. |
| `fromLevel` | enum | Yes | Operator level before decision. |
| `toLevel` | enum | Yes | Operator level after decision. |
| `reasonCodes` | string[] | Yes | Deterministic reason code list for the decision. |
| `forensicReferenceIds` | string[] | Yes | Concrete forensic entry references supporting the decision. |
| `decidedAt` | string | Yes | ISO 8601 decision timestamp. |

## Reads, Writes, And Persistence Boundary

- Reads from:
  - continuity outputs as contextual input only
  - control-rod decision context as input only
  - forensic reference ids as trust evidence linkage
- Writes to:
  - `OperatorTrustState` only
- Does not write to:
  - `ContinuityLedger`
  - `ControlRodMode`
  - `ForensicChain`
  - `SessionBrief`

## Why This Is Not Continuity

- Continuity persists unresolved work carry-forward state.
- Operator Trust Ledger persists operator trust posture lifecycle state.
- These lifecycles are distinct and must not be merged into one contract object.

## Why SessionBrief Stays Untouched

- SessionBrief remains a startup session contract.
- Operator trust lifecycle state is query/runtime state, not startup brief shape.
- No `journeymanLevel` or any new SessionBrief field is introduced.

## Contract Invariants

- New operators initialize deterministically to `APPRENTICE`.
- Trust decisions persist forensic reference ids for traceable evidence linkage.
- Promotion/regression transitions are one-step adjacency transitions only.
- `operatorKey` is always caller-provided and never inferred.
- No score, points, badge, rank, leaderboard, engagement, or analytics fields are allowed.

## Current Implementation Truth

- This is a Block A v1 spec baseline.
- Runtime implementation exists at `src/OperatorTrustLedger.js`.
- Golden proof exists at `tests/golden/OperatorTrustLedger.golden.test.js`.
