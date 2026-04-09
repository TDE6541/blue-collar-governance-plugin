# RESTORATION_ENGINE.md
**Status:** B' Phase 1 contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Phase 1 contract baseline for `RestorationEngine`.

`RestorationEngine` creates deterministic restoration records from explicit input and derives those records from existing `ForensicChain` `OPERATOR_ACTION` entries without introducing a new persistence substrate.

## Boundary

`RestorationEngine` defines:

- deterministic `findingRef` derivation from published source truth or explicit manual identity ingredients
- deterministic `RestorationRecord` creation
- deterministic restoration-record derivation from existing `ForensicChain` read truth

This spec does not define:

- chain persistence storage
- continuity mutation
- `OpenItemsBoard` mutation
- `WarrantyMonitor` mutation
- hook-runtime mutation
- hidden cache or restoration ledger storage

## Public And Internal Names

- Public/operator-facing label: `Restoration Engine`
- Internal build name: `RestorationEngine`
- Core contract object: `RestorationRecord`

## Source Types

`findingIdentity.sourceType` must be one of:

- `standing_risk`
- `omission`
- `foremans_walk`
- `manual`

## Outcomes

`outcome` must be one of:

- `resolve`
- `dismiss`
- `explicitly_accept`

## Verification States

`verificationState` must be one of:

- `UNVERIFIED`
- `VERIFIED`

When `verificationState=VERIFIED`, `verificationEvidenceRefs` is required and must be non-empty.

## Create Input Contract

`RestorationEngine.createRecord(...)` input includes:

| Field | Type | Required | Description |
|---|---|---|---|
| `finding` | object | Yes | Source-specific finding identity object. |
| `outcome` | enum | Yes | `resolve`, `dismiss`, or `explicitly_accept`. |
| `summary` | string | Yes | Plain-language restoration summary. |
| `sessionId` | string | Yes | Session id for this restoration action. |
| `recordedAt` | string | Yes | ISO 8601 timestamp. |
| `recordedBy` | string | Yes | Operator or actor recording the restoration. |
| `sourceRefs` | string[] | Yes | Source references supporting the restoration action. |
| `evidenceRefs` | string[] | No | Supplemental evidence references. |
| `verificationState` | enum | No | Defaults to `UNVERIFIED` when omitted. |
| `verificationEvidenceRefs` | string[] | Conditional | Required and non-empty when `verificationState=VERIFIED`. |
| `continuityEntryId` | string | No | Explicit continuity link used only for continuity-safe Board projection. |

### `finding` Shape By Source Type

#### `standing_risk`

- `sourceType`
- `entryId`

#### `omission`

- `sourceType`
- `sessionId`
- `profilePack`
- `missingItemCode`

#### `foremans_walk`

- `sourceType`
- `sessionOfRecordRef`
- `issueRef`

#### `manual`

- `sourceType`
- `manualFindingKey`
- `findingType`
- `sourceArtifact`
- `sourceLocation`

Manual creation must not derive identity from free-text summary alone.

## `RestorationRecord` Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `restorationId` | string | Yes | Deterministic restoration record identifier. |
| `findingRef` | string | Yes | Deterministic normalized finding reference. |
| `findingIdentity` | object | Yes | Normalized source-specific identity object. |
| `outcome` | enum | Yes | `resolve`, `dismiss`, or `explicitly_accept`. |
| `summary` | string | Yes | Plain-language restoration summary. |
| `sessionId` | string | Yes | Session id for this restoration action. |
| `recordedAt` | string | Yes | ISO 8601 timestamp. |
| `recordedBy` | string | Yes | Actor who recorded the restoration. |
| `continuityEntryId` | string \| null | Yes | Explicit continuity link when present; otherwise `null`. |
| `sourceRefs` | string[] | Yes | Source references copied from input. |
| `evidenceRefs` | string[] | Yes | Supplemental evidence references; may be empty. |
| `verificationState` | enum | Yes | `UNVERIFIED` or `VERIFIED`. |
| `verificationEvidenceRefs` | string[] | Yes | Verification evidence references; may be empty only when `UNVERIFIED`. |
| `chainEntryId` | string | No | Existing `ForensicChain` entry id when the record is derived from chain truth. |

## Chain-Carried Shape

When restoration is persisted through existing `ForensicChain` truth, it is carried in an `OPERATOR_ACTION` entry with:

- `payload.action = "restoration_recorded"`
- `payload.record = <RestorationRecord snapshot>`

No new entry family is introduced.

## Derivation Path

`RestorationEngine.listRecords(...)` reads an existing `ForensicChain` entry array and returns restoration records from matching `OPERATOR_ACTION` entries only.

Non-restoration chain entries are ignored.

Returned records are ordered deterministically by:

1. `recordedAt`
2. `restorationId`
3. `chainEntryId`

## Contract Invariants

- `findingRef` is deterministic for the same explicit input.
- Manual identity requires explicit ingredients and never falls back to summary-only identity.
- The engine is stateless.
- No Board, continuity, or warranty mutation is introduced.
- No second persistence substrate is introduced.

## Current Implementation Truth

- Runtime implementation exists at `src/RestorationEngine.js`.
- Golden proof exists at `tests/golden/RestorationEngine.golden.test.js`.
- Continuity-safe projection helper exists at `src/RestorationProjectionAdapter.js` with golden proof at `tests/golden/RestorationProjectionAdapter.golden.test.js`.
