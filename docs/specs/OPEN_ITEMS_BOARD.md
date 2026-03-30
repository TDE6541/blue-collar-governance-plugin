# OPEN_ITEMS_BOARD.md
**Status:** Proposed contract baseline  
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 2 Block D1 contract baseline for `OpenItemsBoard`.

`OpenItemsBoard` provides one plain review surface over existing Wave 2 truth so operators can see what is missing now, what remains unresolved, what is aging into risk, and what resolved this session.

## Boundary

`OpenItemsBoard` is projection logic only.

This spec does not define:

- board persistence storage
- grouped-state persistence
- hidden session cache as a second substrate
- writes to continuity, standing risk, or omission outputs
- score, confidence, rank, priority, anomaly, or prediction behavior
- smart-insights or strategy recommendation behavior
- Block E closeout behavior
- storage backend, transport layer, or UI presentation

## One Board Only

Block D1 defines exactly one board:

- Board label: `Open Items Board`

No second board, split dashboard, or insights panel is allowed.

## Fixed Board Groups

Block D1 defines exactly these four groups:

1. `Missing now`
2. `Still unresolved`
3. `Aging into risk`
4. `Resolved this session`

No additional groups are allowed.

## Projection Inputs

`OpenItemsBoard` consumes explicit projection inputs:

| Field | Type | Required | Description |
|---|---|---|---|
| `sessionId` | string | Yes | Session identifier for this board projection pass. |
| `omissionFindings` | OmissionFindingInput[] | Yes | Current-session omission findings input from Block C outputs. |
| `continuityEntries` | ContinuityBoardInput[] | Yes | Continuity entries from persisted continuity truth. |
| `standingRiskView` | StandingRiskBoardInput[] | Yes | Derived standing-risk view input from Block B outputs. |
| `currentSessionResolvedOutcomes` | ResolvedOutcomeInput[] | Yes | Explicit current-session resolved-outcomes input. |

`Resolved this session` must come from `currentSessionResolvedOutcomes` only.

No timestamp inference is allowed.
No continuity-mutation inference is allowed.

## Input Shapes

### OmissionFindingInput

| Field | Type | Required | Description |
|---|---|---|---|
| `findingId` | string | Yes | Stable omission-finding identifier. |
| `summary` | string | Yes | Plain-language omission summary. |
| `missingItemCode` | string | Yes | Deterministic omission code from Block C vocabulary. |
| `profilePack` | string | Yes | Explicit Block C profile pack. |
| `evidenceRefs` | string[] | Yes | Evidence references for this omission finding. |
| `sourceRefs` | string[] | No | Optional source references. |
| `entryId` | string | No | Optional continuity-linked logical id for dedupe. |

### ContinuityBoardInput

| Field | Type | Required | Description |
|---|---|---|---|
| `entryId` | string | Yes | Continuity entry identifier. |
| `summary` | string | Yes | Plain-language continuity summary. |
| `sourceRefs` | string[] | Yes | Source references. |
| `evidenceRefs` | string[] | No | Optional evidence references. |

### StandingRiskBoardInput

| Field | Type | Required | Description |
|---|---|---|---|
| `entryId` | string | Yes | Continuity-linked identifier. |
| `state` | enum | Yes | One of `OPEN`, `CARRIED`, `STANDING`, `RESOLVED`, `DISMISSED`, `EXPLICITLY_ACCEPTED`. |
| `evidenceRefs` | string[] | No | Optional evidence references. |

### ResolvedOutcomeInput

| Field | Type | Required | Description |
|---|---|---|---|
| `entryId` | string | Yes | Continuity-linked identifier resolved this session. |
| `summary` | string | Yes | Plain-language resolved summary. |
| `outcome` | enum | Yes | One of `resolve`, `dismiss`, `explicitly_accept`. |
| `sourceRefs` | string[] | Yes | Source references. |
| `evidenceRefs` | string[] | No | Optional evidence references. |

## Source Truth Per Group

Group sourcing is fixed:

- `Missing now` uses current-session `omissionFindings` input only.
- `Still unresolved` uses continuity items whose derived standing state is `OPEN` or `CARRIED`.
- `Aging into risk` uses continuity items whose derived standing state is `STANDING`.
- `Resolved this session` uses explicit `currentSessionResolvedOutcomes` input only.

## Wave 3 Block 0 Non-Goal Guard

- Wave 3 evidence and findings do not introduce new board groups in Block 0.
- Wave 3 evidence and findings do not introduce new mapping paths in Block 0.
- Wave 3 evidence and findings do not introduce a new board source in Block 0.
- Block D1 remains projection-only over the existing fixed inputs and four fixed groups.

## Group Precedence And Dedupe

If the same logical item could appear in multiple groups, only one placement is allowed.

Precedence order:

1. `Resolved this session`
2. `Aging into risk`
3. `Still unresolved`
4. `Missing now`

Higher-precedence placement suppresses lower-precedence placement.

No duplicate placement is allowed across groups.

## Board Item Shape

Allowed item fields:

- `itemId`
- `summary`
- `sourceRefs`
- `evidenceRefs`
- `stateLabel` (optional)
- `missingItemCode` (optional)
- `profilePack` (optional)

Not allowed:

- `score`
- `confidence`
- `rank`
- `priority`
- `anomaly`
- `prediction`
- strategy or smart-insight fields

## Clean-Session Controls

When omission findings are empty, `Missing now` must be empty.

When standing state has no `STANDING` entries, `Aging into risk` must be empty.

When `currentSessionResolvedOutcomes` is empty, `Resolved this session` must be empty.

## Current Implementation Truth

- This is a Block D1 spec baseline.
- Runtime implementation exists at `src/OpenItemsBoard.js`.
- Golden proof exists at `tests/golden/OpenItemsBoard.golden.test.js`.