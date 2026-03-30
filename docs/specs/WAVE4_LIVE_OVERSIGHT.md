# WAVE4_LIVE_OVERSIGHT.md
**Status:** Block 0 contract gate baseline
**Audience:** Architect, implementers, maintainers

## Purpose

This document locks the Wave 4 umbrella contract for live oversight.

Wave 4 proves live oversight while preserving all shipped Wave 2 and Wave 3 boundaries.

## Locked Wave 4 Cut

Wave 4 ships exactly:

1. Buddy System v1
2. Change Order Engine v1
3. Control Rod Mode v2
4. Toolbox Talk as a SessionBrief enrichment (not a standalone engine)

## Load-Bearing Carry-Forward Boundaries

- Continuity remains the only cross-session operational substrate.
- Standing Risk remains derived from continuity.
- Omission remains evaluation-scoped.
- Open Items Board remains one-board projection-only with exactly four fixed groups.
- Forensic Chain remains an evidence substrate only.
- SessionReceipt remains the session-of-record.
- As-Built remains the accountability delta-of-record.

## Decision Lock: Buddy -> Forensic Direct Write

- Buddy v1 writes callout events directly to existing `ForensicChain`.
- No second operational substrate is introduced.
- No new forensic substrate is introduced.
- Additive ForensicChain field widening is disallowed by default.
- Exactly one additive field is allowed only if implementation proves unavoidable; if proven, that widening must be explicit, minimal, and migration-tracked.

## Decision Lock: Callout vs Finding

- Wave 4 uses a shared classification core and separate delivery envelopes.
- Foreman's Walk findings remain post-session audit objects.
- Buddy callouts remain live-event objects.
- Wave 3 finding schema must not be mutated into a live-event blob.

## Decision Lock: Control Rod Mode v2

Autonomy enum remains exactly:

- `FULL_AUTO`
- `SUPERVISED`
- `HARD_STOP`

No fourth autonomy level is allowed.

Wave 4 upgrades HARD_STOP behavior only through:

- LOTO semantics
- Permit Process semantics

## Decision Lock: Toolbox Talk on SessionBrief

Toolbox Talk is one `toolboxTalk` object on `SessionBrief`.

Allowed fields for v1 landing:

- summary text
- counts
- refs
- current hazards
- active/deferred change-order summary
- active permit/lockout summary
- continuity/standing-risk summary

Not allowed:

- full duplicated findings payloads
- full duplicated change-order payloads
- full duplicated permit payloads
- full duplicated lockout payloads

## Decision Lock: Dead Man's Switch

- Default is 15 minutes.
- Configuration belongs to Buddy/session policy.
- Configuration does not belong to Control Rod profile.

## Change Order Baseline Lock

Change Orders are formal governed documents with statuses:

- `APPROVED`
- `REJECTED`
- `DEFERRED`

Rules:

- Rejected change orders do not auto-revert anything.
- Deferred change orders promote through existing continuity infrastructure.

## Migration Stance

- Block A1 is a required shared-contract migration log update.
- A1 must log Control Rod v1 -> v2 behavioral widening (LOTO + Permit) with unchanged autonomy enum.
- Block D must update `MIGRATIONS.md` if `SessionBrief.toolboxTalk` lands.
- If Toolbox Talk does not land, Block D must not add a migration entry for it.

## Hard Non-Goals

Wave 4 does not ship:

- adaptive learning
- trust scoring
- anomaly intelligence
- board redesign
- continuity redesign
- multi-agent control room behavior
- package/publish/marketplace work

## Current Implementation Truth

- This file is the Block 0 umbrella contract gate.
- No runtime behavior is introduced by Block 0.
- No test behavior is introduced by Block 0.
