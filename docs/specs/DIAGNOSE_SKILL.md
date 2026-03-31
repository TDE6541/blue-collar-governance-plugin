# DIAGNOSE_SKILL.md
**Status:** Wave 5B post-census read/query/render-only slice contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B contract baseline for `DiagnoseSkill`.

The slice introduces one operator-facing route as an evidence-linked diagnostic view:

- `/diagnose`

## Boundary

`DiagnoseSkill` defines:

- deterministic read/query/render output for one route
- evidence-linked drilldown over existing Walk findings and existing Chain entries
- explicit matched and unmatched evidence reference visibility

This spec does not define:

- any state mutation path
- any engine logic change
- any route beyond `/diagnose`
- weighted ordering math
- numeric confidence math
- unsupported causal claims

## Public And Internal Names

- Public/operator-facing label: `Diagnose Skill`
- Internal build name: `DiagnoseSkill`
- Core route: `/diagnose`

## Fixed Mapping Rule

- `/diagnose` maps to existing `ForemansWalk` truth and existing `ForensicChain` truth only.
- Route behavior remains read/query/render-only.
- Mapping reinterpretation is not allowed in this slice.

## Read/Query/Render-Only Posture

- The slice consumes existing Walk + Chain read truth only.
- The slice renders deterministic route views only.
- The slice introduces no hidden mutation behavior.
- The slice introduces no shared-contract widening.

## `/diagnose`

Input includes two required fields:

- `walkEvaluation`: object with existing Walk findings
- `chainView`: object with existing Chain read entries

`walkEvaluation` minimum shape:

- `findings`: object[] where each item contains `issueRef`, `findingType`, `severity`, `pass`, `summary`, `evidenceRefs`

`chainView` minimum shape:

- `chainId`: string
- `entries`: object[] where each item contains `entryId`, `entryType`, `payload`, `linkedEntryRefs`

Route behavior:

- preserve Walk findings exactly as supplied
- compute deterministic count maps from supplied findings and supplied chain entries
- link evidence references to chain entries by exact `entryId` string match only
- expose unmatched evidence references without inference

### `/diagnose` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/diagnose`. |
| `chainId` | string | Yes | Chain id copied from input. |
| `findingCount` | integer | Yes | Count of Walk findings. |
| `findingSummary` | object | Yes | Count map by finding type from Walk findings only. |
| `chainEntryCount` | integer | Yes | Count of chain entries. |
| `chainEntryTypeSummary` | object | Yes | Count map by chain entry type (`CLAIM`, `EVIDENCE`, `GAP`, `FINDING`, `OPERATOR_ACTION`). |
| `linkedEvidenceRefCount` | integer | Yes | Number of evidence refs that matched a chain entry id. |
| `unlinkedEvidenceRefCount` | integer | Yes | Number of evidence refs with no chain entry match. |
| `diagnostics` | object[] | Yes | Deterministic diagnostic list with evidence links. |

`diagnostics` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `issueRef` | string | Yes | Walk issue reference. |
| `findingType` | string | Yes | Walk finding type. |
| `severity` | string | Yes | Walk severity label. |
| `pass` | string | Yes | Walk pass label. |
| `summary` | string | Yes | Walk finding summary. |
| `evidenceRefs` | string[] | Yes | Walk evidence refs copied from input. |
| `linkedChainEntries` | object[] | Yes | Chain entries matched by exact evidence-ref id match. |
| `unlinkedEvidenceRefs` | string[] | Yes | Evidence refs not matched to chain entry ids. |

`linkedChainEntries` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `entryId` | string | Yes | Matched chain entry id. |
| `entryType` | string | Yes | Matched chain entry type. |
| `payloadSummary` | string | No | `payload.summary` when present as a string. |
| `linkedEntryRefs` | string[] | Yes | Existing chain linkage refs. |

## Contract Invariants

- route set is fixed to exactly `/diagnose`
- output is deterministic for same input
- input objects remain unchanged after rendering
- evidence linking is exact string match only
- no hidden write path is introduced

## Current Implementation Truth

- Runtime adapter implementation exists at `src/DiagnoseSkill.js`.
- Golden proof exists at `tests/golden/DiagnoseSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/diagnose-SKILL.md`.
