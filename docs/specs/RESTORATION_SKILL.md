# RESTORATION_SKILL.md
**Status:** B' Phase 1 read/query/render-only slice contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Phase 1 contract baseline for `RestorationSkill`.

The slice introduces one operator-facing route as a derived restoration ledger view:

- `/restoration`

## Boundary

`RestorationSkill` defines:

- deterministic read/query/render output over existing `ForensicChain` read truth
- restoration-record derivation through existing `RestorationEngine.listRecords(...)`
- continuity-safe resolved-outcomes projection through the additive projection adapter only

This spec does not define:

- any state mutation path
- continuity writes
- Board writes
- hidden restoration storage
- any route beyond `/restoration`

## Fixed Mapping Rule

- `/restoration` maps to existing `ForensicChain` read truth only.
- Restoration records are derived from `OPERATOR_ACTION` entries carrying `payload.action = "restoration_recorded"`.
- Board projection remains continuity-only and verified-only.
- Walk-only and manual-only restored items remain in `/restoration` and do not enter Board resolved-outcomes projection unless explicitly continuity-linked and verified.

## `/restoration`

Input includes one required field:

- `chainView`: object with `chainId` and existing `ForensicChain` `entries`

Route behavior:

1. Read existing chain entries.
2. Derive restoration records through `RestorationEngine.listRecords(...)`.
3. Project continuity-safe resolved outcomes through the additive projection adapter only.
4. Return deterministic ledger output.

### `/restoration` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/restoration`. |
| `chainId` | string | Yes | Chain id copied from input. |
| `recordCount` | integer | Yes | Count of derived restoration records. |
| `verifiedCount` | integer | Yes | Count of derived restoration records with `verificationState=VERIFIED`. |
| `boardProjectionCount` | integer | Yes | Count of projected Board resolved-outcomes items after continuity-only filtering and dedupe. |
| `records` | object[] | Yes | Derived restoration ledger records. |
| `boardResolvedOutcomes` | object[] | Yes | Existing `OpenItemsBoard` `currentSessionResolvedOutcomes` shape derived from continuity-safe verified restoration records only. |

`records` item shape includes:

- `chainEntryId`
- `restorationId`
- `findingRef`
- `findingIdentity`
- `outcome`
- `summary`
- `sessionId`
- `recordedAt`
- `recordedBy`
- `continuityEntryId`
- `verificationState`
- `projectionEligibility`
- `sourceRefs`
- `evidenceRefs`
- `verificationEvidenceRefs`

## Contract Invariants

- route set is fixed to exactly `/restoration`
- output is deterministic for same input
- input objects remain unchanged after rendering
- no hidden write path is introduced
- Board projection remains continuity-only

## Current Implementation Truth

- Runtime adapter implementation exists at `src/RestorationSkill.js`.
- Golden proof exists at `tests/golden/RestorationSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/restoration/SKILL.md`.
