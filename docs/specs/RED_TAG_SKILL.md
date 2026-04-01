# RED_TAG_SKILL.md
**Status:** Wave 5B post-callout interlock decision surface contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B contract baseline for `RedTagSkill`.

The slice introduces one operator-facing route as an interlock decision surface:

- `/red-tag`

## Boundary

`RedTagSkill` defines:

- deterministic evaluate/render output for one route
- route output over existing `SafetyInterlocks` decision truth only
- no-evaluation output when required action or target input is missing

This spec does not define:

- any stateful tag lifecycle behavior
- any new engine logic
- any route beyond `/red-tag`
- any persistence substrate
- any shared-contract widening
- any hidden side effects

## Public And Internal Names

- Public/operator-facing label: `Red Tag Skill`
- Internal build name: `RedTagSkill`
- Core route: `/red-tag`

## Fixed Mapping Rule

- `/red-tag` maps to existing `SafetyInterlocks` decision truth only.
- Route behavior remains evaluate/render over existing engine output.
- Adapter behavior may use the canonical non-mutating evaluator path already shipped.
- Adapter behavior must not introduce a tag lifecycle workflow.
- Mapping reinterpretation is not allowed in this slice.

## Evaluate/Render Posture

- The slice consumes supplied interlock snapshot input only.
- The slice consumes supplied action/target input only.
- The slice renders deterministic route views only.
- The slice introduces no hidden mutation behavior.
- The slice introduces no shared-contract widening.

## `/red-tag`

Input includes one required field and route inputs:

- `interlocks`: object[] from existing SafetyInterlocks snapshot truth
- `interlockId`: string for an existing interlock record
- `actionCategory`: string matching existing SafetyInterlocks categories
- `targets`: string[] for candidate action targets
- `operatorAuthorized`: optional boolean passed through to existing evaluator
- `activeConstraintBlock`: optional boolean passed through to existing evaluator

`interlocks` records use existing SafetyInterlocks shape.

Route behavior:

- run the existing evaluator over supplied `interlockId`, `actionCategory`, and `targets`
- preserve existing engine decision semantics as-is
- render existing engine decision fields as-is
- when required `interlockId` or `actionCategory` or `targets` input is missing, return deterministic no-evaluation output and do not guess

### `/red-tag` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/red-tag`. |
| `evaluated` | boolean | Yes | Whether evaluation executed. |
| `interlockId` | string \| null | Yes | Existing interlock id when supplied. |
| `actionCategory` | string \| null | Yes | Existing action category when supplied. |
| `targets` | string[] | Yes | Supplied target list in source order. |
| `triggered` | boolean \| null | Yes | Existing evaluator trigger result when evaluated. |
| `decision` | string \| null | Yes | Existing evaluator decision field. |
| `requiresAuthorization` | boolean \| null | Yes | Existing evaluator auth gate field. |
| `mayProceed` | boolean \| null | Yes | Existing evaluator proceed field. |
| `protectedTargetHits` | string[] | Yes | Existing evaluator protected-target hits. |
| `operatorPrompt` | string \| null | Yes | Existing evaluator operator prompt field. |
| `rationale` | string \| null | Yes | Existing evaluator rationale field. |
| `evidence` | string[] | Yes | Existing evaluator evidence refs. |
| `evaluationState` | string | Yes | Deterministic route state text. |
| `renderNote` | string | Yes | Deterministic render note. |

## Contract Invariants

- route list is fixed to exactly `/red-tag`
- output is deterministic for same input
- input objects remain unchanged after rendering
- missing required action/target input produces deterministic no-evaluation output
- no stateful tag workflow is introduced
- no hidden write path is introduced

## Current Implementation Truth

- Runtime adapter implementation exists at `src/RedTagSkill.js`.
- Golden proof exists at `tests/golden/RedTagSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/red-tag-SKILL.md`.
