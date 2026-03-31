# CONTROL_ROD_POSTURE_SKILL.md
**Status:** Wave 5B post-E1 read/query/render-only slice contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B post-E1 contract baseline for `ControlRodPostureSkill`.

The slice introduces one operator-facing route as a read/query/render-only surface:

- `/control-rods`

## Boundary

`ControlRodPostureSkill` defines:

- deterministic read/query/render output for one route
- read-only starter-profile visibility
- read-only current-profile posture/status visibility
- read-only domain autonomy posture visibility

This spec does not define:

- profile edit semantics
- profile change semantics
- permit or LOTO decision behavior
- HARD_STOP gate decision behavior
- state mutation or hidden write paths
- any route beyond `/control-rods`

## Public And Internal Names

- Public/operator-facing label: `Control Rod Posture Skill`
- Internal build name: `ControlRodPostureSkill`
- Core route: `/control-rods`

## Fixed Mapping Rule

- `/control-rods` maps to existing `ControlRodMode` read posture/status truth only.
- Route behavior must remain read/query/render-only.
- Mapping reinterpretation is not allowed in this slice.

## Read/Query/Render-Only Posture

- The slice consumes existing `ControlRodMode` posture/status truth.
- The slice renders deterministic views only.
- The slice introduces no hidden mutation behavior.
- The slice introduces no shared-contract widening.

## `/control-rods`

Input includes one required field:

- `controlRodProfile`: current profile input compatible with existing `ControlRodMode` profile normalization (`conservative`, `balanced`, `velocity`, or valid profile object)

Route behavior:

- show starter profile ids from existing read posture source
- show current profile identity
- show domain posture by autonomy level
- show route-level count summary
- never expose edit/change semantics
- never run permit/LOTO/HARD_STOP gate decisions

### `/control-rods` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/control-rods`. |
| `starterProfileIds` | string[] | Yes | Stable starter-profile id list. |
| `profile` | object | Yes | Current profile identity (`profileId`, `profileLabel`). |
| `summary` | object | Yes | Count map (`domainCount`, `hardStopCount`, `supervisedCount`, `fullAutoCount`). |
| `domains` | object[] | Yes | Deterministic domain posture list. |

`domains` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `domainId` | string | Yes | Stable domain id. |
| `label` | string | Yes | Domain label. |
| `autonomyLevel` | enum | Yes | One of `FULL_AUTO`, `SUPERVISED`, `HARD_STOP`. |
| `justification` | string | Yes | Existing plain-language posture reason. |

## Contract Invariants

- route set is fixed to exactly `/control-rods`
- output is deterministic for same input
- input objects remain unchanged after rendering
- existing `ControlRodMode` contract remains unchanged
- SessionBrief no-widening remains enforced
- no hidden write path is introduced

## Current Implementation Truth

- Runtime adapter implementation exists at `src/ControlRodPostureSkill.js`.
- Golden proof exists at `tests/golden/ControlRodPostureSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/control-rods-SKILL.md`.
