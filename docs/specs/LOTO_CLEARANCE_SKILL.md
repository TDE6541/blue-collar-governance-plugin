# LOTO_CLEARANCE_SKILL.md
**Status:** Wave 6B Block B contract baseline
**Audience:** Architect, implementers, maintainers

## Purpose

`/loto-clearance` is an operator-facing authoring surface for creating and revoking LOTO authorization objects that the hook runtime consumes at PreToolUse time for HARD_STOP domain passage.

## Naming Note

The operator-facing route is `/loto-clearance`. Internal file paths use `LotoClearance` to avoid collision with the `*auth*` deny-pattern in the current governance posture. The underlying data shape remains the existing `LotoAuthorization` as defined by `ControlRodMode`.

## Boundary

This skill creates and revokes `LotoAuthorization` objects in session state. It does not evaluate permit gates, resolve profiles, or alter Control Rod posture.

## Operations

- `create` — author a new active LOTO clearance for a HARD_STOP domain
- `revoke` — revoke an existing active LOTO clearance by its id

## Single Active Match Policy

Only one active LOTO clearance may exist per domainId at a time. A `create` call when a matching active entry already exists returns a `DUPLICATE_ACTIVE` error. To replace, revoke first, then create.

## Scope Support

- `SESSION` — bound to a session id
- `EXPIRY` — bound to an expiry timestamp (ISO 8601)

## Chain Evidence

- `create` writes an `OPERATOR_ACTION` chain entry with `action: "authorization_created"`
- `revoke` writes an `OPERATOR_ACTION` chain entry with `action: "authorization_revoked"`

## Output Contract

### Create

Returns `{ action: "created", clearance: <normalized LotoAuthorization>, chainEntryId }`.

### Revoke

Returns `{ action: "revoked", clearanceId, chainEntryId }`.

## Must Not

- evaluate permit gates
- alter Control Rod profiles
- widen `LotoAuthorization` shape beyond what `ControlRodMode` already accepts
- add queue, inbox, or workflow behavior
- implement in-place update (revoke + create instead)

## Current Implementation Truth

- Runtime: `src/LotoClearanceSkill.js`
- Golden proof: `tests/golden/LotoClearanceSkill.golden.test.js`
- Skill artifact: `skills/loto-clearance/SKILL.md`
