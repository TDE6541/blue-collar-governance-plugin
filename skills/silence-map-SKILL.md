---
name: silence-map
public_label: Silence Map
class: operator-surface
tier: wave5b
description: "Render read-only blocked/restricted/guarded posture over ConstraintsRegistry, SafetyInterlocks, and ControlRodMode posture truth."
---

# /silence-map

## Purpose

Render read-only blocked, restricted, and guarded posture from existing safety-truth surfaces.

## Input Source

- Read existing `ConstraintsRegistry` records from approved read paths.
- Read existing `SafetyInterlocks` records from approved read paths.
- Read existing `ControlRodMode` posture/status from approved read paths.
- Do not create, update, or resolve constraints, interlocks, or rod profiles.

## Render Path

1. Read constraints posture from existing read paths.
2. Read safety interlock posture from existing read paths.
3. Read control rod posture/status from existing read paths.
4. Pass inputs to `CompressedSafetyPostureSkills.renderSilenceMap`.
5. Render deterministic route output fields.

## Output Contract

Return the `Silence Map` view with:

- `route`
- `profile`
- `summary`
- `blocked`
- `restricted`
- `guarded`

## Must Not

- expose rod edit or update semantics
- imply `/control-rods` shipped as a standalone skill
- create or update constraints/interlocks/rod posture
- reinterpret route mapping away from read-only posture visibility
- widen Control Rod, Constraints, or Safety contracts
- introduce hidden engine logic behind the skill
- emit score, points, badges, rank, or leaderboard fields
- add package/install/runtime-hook claims
