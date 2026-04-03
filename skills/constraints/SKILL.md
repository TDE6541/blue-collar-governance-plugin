---
name: constraints
public_label: Constraints
class: operator-surface
tier: wave5b
description: "Render read-only ConstraintsRegistry posture visibility for maintained never-do rule truth."
---

# /constraints

## Purpose

Render current maintained constraints posture from existing ConstraintsRegistry truth.

## Input Source

- Read existing constraint records from approved `ConstraintsRegistry` read paths.
- Use read-only outputs only (`listRules` and/or `getRule`).
- Do not create, update, or resolve rules.

## Render Path

1. Read current constraint records from approved read paths.
2. Pass records to `CompressedSafetyPostureSkills.renderConstraints`.
3. Render deterministic route output fields.

## Output Contract

Return the `Constraints` view with:

- `route`
- `ruleCount`
- `maintainedCount`
- `statusSummary`
- `enforcementSummary`
- `rules`

## Must Not

- create or update constraint rules
- resolve precedence as an action flow
- reinterpret route mapping away from ConstraintsRegistry posture visibility
- widen ConstraintsRegistry contract
- introduce hidden engine logic behind the skill
- emit score, points, badges, rank, or leaderboard fields
- add package/install/runtime-hook claims
