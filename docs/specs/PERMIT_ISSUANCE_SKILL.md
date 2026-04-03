# PERMIT_ISSUANCE_SKILL.md
**Status:** Wave 6B Block B contract baseline
**Audience:** Architect, implementers, maintainers

## Purpose

`/issue-permit` is an operator-facing surface for creating and revoking permit decisions that the hook runtime consumes at PreToolUse time for HARD_STOP domain passage.

## Boundary

This skill creates and revokes `PermitDecision` objects in session state. It does not evaluate permit gates, resolve profiles, or alter Control Rod posture. `/permit` remains a separate evaluate/render-only surface.

## Operations

- `create` — author a new active permit for a HARD_STOP domain
- `revoke` — revoke an existing active permit by its id

## Single Active Match Policy

Only one active permit may exist per domainId at a time. A `create` call when a matching active permit already exists for the same domain returns a `DUPLICATE_ACTIVE` error. To replace, revoke first, then create.

## Scope

Permits are session-scoped only in v1. The permit `sessionId` must match the gate `sessionId` at evaluation time.

## Domain Policy

Single-domain only in v1. The `domainId` input produces a `requestedDomains` array with exactly one entry.

## Chain Evidence

- `create` writes an `OPERATOR_ACTION` chain entry with `action: "permit_created"`
- `revoke` writes an `OPERATOR_ACTION` chain entry with `action: "permit_revoked"`

## Output Contract

### Create

Returns `{ action: "created", permit: <normalized PermitDecision>, chainEntryId }`.

### Revoke

Returns `{ action: "revoked", permitId, chainEntryId }`.

## Must Not

- evaluate permit gates (that is `/permit`)
- alter Control Rod profiles
- widen `PermitDecision` shape beyond what `ControlRodMode` already accepts
- add queue, inbox, or workflow behavior
- implement in-place update (revoke + create instead)
- support multi-domain permits in v1

## Current Implementation Truth

- Runtime: `src/PermitIssuanceSkill.js`
- Golden proof: `tests/golden/PermitIssuanceSkill.golden.test.js`
- Skill artifact: `skills/issue-permit/SKILL.md`
