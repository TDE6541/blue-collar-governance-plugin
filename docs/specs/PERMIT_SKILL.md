# PERMIT_SKILL.md
**Status:** Wave 5B post-red-tag gate decision surface contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B contract baseline for `PermitSkill`.

The slice introduces one operator-facing route as a gate decision surface:

- `/permit`

## Boundary

`PermitSkill` defines:

- deterministic evaluate/render output for one route
- route output over existing `ControlRodMode` HARD_STOP permit-gate decision truth only
- deterministic no-evaluation output when required gate input is missing or invalid

This spec does not define:

- any permit request queue
- any approval inbox
- any persistence layer
- any route beyond `/permit`
- any shared-contract widening
- any hidden side effects
- any `/lockout` behavior

## Public And Internal Names

- Public/operator-facing label: `Permit Skill`
- Internal build name: `PermitSkill`
- Core route: `/permit`

## Fixed Mapping Rule

- `/permit` maps to existing `ControlRodMode` HARD_STOP permit-gate decision truth only.
- Route behavior remains evaluate/render over existing engine output.
- Adapter behavior may use canonical non-mutating gate evaluation already shipped.
- Mapping reinterpretation is not allowed in this slice.
- `/lockout` remains a separate pending surface.

## Evaluate/Render Posture

- The slice consumes supplied gate input only.
- The slice renders deterministic route views only.
- The slice introduces no queue or workflow behavior.
- The slice introduces no shared-contract widening.

## `/permit`

Input includes route gate fields:

- `profile`: existing `ControlRodMode` profile input (preset id or normalized profile object)
- `domainId`: domain id for gate evaluation
- `sessionId`: session id for gate context
- `evaluatedAt`: ISO 8601 timestamp for gate evaluation
- `authorization`: optional, existing LOTO authorization object for HARD_STOP domains
- `permit`: optional, existing permit decision object for HARD_STOP domains

Route behavior:

- run existing `ControlRodMode` gate evaluation with supplied input
- preserve existing engine decision semantics as-is
- render existing gate decision fields as-is
- when required gate input is missing or invalid, return deterministic no-evaluation output and do not guess

### `/permit` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/permit`. |
| `evaluated` | boolean | Yes | Whether evaluation executed. |
| `profileId` | string \| null | Yes | Profile id when supplied or resolved. |
| `domainId` | string \| null | Yes | Gate domain id. |
| `sessionId` | string \| null | Yes | Gate session id. |
| `evaluatedAt` | string \| null | Yes | Gate evaluation timestamp input. |
| `autonomyLevel` | string \| null | Yes | Existing gate autonomy level output. |
| `requiresLoto` | boolean \| null | Yes | Existing gate LOTO requirement output. |
| `requiresPermit` | boolean \| null | Yes | Existing gate permit requirement output. |
| `mayProceed` | boolean \| null | Yes | Existing gate proceed output. |
| `constrained` | boolean \| null | Yes | Existing gate constrained output. |
| `statusCode` | string \| null | Yes | Existing gate status code output. |
| `summary` | string \| null | Yes | Existing gate summary output. |
| `authorizationRef` | string \| null | Yes | Existing authorization reference output. |
| `permitRef` | string \| null | Yes | Existing permit reference output. |
| `permitDecision` | string \| null | Yes | Existing permit decision output. |
| `chainRefs` | string[] | Yes | Existing chain references output. |
| `conditions` | string[] | Yes | Existing conditional constraints output. |
| `evaluationState` | string | Yes | Deterministic route state text. |
| `renderNote` | string | Yes | Deterministic render note. |

## Contract Invariants

- route list is fixed to exactly `/permit`
- output is deterministic for same input
- input objects remain unchanged after rendering
- missing required gate input produces deterministic no-evaluation output
- no queue or approval workflow is introduced
- no hidden write path is introduced
- `/lockout` is not implemented in this slice

## Current Implementation Truth

- Runtime adapter implementation exists at `src/PermitSkill.js`.
- Golden proof exists at `tests/golden/PermitSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/permit-SKILL.md`.
