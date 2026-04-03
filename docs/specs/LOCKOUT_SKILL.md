# LOCKOUT_SKILL.md
**Status:** Wave 5B post-permit LOTO validation surface contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B contract baseline for `LockoutSkill`.

The slice introduces one operator-facing route as a LOTO validation surface:

- `/lockout`

## Boundary

`LockoutSkill` defines:

- deterministic evaluate/render output for one route
- route output over existing `ControlRodMode.validateLotoAuthorization(...)` truth only
- deterministic no-evaluation output when required authorization input is missing or invalid

This spec does not define:

- any permit gate behavior
- any queue, inbox, ledger, or workflow behavior
- any persistence layer
- any route beyond `/lockout`
- any shared-contract widening
- any hidden side effects

## Public And Internal Names

- Public/operator-facing label: `Lockout Skill`
- Internal build name: `LockoutSkill`
- Core route: `/lockout`

## Fixed Mapping Rule

- `/lockout` maps to existing `ControlRodMode.validateLotoAuthorization(...)` truth only.
- Route behavior remains evaluate/render over existing engine validation output.
- Adapter behavior may use only the canonical non-mutating LOTO validator path already shipped.
- Adapter behavior must not call `evaluateHardStopGate(...)`.
- Adapter behavior must not call `validatePermit(...)`.
- Mapping reinterpretation is not allowed in this slice.
- `/permit` remains separate and already shipped.

## Evaluate/Render Posture

- The slice consumes supplied authorization input only.
- The slice renders deterministic route views only.
- The slice introduces no queue/inbox/ledger/workflow behavior.
- The slice introduces no shared-contract widening.

## `/lockout`

Input includes one required field:

- `authorization`: object, existing LOTO authorization object for validation

Route behavior:

- run existing `ControlRodMode.validateLotoAuthorization(...)` with supplied `authorization` input
- preserve existing engine validation semantics as-is
- render existing validation fields as-is
- when required authorization input is missing or invalid, return deterministic no-evaluation output and do not guess

### `/lockout` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/lockout`. |
| `evaluated` | boolean | Yes | Whether validation executed. |
| `authorizationValid` | boolean \| null | Yes | Validation result when evaluated. |
| `authorizationId` | string \| null | Yes | Existing authorization id output. |
| `domainId` | string \| null | Yes | Existing authorization domain id output. |
| `authorizedBy` | string \| null | Yes | Existing authorization actor output. |
| `authorizedAt` | string \| null | Yes | Existing authorization timestamp output. |
| `reason` | string \| null | Yes | Existing authorization reason output. |
| `scope` | object \| null | Yes | Existing authorization scope output. |
| `conditions` | string[] | Yes | Existing authorization conditions output. |
| `chainRef` | string \| null | Yes | Existing authorization chain ref output. |
| `evaluationState` | string | Yes | Deterministic route state text. |
| `renderNote` | string | Yes | Deterministic render note. |

## Contract Invariants

- route list is fixed to exactly `/lockout`
- output is deterministic for same input
- input objects remain unchanged after rendering
- missing required authorization input produces deterministic no-evaluation output
- invalid authorization input produces deterministic no-evaluation output
- no permit coupling behavior is introduced
- no queue/inbox/ledger/workflow behavior is introduced
- no hidden write path is introduced

## Current Implementation Truth

- Runtime adapter implementation exists at `src/LockoutSkill.js`.
- Golden proof exists at `tests/golden/LockoutSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/lockout/SKILL.md`.
