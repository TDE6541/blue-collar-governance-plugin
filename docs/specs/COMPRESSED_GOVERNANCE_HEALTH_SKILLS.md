# COMPRESSED_GOVERNANCE_HEALTH_SKILLS.md
**Status:** Wave 5B Block E1 contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B Block E1 contract baseline for `CompressedGovernanceHealthSkills`.

The slice adds two operator-facing routes as read/query/render-only surfaces:

- `/prevention-record`
- `/rights`

## Boundary

`CompressedGovernanceHealthSkills` defines:

- deterministic render adapters for the two approved routes
- explicit evidence-only posture for `/prevention-record`
- static manual declaration posture for `/rights`

This spec does not define:

- any new engine logic
- any state mutation path
- any shared contract widening
- any route beyond `/prevention-record` and `/rights`

## Public And Internal Names

- Public/operator-facing label: `Compressed Governance Health`
- Internal build name: `CompressedGovernanceHealthSkills`
- Core routes: `/prevention-record`, `/rights`

## Read/Query/Render-Only Posture

- The slice consumes already-captured governance signals from shipped truth surfaces.
- The slice only renders deterministic route views.
- The slice introduces no hidden mutation behavior.

## `/prevention-record`

Input may include explicit captured signals from these shipped truth surfaces:

- Foreman's Walk findings
- Open Items Board captured items
- Continuity Ledger captured entries
- Standing Risk derived items
- Forensic Chain captured entries

Rules:

- include only explicit already-captured governance signals
- no speculative claims
- no synthetic value math
- no inferred prevented-harm claims
- if no explicit captured signal is supplied, route render must raise `HOLD_INSUFFICIENT_EVIDENCE`

### `/prevention-record` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/prevention-record`. |
| `sessionId` | string | Yes | Caller-supplied session id for this render pass. |
| `sourceCounts` | object | Yes | Per-source counts and total captured signal count. |
| `capturedSignals` | object[] | Yes | Deterministic list of explicit captured governance signals. |

`capturedSignals` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `signalId` | string | Yes | Deterministic signal id in the route view. |
| `sourceSurface` | string | Yes | Surface label for signal origin. |
| `sourceType` | string | Yes | Explicit signal type from source truth. |
| `summary` | string | Yes | Plain-language source summary. |
| `sourceRefs` | string[] | Yes | Source references carried from source truth. |
| `evidenceRefs` | string[] | Yes | Evidence references carried from source truth. |

## `/rights`

`/rights` is a static manual Bill of Rights declaration.

Rules:

- declaration content is static in the tranche surface
- declaration is not derived from trust-state engines
- route remains read/query/render-only

### `/rights` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/rights`. |
| `viewMode` | string | Yes | Literal `MANUAL_STATIC`. |
| `rights` | object[] | Yes | Ordered static declaration entries. |

`rights` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `rightId` | string | Yes | Stable declaration id. |
| `title` | string | Yes | Short declaration title. |
| `declaration` | string | Yes | Plain-language right statement. |

## Contract Invariants

- Route set is fixed to exactly `/prevention-record` and `/rights`.
- `/prevention-record` is explicit-signal-only and must raise HOLD when empty.
- `/rights` is static manual declaration only.
- No hidden mutation path is introduced.

## Current Implementation Truth

- Runtime adapter implementation exists at `src/CompressedGovernanceHealthSkills.js`.
- Golden proof exists at `tests/golden/CompressedGovernanceHealthSkills.golden.test.js`.
- Skill artifacts exist at `skills/prevention-record/SKILL.md` and `skills/rights/SKILL.md`.
