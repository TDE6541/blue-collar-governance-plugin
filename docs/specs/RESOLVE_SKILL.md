# RESOLVE_SKILL.md
**Status:** B' Phase 1 authoring surface contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Phase 1 contract baseline for `ResolveSkill`.

The slice introduces one operator-facing route as a thin authoring surface:

- `/resolve`

## Boundary

`ResolveSkill` defines:

- deterministic restoration-record authoring over explicit input
- optional append of the authored restoration record into existing `ForensicChain` truth through an `OPERATOR_ACTION` entry
- explicit Board-projection eligibility visibility

This spec does not define:

- continuity mutation
- Board mutation
- hidden restoration storage
- workflow queues
- new chain entry families

## Fixed Mapping Rule

- `/resolve` must use existing `RestorationEngine.createRecord(...)`.
- Manual findings must supply explicit identity ingredients.
- `/resolve` must not accept a summary-only manual fallback.
- Board projection remains continuity-only and is eligibility-only here, not a write.

## `/resolve`

Input uses the `RestorationEngine.createRecord(...)` contract.

Route behavior:

1. Normalize the restoration record through `RestorationEngine.createRecord(...)`.
2. If a chain append callback is supplied, append one `OPERATOR_ACTION` chain entry with `payload.action = "restoration_recorded"`.
3. Return the authored restoration record plus deterministic projection-eligibility status.

### `/resolve` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/resolve`. |
| `action` | string | Yes | Literal `recorded`. |
| `record` | object | Yes | Authored `RestorationRecord`. |
| `projectionEligibility` | object | Yes | Deterministic Board-projection eligibility state. |
| `chainEntryId` | string \| null | Yes | Existing appended `ForensicChain` entry id when persistence callback is used; otherwise `null`. |

`projectionEligibility` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `eligible` | boolean | Yes | Whether this record is continuity-safe and verified for Board resolved-outcomes projection. |
| `reason` | string | Yes | `READY_FOR_BOARD`, `NO_CONTINUITY_LINK`, or `NOT_VERIFIED`. |

## Contract Invariants

- route set is fixed to exactly `/resolve`
- authoring remains deterministic for same input
- manual identity requires explicit ingredients
- no Board write path is introduced
- no continuity write path is introduced
- no hidden store is introduced

## Current Implementation Truth

- Runtime authoring implementation exists at `src/ResolveSkill.js`.
- Golden proof exists at `tests/golden/ResolveSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/resolve/SKILL.md`.
