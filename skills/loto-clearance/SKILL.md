# /loto-clearance

## Purpose

Create or revoke LOTO clearances for HARD_STOP domains. These clearances are consumed by the hook runtime at PreToolUse time to allow scoped passage through otherwise-blocked domains.

## Operations

- `create` — author a new active LOTO clearance
- `revoke` — revoke an existing active LOTO clearance

## Input

### Create

Requires: domainId, operatorName, reason, sessionId, scope (SESSION or EXPIRY), optional conditions.

### Revoke

Requires: clearanceId, sessionId.

## Must Not

- evaluate permit gates
- alter Control Rod profiles
- widen shared contract shapes
- add workflow or queue behavior
