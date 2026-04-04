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

1. Invoke `node scripts/render-skill.js walk` via Bash.
2. The wrapper checks for persisted sessionBrief and sessionReceipt data required by the Walk engine. If these are not available, the wrapper returns a deterministic HOLD.
3. Render the wrapper's JSON result faithfully.
4. If `status` is `hold`, surface the HOLD directly and stop.

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
