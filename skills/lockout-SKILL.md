---
name: lockout
description: "Validate an explicit LOTO authorization using existing Control Rod v2 validation truth and render deterministic output."
---

# /lockout

## Purpose

Use when you want to validate a specific LOTO authorization against existing Control Rod v2 rules, see whether the authorization is currently acceptable, and review returned conditions and rationale without creating or managing workflow.

## Input Source

- Use existing Control Rod v2 authorization input only.
- Use explicit authorization input only.
- Keep supplied input unchanged.

## Render Path

1. Gather explicit authorization input.
2. Pass input to `LockoutSkill.renderLockout`.
3. Return deterministic validation output.

## Output Contract

Route output includes:

- `route`
- `evaluated`
- `authorizationValid`
- `authorizationId`
- `domainId`
- `authorizedBy`
- `authorizedAt`
- `reason`
- `scope`
- `conditions`
- `chainRef`
- `evaluationState`
- `renderNote`

## Must Not

- alter runtime state
- alter Control Rod profiles
- call permit-gate evaluation paths
- add queue, inbox, ledger, or workflow behavior
- add shared-contract widening
- add advisory output
- add comparative or ordering math
- guess missing authorization input
- add any route beyond `/lockout`
