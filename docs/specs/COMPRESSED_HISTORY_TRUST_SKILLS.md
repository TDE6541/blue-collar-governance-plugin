# COMPRESSED_HISTORY_TRUST_SKILLS.md
**Status:** Wave 5B Block C contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B Block C compressed History & Trust micro-slice contract baseline.

The slice introduces three operator-facing skills that are read/query/render-only surfaces over already-shipped runtime truth:

- `/chain`
- `/warranty`
- `/journeyman`

## Boundary

This spec defines:

- deterministic skill-surface output contracts for the three approved routes
- fixed route-to-runtime mappings for this micro-slice
- explicit anti-widening and anti-gamification constraints for skill surfaces

This spec does not define:

- new engine behavior or new engine write paths
- SessionBrief schema changes
- SessionReceipt schema changes
- Control Rod enum/profile changes
- Operator Trust Ledger, Journeyman Trust Engine, Warranty Monitor, or Scarcity contract changes
- skills outside `/chain`, `/warranty`, and `/journeyman`
- stateful operator-action surfaces (`/callout`, `/change-order`, `/lockout`, `/permit`)
- skins, onboarding, package, install, runtime-hook, compatibility, or marketplace behavior
- telemetry, phone-home, external API, account-required, or payment-gate behavior
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing tranche label: `Compressed History & Trust Skills`
- Internal build name: `CompressedHistoryTrustSkills`
- Core routes: `/chain`, `/warranty`, `/journeyman`

## Fixed Mapping Rules

- `/chain` maps to `ForensicChain` read-only history view only.
- `/warranty` maps to `WarrantyMonitor` read-only posture view only.
- `/journeyman` maps to read-only trust posture views over already-persisted trust state only.

Mapping reinterpretation is not allowed in this block.

## Read/Query/Render-Only Posture

- Compressed History & Trust skills consume existing runtime truth only.
- Compressed History & Trust skills render deterministic views only.
- Compressed History & Trust skills do not mutate existing engine state.
- Compressed History & Trust skills do not introduce hidden write paths.
- Compressed History & Trust skills do not widen shared contracts.

## Route Contracts

## `/chain`

Input: existing Forensic Chain read output only (`getEntry` and/or `listEntries` read paths).

Route behavior:

- include existing forensic entries and linkage history only
- preserve append-order history visibility
- never append/write/update/delete forensic entries

Output object:

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/chain`. |
| `chainId` | string | Yes | Forensic chain id represented by this view. |
| `entryCount` | number | Yes | Number of entries included in this view. |
| `entryTypeSummary` | object | Yes | Count map by `CLAIM`, `EVIDENCE`, `GAP`, `FINDING`, `OPERATOR_ACTION`. |
| `entries` | object[] | Yes | Ordered forensic entry list (`entryId`, `entryType`, `recordedAt`, `sessionId`, `sourceArtifact`, `sourceLocation`, `payload`, `linkedEntryRefs`). |

## `/warranty`

Input: existing `WarrantyMonitor.deriveWarrantyViews(...)` output array from approved read/query paths.

Route behavior:

- include existing derived warranty posture views only
- preserve shipped warranty state vocabulary (`HEALTHY`, `WATCH`, `DEGRADED`, `EXPIRED`)
- never create new warranty state stores or writebacks

Output object:

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/warranty`. |
| `viewCount` | number | Yes | Number of warranty views included in this route output. |
| `stateSummary` | object | Yes | Count map by `HEALTHY`, `WATCH`, `DEGRADED`, `EXPIRED`. |
| `views` | object[] | Yes | Warranty posture list (`operatorKey`, `currentLevel`, `warrantyState`, `hasRecentRegression`, `degradationObserved`, `outOfBandChangeDetected`, `coverageExpired`, `evidenceRefs`, `rationale`, `evaluatedAt`). |

## `/journeyman`

Input: existing `OperatorTrustLedger` read outputs only (`getOperatorState` and/or `listOperatorStates`).

Route behavior:

- include existing persisted trust posture and history only
- summarize trust posture at query/render time without mutating state
- do not call `JourneymanTrustEngine` init/evaluate/write paths
- do not call `OperatorTrustLedger` init/write paths

Output object:

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/journeyman`. |
| `operatorCount` | number | Yes | Number of operator trust states included in this route output. |
| `levelSummary` | object | Yes | Count map by `APPRENTICE`, `JOURNEYMAN`, `FOREMAN`. |
| `operators` | object[] | Yes | Trust posture list (`operatorKey`, `currentLevel`, `transitionCount`, `decisionCount`, `lastDecisionType`, `lastDecisionAt`, `recentForensicReferenceIds`, `createdAt`, `updatedAt`). |

## Anti-Gamification Rule

Compressed History & Trust skills must not emit:

- `score`
- `points`
- `badge`
- `rank`
- `leaderboard`
- engagement analytics or social comparison outputs

## Contract Invariants

- output is deterministic for the same inputs
- input objects remain unchanged after rendering
- existing engine contracts remain unchanged
- SessionBrief no-widening remains enforced (`journeymanLevel` is not introduced)
- no hidden write path is introduced

## Current Implementation Truth

- This is a Wave 5B Block C v1 spec baseline.
- Runtime adapter implementation exists at `src/CompressedHistoryTrustSkills.js`.
- Golden proof exists at `tests/golden/CompressedHistoryTrustSkills.golden.test.js`.
- Operator-facing skill artifacts exist at:
  - `skills/chain/SKILL.md`
  - `skills/warranty/SKILL.md`
  - `skills/journeyman/SKILL.md`
