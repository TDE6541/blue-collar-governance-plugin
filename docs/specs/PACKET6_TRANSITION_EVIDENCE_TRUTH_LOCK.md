# PACKET6_TRANSITION_EVIDENCE_TRUTH_LOCK.md
**Status:** Packet 6 first-lane structural truth lock (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document hard-locks Packet 6 first-lane scope for confidence transition evidence.

Packet name is fixed:

- `Confidence Transition Evidence`

This lane ships structure only:

- Block 0 truth lock
- Block A pure generator
- Block B dedicated authoring surface
- Block C targeted proof only

## Locked Scope

Packet 6 first lane ships only explicit operator-invoked append of neutral transition comparison outcomes.

Allowed transition classes are fixed to exactly:

- `NEWLY_OBSERVED`
- `NO_LONGER_OBSERVED`
- `RETIERED`

Generated transition entries are fixed to existing chain entry type only:

- `FINDING`

## No-Ship Boundary

Packet 6 first lane does not ship:

- resolution semantics of any kind
- `RESOLVED`
- operator-resolution paths
- restoration crossover
- auto-resolution on disappearance
- write behavior on `/confidence`
- new `ForensicChain` entry types
- `linkedEntryRefs` history graphing
- prior-entry traversal or lookup
- chain contract widening
- migration work

## Dedicated Surface Boundary

This lane introduces a dedicated authoring surface:

- `/confidence-transitions`

It remains separate from `/confidence`.

The new surface must:

- preview generated append-ready `FINDING` entries from explicit compare input
- append only when the operator explicitly requests append

The new surface must not:

- auto-append
- auto-resolve
- infer lifecycle outcomes
- mutate `/confidence`

## Neutral Payload Contract

Generated entry shape must remain existing `ForensicChain` append input shape:

- `entryId`
- `entryType` = `FINDING`
- `recordedAt`
- `sessionId`
- `sourceArtifact`
- `sourceLocation`
- `payload`
- `linkedEntryRefs` (must be `[]` in this lane)

`payload` is minimal and neutral and is grounded in:

- Packet 3 compare output (`status`, `filePath`, `previousMarker`, `currentMarker`, `flags`)
- existing append-only `ForensicChain` entry contract
- existing source reference patterns (`sourceArtifact` + `sourceLocation` string refs)

Allowed payload fields:

- `transitionClass` (`NEWLY_OBSERVED`, `NO_LONGER_OBSERVED`, or `RETIERED`)
- `filePath`
- `previousMarker` when present in compare truth
- `currentMarker` when present in compare truth
- `previousTier` and `currentTier` only for neutral RETIERED capture

Payload must not include fields that imply:

- resolution state
- restoration state
- standing-risk state
- lifecycle state
- linked-history traversal

## Transition Mapping Lock

Transition mapping is fixed:

- compare status `NEWLY_OBSERVED` -> one generated `FINDING` with `transitionClass: NEWLY_OBSERVED`
- compare status `NO_LONGER_OBSERVED` -> one generated `FINDING` with `transitionClass: NO_LONGER_OBSERVED`
- compare status `MATCHED` with `flags` containing `retiered` -> one generated `FINDING` with `transitionClass: RETIERED`
- compare status `MATCHED` without `retiered` -> no generated entry
- compare status `AMBIGUOUS` -> no generated entry

## Untouched Systems Lock

The following must remain untouched in this lane:

- `src/ConfidenceSkill.js`
- `docs/specs/CONFIDENCE_SKILL.md`
- `src/ForensicChain.js`
- `src/ContinuityLedger.js`
- `src/StandingRiskEngine.js`
- `src/ForemansWalk.js`
- `src/HookRuntime.js`
- `src/HookRuntimeSlice2.js`
- `MIGRATIONS.md`

## Reserved Second-Model Lane Items

The following are reserved for a later second-model lane and must remain untouched in this wave:

- front-door sync
- closeout doc authoring
- push
- merge
- second-model truth-sync work

## File Fence

Packet 6 first-lane execution is limited to:

- `docs/specs/PACKET6_TRANSITION_EVIDENCE_TRUTH_LOCK.md`
- `src/ConfidenceTransitionGenerator.js`
- `tests/golden/ConfidenceTransitionGenerator.golden.test.js`
- `docs/specs/CONFIDENCE_TRANSITIONS_SKILL.md`
- `src/ConfidenceTransitionsSkill.js`
- `skills/confidence-transitions/SKILL.md`
- `tests/golden/ConfidenceTransitionsSkill.golden.test.js`

## Stop Conditions

Emit `HOLD` and stop if any of the following become necessary:

- changing `/confidence` to append
- changing `ForensicChain` entry type enum
- editing `src/ForensicChain.js`
- introducing resolution semantics or `RESOLVED`
- introducing auto-resolution on disappearance
- introducing prior-entry lookup, back-linking, or history graphing
- touching `ContinuityLedger`, `StandingRiskEngine`, `ForemansWalk`, `HookRuntime`, `HookRuntimeSlice2`, or `MIGRATIONS.md`
- touching any file outside the approved Packet 6 first-lane fence

## Migration Guard

Packet 6 first lane is additive authoring-surface work only.

Approved posture is:

- no shared-contract widening
- no `MIGRATIONS.md` change
- no front-door sync in this lane
