# FIRE_BREAK_SKILL.md
**Status:** Wave 5B post-control-rods read/query/render-only slice contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B contract baseline for `FireBreakSkill`.

The slice introduces one operator-facing route as a manual read/query/render-only governance snapshot:

- `/fire-break`

## Boundary

`FireBreakSkill` defines:

- deterministic read/query/render output for one route
- read-only governance snapshot visibility over existing captured board truth
- route-level count summary derived from existing board groups only

This spec does not define:

- any state mutation path
- any new engine logic
- any control behavior
- any route beyond `/fire-break`

## Public And Internal Names

- Public/operator-facing label: `Fire Break Skill`
- Internal build name: `FireBreakSkill`
- Core route: `/fire-break`

## Fixed Mapping Rule

- `/fire-break` maps to existing `OpenItemsBoard` projection output only.
- Route behavior must remain manual read/query/render-only.
- Mapping reinterpretation is not allowed in this slice.

## Read/Query/Render-Only Posture

- The slice consumes existing `OpenItemsBoard` snapshot truth.
- The slice renders deterministic route views only.
- The slice introduces no hidden mutation behavior.
- The slice introduces no shared-contract widening.

## `/fire-break`

Input includes one required field:

- `openItemsBoardView`: object shaped as existing `OpenItemsBoard.projectBoard` output (`boardLabel`, `sessionId`, `precedence`, `groups`)

Route behavior:

- pass through board label, session id, precedence, and grouped items
- render route-level count summary from existing group membership only
- preserve source refs and evidence refs exactly as supplied

### `/fire-break` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/fire-break`. |
| `boardLabel` | string | Yes | Literal `Open Items Board`. |
| `sessionId` | string | Yes | Session id from the input board snapshot. |
| `precedence` | string[] | Yes | Fixed board precedence list from board truth. |
| `groups` | object | Yes | Grouped board items copied from board truth. |
| `snapshot` | object | Yes | Count summary derived from group lengths only. |

`snapshot` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `missingNowCount` | integer | Yes | Count of `Missing now` items. |
| `stillUnresolvedCount` | integer | Yes | Count of `Still unresolved` items. |
| `agingIntoRiskCount` | integer | Yes | Count of `Aging into risk` items. |
| `resolvedThisSessionCount` | integer | Yes | Count of `Resolved this session` items. |
| `totalItems` | integer | Yes | Total count across all four groups. |

## Contract Invariants

- route set is fixed to exactly `/fire-break`
- output is deterministic for same input
- input objects remain unchanged after rendering
- existing `OpenItemsBoard` contract remains unchanged
- no hidden write path is introduced

## Current Implementation Truth

- Runtime adapter implementation exists at `src/FireBreakSkill.js`.
- Golden proof exists at `tests/golden/FireBreakSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/fire-break-SKILL.md`.

