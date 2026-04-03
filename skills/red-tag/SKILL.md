---
name: red-tag
description: "Evaluate a specific action-target pair against existing safety interlocks and render the current decision truth."
---

# /red-tag

## Purpose

Use when you want to check whether a specific action or target is currently blocked by existing safety interlocks and see what the current stop or authorization decision says.

## Input Source

- Use existing SafetyInterlocks snapshot input only.
- Use explicit action and target input only.
- Keep supplied target order unchanged.

## Render Path

1. Gather current SafetyInterlocks snapshot records.
2. Gather explicit `interlockId`, `actionCategory`, and `targets` input.
3. Pass input to `RedTagSkill.renderRedTag`.
4. Return deterministic evaluation output.

## Output Contract

Route output includes:

- `route`
- `evaluated`
- `interlockId`
- `actionCategory`
- `targets`
- `triggered`
- `decision`
- `requiresAuthorization`
- `mayProceed`
- `protectedTargetHits`
- `operatorPrompt`
- `rationale`
- `evidence`
- `evaluationState`
- `renderNote`

## Must Not

- alter runtime state
- alter SafetyInterlocks rules
- add stateful tag lifecycle behavior
- add shared-contract widening
- add advisory output
- add comparative or ordering math
- guess missing action or target input
- add any route beyond `/red-tag`
