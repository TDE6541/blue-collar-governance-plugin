---
name: phantoms
public_label: Phantoms
class: operator-surface
tier: wave5b
description: "Render Foreman's Walk truthfulness findings (PHANTOM/GHOST/PARTIAL_VERIFICATION) using read/query/render-only behavior."
---

# /phantoms

## Purpose

Render truthfulness findings from existing Foreman's Walk output.

## Input Source

- Query existing `ForemansWalk.evaluate(...)` output.
- Do not mutate Foreman's Walk inputs or engine state.

## Render Path

1. Run or read an existing Foreman's Walk evaluation.
2. Pass evaluation output to `CompressedIntelligenceSkills.renderPhantoms`.
3. Render the returned truthfulness-only findings view.

## Output Contract

Return the `Phantoms` view with:

- `route`
- `findingCount`
- `findingSummary`
- `findings`

## Must Not

- mutate Foreman's Walk behavior
- reinterpret `/phantoms` away from Foreman's Walk truthfulness findings
- include non-truthfulness findings in this route
- introduce new engine logic behind the skill
- emit score, points, badges, rank, or leaderboard fields
- add package/install/runtime-hook claims
