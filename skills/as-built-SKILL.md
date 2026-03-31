---
name: as-built
public_label: As-Built
class: operator-surface
tier: wave5b
description: "Render SessionReceipt summarizeAsBuilt output as deterministic accountability delta with no writes."
---

# /as-built

## Purpose

Render the As-Built accountability delta from existing SessionReceipt summary output.

## Input Source

- Query an existing summary from `SessionReceipt.summarizeAsBuilt(receiptId)`.
- Do not mutate receipt or summary source state.

## Render Path

1. Query As-Built summary from SessionReceipt.
2. Pass summary to `SessionLifecycleSkills.renderAsBuilt`.
3. Render deterministic delta fields.

## Output Contract

Return the `As-Built` view with:

- `route`
- `receiptId`
- `outcome`
- `signoffRequired`
- `plannedButIncomplete`
- `unplannedCompleted`
- `holdsRaised`
- `approvedDrift`
- `excludedWork`
- `summary`

## Must Not

- write back to SessionReceipt
- widen SessionReceipt contract
- introduce new engine logic behind the skill
- emit score, points, badges, rank, or leaderboard fields
- add package/install/runtime-hook claims
