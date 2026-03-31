---
name: walk
public_label: Walk
class: operator-surface
tier: wave5b
description: "Render Foreman's Walk evaluation output for post-session verification with no engine mutation."
---

# /walk

## Purpose

Render Foreman's Walk evaluation results as a deterministic post-session verification view.

## Input Source

- Query existing `ForemansWalk.evaluate(...)` output.
- Do not alter Foreman's Walk inputs or engine state.

## Render Path

1. Run or read an existing Foreman's Walk evaluation.
2. Pass evaluation output to `SessionLifecycleSkills.renderWalk`.
3. Render findings and As-Built status counts.

## Output Contract

Return the `Walk` view with:

- `route`
- `findingCount`
- `findingSummary`
- `findings`
- `sessionOfRecordRef`
- `asBuiltStatusCounts`

## Must Not

- mutate Foreman's Walk behavior
- widen Foreman's Walk contract
- add live watcher behavior or other non-session-lifecycle features
- emit score, points, badges, rank, or leaderboard fields
- add package/install/runtime-hook claims
