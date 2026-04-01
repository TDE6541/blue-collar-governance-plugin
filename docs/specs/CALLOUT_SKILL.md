# CALLOUT_SKILL.md
**Status:** Wave 5B post-change-order read/query/render-only slice contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B contract baseline for `CalloutSkill`.

The slice introduces one operator-facing route as a callout-detail snapshot view:

- `/callout`

## Boundary

`CalloutSkill` defines:

- deterministic read/query/render output for one route
- route output over existing Buddy callout snapshot truth only
- source-order-preserving rendering for supplied callout rows
- deterministic snapshot output when no callouts are present

This spec does not define:

- any state mutation path
- any new engine logic
- any route beyond `/callout`
- watcher posture synthesis
- callout mutation behavior
- session-control transition behavior
- advisory behavior
- hidden side effects

## Public And Internal Names

- Public/operator-facing label: `Callout Skill`
- Internal build name: `CalloutSkill`
- Core route: `/callout`

## Fixed Mapping Rule

- `/callout` maps to existing Buddy callout snapshot truth only.
- Route behavior remains read/query/render-only.
- Adapter behavior must not invoke Buddy mutator methods.
- Adapter behavior must not invoke `checkPresence`.
- Mapping reinterpretation is not allowed in this slice.

## Distinction From `/buddy-status`

- `/buddy-status` is the watcher posture plus callout snapshot route.
- `/callout` is callout-detail view only.
- `/callout` must not duplicate watcher policy posture rendering.

## Read/Query/Render-Only Posture

- The slice consumes supplied callout snapshot input only.
- The slice renders deterministic route views only.
- The slice introduces no hidden mutation behavior.
- The slice introduces no shared-contract widening.

## `/callout`

Input includes one required field:

- `callouts`: object[] from existing Buddy callout snapshot read truth

`callouts` minimum shape used by this route:

- `calloutId`: string
- `sessionId`: string
- `buddyId`: string
- `calloutType`: string
- `urgency`: string
- `summary`: string
- `detectedAt`: string
- `sourceRefs`: string[]
- `evidenceRefs`: string[]
- `chainEntryRef`: string

Route behavior:

- preserve source order from supplied `callouts`
- render existing callout snapshot fields as supplied
- when no callouts are present, return deterministic snapshot text:
  - `no callouts in current snapshot`
- do not emit synthetic watcher-health or control claims

### `/callout` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/callout`. |
| `calloutCount` | integer | Yes | Count of supplied callout snapshots. |
| `callouts` | object[] | Yes | Callout rows rendered from supplied snapshots. |
| `snapshotState` | string | Yes | Deterministic snapshot state text. |
| `renderNote` | string | Yes | Deterministic render note. |

`callouts` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `calloutId` | string | Yes | Existing callout id. |
| `sessionId` | string | Yes | Existing session id. |
| `buddyId` | string | Yes | Existing watcher id. |
| `calloutType` | string | Yes | Existing callout type. |
| `urgency` | string | Yes | Existing urgency level. |
| `summary` | string | Yes | Existing summary text. |
| `detectedAt` | string | Yes | Existing detection timestamp. |
| `sourceRefs` | string[] | Yes | Existing source refs. |
| `evidenceRefs` | string[] | Yes | Existing evidence refs. |
| `chainEntryRef` | string | Yes | Existing chain entry reference. |

## Contract Invariants

- route list is fixed to exactly `/callout`
- output is deterministic for same input
- input objects remain unchanged after rendering
- source order of supplied callouts is preserved
- no hidden write path is introduced
- no synthetic health/control language is introduced

## Current Implementation Truth

- Runtime adapter implementation exists at `src/CalloutSkill.js`.
- Golden proof exists at `tests/golden/CalloutSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/callout-SKILL.md`.
