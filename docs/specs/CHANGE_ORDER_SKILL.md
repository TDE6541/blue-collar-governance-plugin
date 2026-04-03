# CHANGE_ORDER_SKILL.md
**Status:** Wave 5B post-buddy-status read/query/render-only slice contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B contract baseline for `ChangeOrderSkill`.

The slice introduces one operator-facing route as a read/query/render status view:

- `/change-order`

## Boundary

`ChangeOrderSkill` defines:

- deterministic read/query/render output for one route
- route output over existing change-order snapshot truth only
- source-order-preserving rendering for supplied change-order records
- deterministic snapshot output when no records are present

This spec does not define:

- any state mutation path
- any new engine logic
- any route beyond `/change-order`
- change-order creation behavior
- change-order decision behavior
- recommendation behavior
- hidden side effects

## Public And Internal Names

- Public/operator-facing label: `Change Order Skill`
- Internal build name: `ChangeOrderSkill`
- Core route: `/change-order`

## Fixed Mapping Rule

- `/change-order` maps to existing `ChangeOrderEngine` snapshot truth only.
- Route behavior remains read/query/render-only.
- Adapter behavior must not invoke `createFromDrift`.
- Adapter behavior must not invoke `decide`.
- Adapter behavior must not invoke mutating `ChangeOrderEngine` methods.
- Mapping reinterpretation is not allowed in this slice.

## Read/Query/Render-Only Posture

- The slice consumes supplied change-order snapshot input only.
- The slice renders deterministic route views only.
- The slice introduces no hidden mutation behavior.
- The slice introduces no shared-contract widening.

## `/change-order`

Input includes one required field:

- `changeOrders`: object[] from existing change-order snapshot read truth

`changeOrders` minimum shape used by this route:

- `changeOrderId`: string
- `status`: enum (`APPROVED`, `REJECTED`, `DEFERRED`)
- `decisionReason`: string
- `decisionBy`: string
- `decidedAt`: string (ISO 8601)
- `sourceRefs`: string[]
- `evidenceRefs`: string[]

Route behavior:

- preserve source order from supplied `changeOrders`
- render existing record fields as supplied
- when no records are present, return deterministic snapshot text:
  - `no change orders in current snapshot`
- do not emit synthetic workflow-health claims

### `/change-order` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/change-order`. |
| `changeOrderCount` | integer | Yes | Count of supplied change-order records. |
| `changeOrders` | object[] | Yes | Records rendered from supplied snapshot truth. |
| `snapshotState` | string | Yes | Deterministic snapshot state text. |
| `renderNote` | string | Yes | Deterministic render note. |

`changeOrders` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `changeOrderId` | string | Yes | Existing change-order id. |
| `status` | string | Yes | Existing deterministic status. |
| `decisionReason` | string | Yes | Existing decision reason. |
| `decisionBy` | string | Yes | Existing decision actor. |
| `decidedAt` | string | Yes | Existing decision timestamp. |
| `sourceRefs` | string[] | Yes | Existing source refs. |
| `evidenceRefs` | string[] | Yes | Existing evidence refs. |

## Contract Invariants

- route list is fixed to exactly `/change-order`
- output is deterministic for same input
- input objects remain unchanged after rendering
- source order of supplied records is preserved
- no hidden write path is introduced
- no synthetic workflow-completion language is introduced

## Current Implementation Truth

- Runtime adapter implementation exists at `src/ChangeOrderSkill.js`.
- Golden proof exists at `tests/golden/ChangeOrderSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/change-order/SKILL.md`.
