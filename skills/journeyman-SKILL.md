---
name: journeyman
public_label: Journeyman
class: operator-surface
tier: wave5b
description: "Render persisted trust posture/history from shipped trust truth using pure read/query/render-only paths."
---

# /journeyman

## Purpose

Render existing persisted trust posture and history from shipped trust truth.

## Input Source

- Query existing `OperatorTrustLedger` read outputs only (`getOperatorState` and/or `listOperatorStates`).
- Never call init/evaluate/write paths.

## Render Path

1. Read trust posture snapshots from approved read-only trust paths.
2. Pass trust snapshots to `CompressedHistoryTrustSkills.renderJourneyman`.
3. Render deterministic trust posture/history output fields.

## Output Contract

Return the `Journeyman` view with:

- `route`
- `operatorCount`
- `levelSummary`
- `operators`

## Must Not

- call `JourneymanTrustEngine.readTrustState`
- call `JourneymanTrustEngine.evaluateDecision`
- call `JourneymanTrustEngine.recordApprovedRodAdjustment`
- call `JourneymanTrustEngine.recordOverrideOutcome`
- call `OperatorTrustLedger.initializeOperator`
- call `OperatorTrustLedger.recordDecisionOutcome`
- call `OperatorTrustLedger.recordApprovedRodAdjustment`
- call `OperatorTrustLedger.recordOverrideOutcome`
- emit score, points, badges, rank, or leaderboard fields
- add package/install/runtime-hook claims
