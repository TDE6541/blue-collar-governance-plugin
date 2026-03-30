# BUDDY_SYSTEM.md
**Status:** Wave 4 Block C1 contract baseline
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 4 Block C1 contract baseline for `BuddySystem`.

`BuddySystem` is a live watcher-only oversight layer.

## Boundary

`BuddySystem` defines:

- live scope monitoring callouts
- live constraint monitoring callouts
- light live truthfulness monitoring callouts
- operator presence monitoring (Dead Man's Switch)
- chain-authored callout event writing to existing Forensic Chain

This spec does not define:

- code building or code fixing behavior
- automatic reverts
- fix suggestions
- operator override behavior
- multi-agent control room behavior
- anomaly intelligence or analytics logic
- replacement of Foreman's Walk post-session verification

## Public And Internal Names

- Public/operator-facing label: `Buddy`
- Internal build name: `BuddySystem`
- Core live event object: `BuddyCallout`

## Callout Types (v1)

Allowed callout types:

- `DRIFT`
- `VIOLATION`
- `PHANTOM`
- `PRESENCE_TIMEOUT`
- `ESCALATION`

## Urgency Levels (v1)

Allowed urgency levels:

- `HALT`
- `WARN`
- `INFORM`

## Shared-Core / Separate-Envelope Rule

- Buddy callouts reuse approved classification intent.
- Buddy callouts remain separate live-event envelopes.
- Foreman's Walk findings remain post-session audit envelopes.
- Wave 3 finding schema is not mutated into a live-event blob.

## BuddyCallout Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `calloutId` | string | Yes | Stable callout id in session scope. |
| `sessionId` | string | Yes | Session id where live event was observed. |
| `buddyId` | string | Yes | Watcher identity. |
| `calloutType` | enum | Yes | One of v1 callout types. |
| `urgency` | enum | Yes | One of `HALT`, `WARN`, `INFORM`. |
| `summary` | string | Yes | Operator-readable live-event summary. |
| `detectedAt` | string | Yes | ISO 8601 timestamp. |
| `sourceRefs` | string[] | Yes | Source refs for detection context. |
| `evidenceRefs` | string[] | No | Evidence refs for detection context. |
| `chainEntryRef` | string | Yes | Forensic chain entry id written by Buddy. |

## Forensic Chain Write Rule

- Buddy writes directly to existing `ForensicChain`.
- Buddy-authored callouts are written as forensic entries.
- Buddy-authored entries are immutable after append.
- No second operational substrate is introduced.

## Dead Man's Switch

- Default timeout is 15 minutes.
- Configuration belongs to Buddy/session policy (`deadManTimeoutMinutes`).
- Configuration does not belong to Control Rod profile.
- On timeout, Buddy emits `PRESENCE_TIMEOUT` callout and session pause semantics are recorded.

## Hard Rules

Buddy v1:

- does not build
- does not fix
- does not revert
- does not suggest fixes
- does not override operator
- does not manage multiple agents
- does not add anomaly/analytics logic
- does not replace Foreman's Walk

## Contract Invariants

- Buddy is watcher-only live oversight.
- Forensic Chain remains evidence substrate only.
- Continuity remains the only cross-session operational substrate.
- No Wave 5 behavior is introduced.

## Current Implementation Truth

- This is a Block C1 spec baseline.
- Runtime implementation exists at `src/BuddySystem.js`.
- Golden proof exists at `tests/golden/BuddySystem.golden.test.js`.
