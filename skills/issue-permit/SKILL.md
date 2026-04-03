# /issue-permit

## Purpose

Create or revoke permits for HARD_STOP domains. These permits are consumed by the hook runtime at PreToolUse time alongside a valid LOTO clearance to allow scoped passage.

## Operations

- `create` — author a new active permit for a single HARD_STOP domain
- `revoke` — revoke an existing active permit

## Input

### Create

Requires: domainId, sessionId, operatorDecision (GRANTED/DENIED/CONDITIONAL), scopeJustification, riskAssessment, rollbackPlan, optional conditions (required if CONDITIONAL).

### Revoke

Requires: permitId, sessionId.

## Must Not

- evaluate permit gates (that is /permit)
- alter Control Rod profiles
- widen shared contract shapes
- add workflow or queue behavior
- support multi-domain permits in v1
