---
name: permit
description: "Evaluate an explicit HARD_STOP permit gate with current Control Rod v2 truth and render the deterministic decision output."
---

# /permit

## Purpose

Use when you want to evaluate an existing HARD_STOP permit gate with explicit input, see the current deterministic gate decision, and review recorded conditions and rationale without creating or managing permit workflow.

## Input Source

- Use existing Control Rod v2 gate input only.
- Use explicit profile, domain, session, and time input only.
- Use supplied authorization and permit objects only.

## Render Path

1. Gather explicit gate input.
2. Pass input to `PermitSkill.renderPermit`.
3. Return deterministic evaluation output.

## Output Contract

Route output includes:

- `route`
- `evaluated`
- `profileId`
- `domainId`
- `sessionId`
- `evaluatedAt`
- `autonomyLevel`
- `requiresLoto`
- `requiresPermit`
- `mayProceed`
- `constrained`
- `statusCode`
- `summary`
- `authorizationRef`
- `permitRef`
- `permitDecision`
- `chainRefs`
- `conditions`
- `evaluationState`
- `renderNote`

## Must Not

- alter runtime state
- alter Control Rod profiles
- add permit queue behavior
- add permit workflow behavior
- add shared-contract widening
- add advisory output
- add comparative or ordering math
- guess missing gate input
- add any route beyond `/permit`
- implement `/lockout`
