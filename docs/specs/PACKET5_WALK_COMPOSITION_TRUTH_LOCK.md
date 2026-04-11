# PACKET5_WALK_COMPOSITION_TRUTH_LOCK.md
**Status:** Packet 5 `/walk` confidence sidecar truth lock (Option A only)
**Audience:** Architect, implementers, maintainers

## Purpose

This document hard-locks the bounded Packet 5 `/walk` confidence composition lane.

Packet 5 is a composition packet only.

## Locked Decision

Packet 5 ships Option A only:

- optional precomputed `confidenceSidecarView`
- `/walk` render-side composition only
- canonical-only confidence sidecar posture
- zero `ForemansWalk` engine contract change

Packet 5 does not ship:

- Walk Pass 6
- any `ForemansWalk` widening
- any persistence widening
- any hook-runtime widening
- any skin translation work
- any Packet 4 temporal sidecar support

## Composition Boundary

Packet 5 composition happens only at `/walk` render time from:

- persisted walk truth already present in the repo
- optional supplied `confidenceSidecarView`

Packet 5 `/walk` does not:

- run confidence scans
- build marker snapshots
- compare marker continuity
- evaluate temporal timelines
- discover timeline inputs

Packet 5 consumes precomputed input only.

## Verifier Boundary

`ForemansWalk` remains the verifier spine and stays untouched in Packet 5.

Packet 5 must not change:

- `src/ForemansWalk.js`
- `docs/specs/FOREMANS_WALK_ENGINE.md`
- finding counts
- finding severity
- blocking posture
- clean versus unclean closeout state
- As-Built accountability output

Packet 5 sidecar is informational only.

## Persistence Boundary

Packet 5 must not widen or rewrite persisted walk state.

Do not change:

- `lastWalk`
- `persistedBrief`
- `persistedReceipt`

Do not persist confidence sidecar data into those structures.

## Canonical-Only Sidecar Posture

Packet 5 sidecar v1 is canonical `/walk` composition only.

Packet 5 does not widen:

- supported skin renderers
- skin section vocabularies
- `SkinFramework` route contracts

Existing unsupported skin plus sidecar requests must fail closed to raw canonical `/walk` render under the already-shipped skin fallback behavior.

## Packet 4 Independence

Packet 4 temporal signals may exist elsewhere in current repo truth.

Packet 5 must not depend on Packet 4.

Packet 5 sidecar v1 supports only:

- `observedMarkers`
- `requiredCoverage`
- `markerContinuity`

Packet 5 sidecar v1 does not support:

- `markerTemporalSignals`
- stale HOLD semantics
- unresolved KILL semantics
- trend scoring
- resolution history

## No-Ship List

Do not ship Packet 5 if any of the following become necessary:

- editing `src/ForemansWalk.js`
- editing `docs/specs/FOREMANS_WALK_ENGINE.md`
- editing `src/HookRuntime.js`
- editing `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md`
- editing `src/SkinFramework.js`
- editing `docs/specs/SKIN_FRAMEWORK.md`
- widening `lastWalk`, `persistedBrief`, or `persistedReceipt`
- adding Packet 4 temporal sidecar support
- changing walk findings, severity, blocking, clean-closeout status, `sessionOfRecordRef`, or `asBuiltStatusCounts`
- touching any file outside the approved Packet 5 structural fence
- introducing a migration-grade shared-contract widening

## File Fence

Packet 5 structural execution is limited to exactly:

- `src/SessionLifecycleSkills.js`
- `tests/golden/SessionLifecycleSkills.golden.test.js`
- `docs/specs/SESSION_LIFECYCLE_SKILLS.md`
- `skills/walk/SKILL.md`
- `docs/specs/PACKET5_WALK_COMPOSITION_TRUTH_LOCK.md`
- `docs/specs/WALK_CONFIDENCE_SIDECAR.md`

## Migration Guard

Packet 5 is additive render-side composition only.

Approved posture is:

- no shared-contract widening
- no `MIGRATIONS.md` change
- no front-door sync in this lane

If execution reveals a real need to widen a shared contract or touch a file outside the approved fence, emit `HOLD` and stop.
