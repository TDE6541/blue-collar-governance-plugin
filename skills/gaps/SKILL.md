---
name: gaps
public_label: Gaps
class: operator-surface
tier: wave5b
description: "Render omission expected-signal-missing findings from existing OmissionCoverageEngine output with no writes."
---

# /gaps

## Purpose

Render omission expected-signal-missing findings from existing omission evaluation output.

## Input Source

- Query existing `OmissionCoverageEngine.evaluate(...)` output.
- Do not mutate omission engine inputs or source state.

## Render Path

1. Run or read an existing omission evaluation output.
2. Pass evaluation output to `CompressedIntelligenceSkills.renderGaps`.
3. Render deterministic omission findings view fields.

## Output Contract

Return the `Gaps` view with:

- `route`
- `profilePack`
- `sessionId`
- `missingCount`
- `missingFindings`

## Must Not

- reinterpret `/gaps` as generic evidence-gap findings
- mutate omission engine behavior
- add omission persistence behavior
- introduce new engine logic behind the skill
- emit score, points, badges, rank, or leaderboard fields
- add package/install/runtime-hook claims
