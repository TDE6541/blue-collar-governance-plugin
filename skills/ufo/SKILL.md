---
name: ufo
public_label: UFO
class: operator-surface
tier: wave5b
description: "Render unresolved and aging Standing Risk visibility from existing StandingRiskEngine output with no writes."
---

# /ufo

## Purpose

Render unresolved and aging Standing Risk visibility from existing derived standing-risk output.

## Input Source

- Query existing `StandingRiskEngine.deriveStandingRisk(...)` output.
- Do not mutate continuity records or standing-risk engine state.

## Render Path

1. Run or read an existing Standing Risk derivation output.
2. Pass derived output array to `CompressedIntelligenceSkills.renderUfo`.
3. Render the returned unresolved/aging standing-risk view.

## Output Contract

Return the `UFO` view with:

- `route`
- `unresolvedCount`
- `terminalExcludedCount`
- `escalationSummary`
- `unresolvedItems`

## Must Not

- reinterpret `/ufo` as ghost or phantom findings
- mutate Standing Risk derivation behavior
- add standing-risk persistence behavior
- introduce new engine logic behind the skill
- emit score, points, badges, rank, or leaderboard fields
- add package/install/runtime-hook claims
