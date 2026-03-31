# WARRANTY_MONITOR.md
**Status:** Wave 5A Block B contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5A Block B contract baseline for `WarrantyMonitor`.

`WarrantyMonitor` is a derived-only monitor over existing trust artifacts. It evaluates operator trust degradation posture without introducing a new persisted substrate.

## Boundary

`WarrantyMonitor` defines:

- deterministic derived warranty-state evaluation
- explicit signal ingestion for degradation/expiry checks
- evidence-backed warranty output views

This spec does not define:

- warranty persistence store, ledger, registry, or lifecycle substrate
- SessionBrief schema changes
- Control Rod enum or profile contract changes
- HoldEngine Scarcity Signal behavior
- skills, skins, onboarding, package, install, or marketplace behavior
- telemetry, phone-home, external API, account-required, or payment-gate behavior
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Warranty Monitor`
- Internal build name: `WarrantyMonitor`
- Core derived object: `WarrantyView`

## Derived-Only Posture

- `WarrantyMonitor` reads existing trust/evidence surfaces.
- `WarrantyMonitor` computes derived monitoring state only.
- `WarrantyMonitor` does not persist warranty records.
- `WarrantyMonitor` does not create a second continuity/trust substrate.

## Warranty States

Derived `warrantyState` must be one of:

- `HEALTHY`
- `WATCH`
- `DEGRADED`
- `EXPIRED`

## Inputs

### Operator Trust Input

`operatorTrustStates` is a required array of operator trust snapshots. Each item must include:

- `operatorKey` (string)
- `currentLevel` (`APPRENTICE`, `JOURNEYMAN`, `FOREMAN`)
- `decisionHistory` (array)

`decisionHistory` entries must include:

- `decisionType` (`PROMOTION`, `HOLD`, `REGRESSION`)
- `forensicReferenceIds` (string refs)

### WarrantySignal Input

`warrantySignals` is a required array. Each signal object includes:

| Field | Type | Required | Description |
|---|---|---|---|
| `operatorKey` | string | Yes | Operator key this signal applies to. |
| `degradationObserved` | boolean | Yes | Whether degradation was observed. |
| `outOfBandChangeDetected` | boolean | Yes | Whether out-of-band change was detected. |
| `coverageExpired` | boolean | Yes | Whether warranty coverage has expired. |
| `evidenceRefs` | string[] | Conditional | Required and non-empty when any signal boolean is true. |

Evaluation input also includes:

| Field | Type | Required | Description |
|---|---|---|---|
| `evaluatedAt` | string | Yes | ISO 8601 timestamp for derivation pass. |

## WarrantyView Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `operatorKey` | string | Yes | Operator key for this view. |
| `currentLevel` | enum | Yes | Current operator trust level. |
| `warrantyState` | enum | Yes | One of `HEALTHY`, `WATCH`, `DEGRADED`, `EXPIRED`. |
| `hasRecentRegression` | boolean | Yes | Whether latest trust decision is `REGRESSION`. |
| `degradationObserved` | boolean | Yes | Derived from signal input. |
| `outOfBandChangeDetected` | boolean | Yes | Derived from signal input. |
| `coverageExpired` | boolean | Yes | Derived from signal input. |
| `evidenceRefs` | string[] | Yes | Evidence refs supporting non-healthy states; may be empty only when `HEALTHY`. |
| `rationale` | string | Yes | Deterministic plain-language rationale. |
| `evaluatedAt` | string | Yes | Derivation timestamp. |

## State Rules

1. If `coverageExpired=true`, state is `EXPIRED`.
2. If `degradationObserved=true` and (`hasRecentRegression=true` or `outOfBandChangeDetected=true`), state is `DEGRADED`.
3. If `degradationObserved=true` or `outOfBandChangeDetected=true` or `hasRecentRegression=true`, state is `WATCH`.
4. Otherwise, state is `HEALTHY`.

## Evidence Rules

- `HEALTHY` may return an empty `evidenceRefs` list.
- Non-healthy states must include at least one evidence ref.
- Regression-derived evidence uses forensic refs from the latest regression decision.
- Signal-derived evidence uses `warrantySignals[].evidenceRefs`.

## Anti-Gamification Rule

`WarrantyMonitor` must not emit:

- `score`
- `points`
- `badge`
- `rank`
- `leaderboard`
- engagement analytics or social comparison outputs

## Contract Invariants

- Derived output is deterministic for the same inputs.
- No persistence behavior is introduced.
- No SessionBrief or Control Rod contract widening is introduced.
- No Scarcity behavior is introduced in Block B.

## Current Implementation Truth

- This is a Block B v1 spec baseline.
- Runtime implementation exists at `src/WarrantyMonitor.js`.
- Golden proof exists at `tests/golden/WarrantyMonitor.golden.test.js`.
