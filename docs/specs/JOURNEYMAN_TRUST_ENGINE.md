# JOURNEYMAN_TRUST_ENGINE.md
**Status:** Wave 5A Block A contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5A Block A contract baseline for `JourneymanTrustEngine`.

`JourneymanTrustEngine` evaluates operator trust state and produces deterministic promotion/hold/regression decisions using explicit signals and concrete forensic references.

## Boundary

`JourneymanTrustEngine` defines:

- deterministic trust decision evaluation (`PROMOTION`, `HOLD`, `REGRESSION`)
- trust-level adjacency enforcement
- regression evidence gating through concrete forensic reference ids
- persistence of decision outcomes through `OperatorTrustLedger`

This spec does not define:

- SessionBrief schema changes
- control-rod profile or autonomy enum changes
- warranty behavior
- scarcity-signal behavior
- skills, skins, onboarding, package, or install behavior
- forensic chain authoring behavior
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Journeyman Trust Engine`
- Internal build name: `JourneymanTrustEngine`
- Core contract object: `TrustDecisionEnvelope`

## Inputs And Dependencies

Required runtime dependencies:

- `OperatorTrustLedger` (read/write trust state)
- optional `ForensicChain` read access for reference validation

Required caller inputs:

- `operatorKey` (explicit caller-provided identity key)
- `decisionId`
- `evaluatedAt` (ISO 8601)
- `forensicReferenceIds` (string references)
- explicit decision signals (`promotionSignal`, `regressionSignal`)

`operatorKey` must be explicit input and must never be inferred from ambient system state.

## TrustDecisionEnvelope Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `decisionId` | string | Yes | Stable decision identifier. |
| `operatorKey` | string | Yes | Explicit operator identity key passed by caller. |
| `decisionType` | enum | Yes | One of `PROMOTION`, `HOLD`, or `REGRESSION`. |
| `fromLevel` | enum | Yes | Operator level before decision. |
| `toLevel` | enum | Yes | Operator level after decision. |
| `reasonCodes` | string[] | Yes | Deterministic reason code list. |
| `forensicReferenceIds` | string[] | Yes | Concrete forensic references used as evidence. |
| `evaluatedAt` | string | Yes | ISO 8601 decision timestamp. |

## Decision Rules

- If both `promotionSignal` and `regressionSignal` are `true`, the input is invalid.
- If `regressionSignal=true`, proposed decision is regression by one trust level when possible; floor state produces `HOLD`.
- If `promotionSignal=true`, proposed decision is promotion by one trust level when possible; ceiling state produces `HOLD`.
- If neither signal is set, proposed decision is `HOLD`.
- Regression requests require non-empty `forensicReferenceIds`.
- When `ForensicChain` is supplied, each forensic reference id must resolve to an existing entry.

## Reads, Writes, And Persistence Boundary

- Reads from:
  - `OperatorTrustLedger` current operator state
  - optional `ForensicChain` entry references
  - optional control-rod context passed in explicitly by caller
- Writes to:
  - `OperatorTrustLedger` decision history and transitions
- Does not write to:
  - `SessionBrief`
  - `ControlRodMode`
  - `ForensicChain`

## Why SessionBrief Stays Untouched

- Journeyman trust decisions are runtime trust-state operations, not startup brief schema.
- SessionBrief remains unchanged; `journeymanLevel` is not introduced.

## Why This Is Not Control Rod Mutation

- Journeyman may persist approved rod-adjustment outcomes through trust-ledger records.
- Journeyman must not mutate the Control Rod autonomy enum (`FULL_AUTO`, `SUPERVISED`, `HARD_STOP`) or alter control-rod profile semantics.

## Contract Invariants

- Decision evaluation is deterministic for the same inputs.
- Trust transitions are adjacency-only (one level per decision).
- Regression evidence must remain concrete via forensic reference ids.
- No score, points, badge, rank, leaderboard, engagement, or analytics behavior is allowed.
- No Warranty, Scarcity Signal, skill, skin, onboarding, or package behavior is allowed.

## Current Implementation Truth

- This is a Block A v1 spec baseline.
- Runtime implementation exists at `src/JourneymanTrustEngine.js`.
- Golden proof exists at `tests/golden/JourneymanTrustEngine.golden.test.js`.
