# SESSION_LIFECYCLE_SKILLS.md
**Status:** Wave 5B Block A baseline plus Packet 5 `/walk` confidence sidecar composition (v2)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B Block A Session Lifecycle skill tranche contract baseline.

The tranche introduces four operator-facing skills that are read/query/render-only surfaces over already-shipped engine outputs:

- `/toolbox-talk`
- `/receipt`
- `/as-built`
- `/walk`

## Boundary

This spec defines:

- deterministic skill-surface output contracts for the four approved routes
- input validation rules for adapting existing engine outputs
- explicit anti-widening and anti-gamification constraints for skill surfaces
- additive Packet 5 canonical `/walk` confidence sidecar composition from optional precomputed input

This spec does not define:

- new engine behavior or new engine write paths
- SessionBrief schema changes
- SessionReceipt schema changes
- Foreman's Walk contract changes
- hook-runtime contract changes
- Control Rod enum/profile changes
- Operator Trust Ledger, Journeyman, Warranty, or Scarcity contract changes
- skins, onboarding, package, install, runtime-hook, compatibility, or marketplace behavior
- confidence scan, required-coverage, marker-continuity, or temporal engine behavior
- telemetry, phone-home, external API, account-required, or payment-gate behavior
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing tranche label: `Session Lifecycle Skills`
- Internal build name: `SessionLifecycleSkills`
- Core routes: `/toolbox-talk`, `/receipt`, `/as-built`, `/walk`

## Read/Query/Render-Only Posture

- Session Lifecycle skills consume existing engine outputs only.
- Session Lifecycle skills render deterministic views only.
- Session Lifecycle skills do not mutate existing engine state.
- Session Lifecycle skills do not introduce hidden write paths.
- Session Lifecycle skills do not widen shared contracts.

## Route Contracts

## `/toolbox-talk`

Input: `SessionBrief` object from existing SessionBrief read path (`getBrief` or equivalent read source).

Output object:

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/toolbox-talk`. |
| `briefId` | string | Yes | Source brief id. |
| `available` | boolean | Yes | Whether `toolboxTalk` enrichment is present. |
| `summary` | string | Yes | Toolbox summary text or deterministic fallback text when unavailable. |
| `counts` | object | Yes | Non-negative integer map from `toolboxTalk.counts` or empty object when unavailable. |
| `refs` | string[] | Yes | Ref list from `toolboxTalk.refs` or empty array when unavailable. |
| `currentHazards` | string[] | Yes | Current hazards list or empty array when unavailable. |
| `activeDeferredChangeOrderSummary` | string or null | Yes | Summary string when available, else `null`. |
| `permitLockoutSummary` | string or null | Yes | Summary string when available, else `null`. |
| `continuityStandingRiskSummary` | string or null | Yes | Summary string when available, else `null`. |

## `/receipt`

Input: `SessionReceipt` object from existing SessionReceipt read path (`getReceipt` or equivalent read source).

Output object:

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/receipt`. |
| `receiptId` | string | Yes | Receipt id. |
| `briefRef` | string | No | Referenced brief id when present on receipt. |
| `outcome` | enum | Yes | `complete`, `complete_with_holds`, `partial`, or `stopped`. |
| `signoffRequired` | boolean | Yes | Receipt signoff flag. |
| `summary` | string | Yes | Session summary text. |
| `holdsRaised` | string[] | Yes | Raised hold refs. |
| `approvedDrift` | string[] | Yes | Approved drift items. |
| `excludedWork` | string[] | Yes | Excluded work list. |
| `artifactsChanged` | string[] | Yes | Changed artifact list recorded in receipt. |
| `createdBy` | string | Yes | Actor recorded by receipt. |
| `createdAt` | string | Yes | Receipt creation timestamp. |
| `updatedAt` | string | No | Receipt update timestamp when present. |

## `/as-built`

Input: As-Built summary object from existing SessionReceipt read/query path (`summarizeAsBuilt` output).

Output object:

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/as-built`. |
| `receiptId` | string | Yes | Source receipt id. |
| `outcome` | enum | Yes | Receipt outcome from summary. |
| `signoffRequired` | boolean | Yes | Receipt signoff flag from summary. |
| `plannedButIncomplete` | string[] | Yes | Planned items not completed and not untouched. |
| `unplannedCompleted` | string[] | Yes | Completed items outside planned + approved drift lists. |
| `holdsRaised` | string[] | Yes | Raised hold refs. |
| `approvedDrift` | string[] | Yes | Approved drift items. |
| `excludedWork` | string[] | Yes | Excluded work list. |
| `summary` | string | Yes | Summary text. |

## `/walk`

Input:

- Foreman's Walk evaluation object from existing Foreman's Walk read/query path (`evaluate` output)
- optional `confidenceSidecarView` object supplied only when a caller already has precomputed Packet 5 confidence sidecar data

Output object:

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/walk`. |
| `findingCount` | number | Yes | Number of findings in evaluation output. |
| `findingSummary` | object | Yes | Count map by finding type. |
| `findings` | object[] | Yes | Deterministic finding list from evaluation output. |
| `sessionOfRecordRef` | string | Yes | As-Built session-of-record ref from walk output. |
| `asBuiltStatusCounts` | object | Yes | As-Built status count map (`MATCHED`, `MODIFIED`, `ADDED`, `DEFERRED`, `HELD`). |
| `confidence` | object | No | Optional informational Packet 5 sidecar block composed only from supported supplied sidecar sections. |

`confidence` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `source` | string | Yes | Literal `confidence`. |
| `sections` | object[] | Yes | Deterministic ordered sidecar sections composed only from supported supplied sections. |

`confidence.sections` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `sectionId` | string | Yes | Exactly `observedMarkers`, `requiredCoverage`, or `markerContinuity`. |
| `view` | object | Yes | Caller-supplied precomputed informational section payload. |

Packet 5 `/walk` sidecar rules:

- sidecar composition is render-side only
- `/walk` does not run confidence scans or comparisons
- sidecar section order is fixed to `observedMarkers`, `requiredCoverage`, `markerContinuity`
- absent sections are omitted, not fabricated
- temporal sections are not rendered in Packet 5 v1
- sidecar is informational only and must not change findings, severity, blocking posture, clean-closeout posture, `sessionOfRecordRef`, or `asBuiltStatusCounts`

## Anti-Gamification Rule

Session Lifecycle skills must not emit:

- `score`
- `points`
- `badge`
- `rank`
- `leaderboard`
- engagement analytics or social comparison outputs

## Contract Invariants

- Output is deterministic for the same inputs.
- Input objects remain unchanged after rendering.
- Existing engine contracts remain unchanged.
- SessionBrief no-widening remains enforced (`journeymanLevel` is not introduced).
- No hidden write path is introduced.
- Packet 5 `/walk` sidecar composition remains canonical-only and does not widen skin behavior.

## Current Implementation Truth

- This is the Wave 5B Block A baseline plus the additive Packet 5 `/walk` confidence sidecar contract.
- Runtime adapter implementation exists at `src/SessionLifecycleSkills.js`.
- Golden proof exists at `tests/golden/SessionLifecycleSkills.golden.test.js`.
- Packet 5 `/walk` sidecar contract is further locked at `docs/specs/WALK_CONFIDENCE_SIDECAR.md`.
- Operator-facing skill artifacts exist at:
  - `skills/toolbox-talk/SKILL.md`
  - `skills/receipt/SKILL.md`
  - `skills/as-built/SKILL.md`
  - `skills/walk/SKILL.md`
