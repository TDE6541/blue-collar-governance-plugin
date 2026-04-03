# BUDDY_STATUS_SKILL.md
**Status:** Wave 5B post-eliminate read/query/render-only slice contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B contract baseline for `BuddyStatusSkill`.

The slice introduces one operator-facing route as a watcher snapshot view:

- `/buddy-status`

## Boundary

`BuddyStatusSkill` defines:

- deterministic read/query/render output for one route
- route output over existing Buddy watcher policy and existing Buddy callout snapshots
- source-order-preserving rendering for supplied callouts
- deterministic snapshot output when no callouts are present

This spec does not define:

- any state mutation path
- any new engine logic
- any route beyond `/buddy-status`
- live control behavior
- advisory behavior
- comparative or ordering math
- hidden side effects

## Public And Internal Names

- Public/operator-facing label: `Buddy Status Skill`
- Internal build name: `BuddyStatusSkill`
- Core route: `/buddy-status`

## Fixed Mapping Rule

- `/buddy-status` maps to existing Buddy watcher policy truth and existing Buddy callout snapshot truth only.
- Route behavior remains read/query/render-only.
- Adapter behavior must not invoke `checkPresence`.
- Adapter behavior must not invoke Buddy mutator methods.
- Mapping reinterpretation is not allowed in this slice.

## Read/Query/Render-Only Posture

- The slice consumes supplied watcher policy input only.
- The slice consumes supplied callout snapshot input only.
- The slice renders deterministic route views only.
- The slice introduces no hidden mutation behavior.
- The slice introduces no shared-contract widening.

## `/buddy-status`

Input includes two required fields:

- `watcherPolicy`: object from existing Buddy policy read truth
- `callouts`: object[] from existing Buddy callout snapshot read truth

`watcherPolicy` minimum shape used by this route:

- `deadManTimeoutMinutes`: integer

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
- render existing watcher policy fields as supplied
- render existing callout snapshot fields as supplied
- when no callouts are present, return deterministic snapshot text:
  - `no active callouts in current watcher snapshot`
- do not emit synthetic health claims

### `/buddy-status` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/buddy-status`. |
| `watcherPolicy` | object | Yes | Existing watcher policy snapshot. |
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

- route list is fixed to exactly `/buddy-status`
- output is deterministic for same input
- input objects remain unchanged after rendering
- source order of supplied callouts is preserved
- no hidden write path is introduced
- no synthetic health language is introduced

## Current Implementation Truth

- Runtime adapter implementation exists at `src/BuddyStatusSkill.js`.
- Golden proof exists at `tests/golden/BuddyStatusSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/buddy-status/SKILL.md`.
