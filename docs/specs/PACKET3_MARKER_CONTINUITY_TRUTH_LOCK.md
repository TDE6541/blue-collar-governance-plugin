# PACKET3_MARKER_CONTINUITY_TRUTH_LOCK.md
**Status:** Packet 3 architecture decision lock for marker-local continuity
**Audience:** Architect, implementers, maintainers

## Purpose

This document locks the Packet 3 architecture seam for Confidence marker snapshots and marker continuity comparison.

Packet 3 is a bounded Confidence-local identity lane only.

## Architecture Decision

Packet 3 ships exactly three additive surfaces:

1. `ConfidenceGradientEngine.buildSnapshot(files)`
2. `MarkerContinuityEngine.compare(previousSnapshot, currentSnapshot)`
3. additive opt-in `/confidence` comparison rendering over explicit comparison input

`ConfidenceGradientEngine.scan(files)` remains frozen in meaning and remains the current scan truth surface.

Packet 3 does not reuse or widen:

- `ContinuityLedger`
- `ForensicChain`
- `ForemansWalk`
- hook/runtime surfaces
- lifecycle surfaces
- omission surfaces
- Packet 2 required coverage policy semantics

## Identity Locus

Marker identity lives only inside one normalized file path.

Identity evidence is bounded to:

- normalized `filePath` as a hard boundary
- stable context fingerprint as primary proof
- normalized trailing marker text as optional support
- line movement distance as a weak hint only
- tier as supporting, non-authoritative signal

Identity must not be keyed primarily by:

- domain grouping
- tier
- comment text alone
- semantic concern models
- rename-aware or cross-file logic

Path changes are not continuity in Packet 3.

If the path changes, treat the old-path marker as `NO_LONGER_OBSERVED` and the new-path marker as `NEWLY_OBSERVED`.

## Allowed Outcomes

Packet 3 continuity status is locked to exactly:

- `MATCHED`
- `NEWLY_OBSERVED`
- `NO_LONGER_OBSERVED`
- `AMBIGUOUS`

`MATCHED` may carry only these flags:

- `moved`
- `retiered`

Packet 3 must not emit:

- `RESOLVED`
- `STALE`
- `AGING`
- `PERSISTING_RISK`
- `FIXED`
- `IMPROVED`

## Ambiguity Rule

Packet 3 must preserve ambiguity instead of forcing stronger claims.

When one previous marker plausibly maps to multiple current markers, or one current marker plausibly maps to multiple previous markers, the result is `AMBIGUOUS`.

Line distance and tier may support a safe match only when the candidate set is already unique. They must not break a tie that remains plausibly ambiguous.

## Snapshot Rule

Snapshot capture is:

- explicit
- versioned
- caller-managed
- deterministic
- scan-fence-scoped
- comparison-ready
- slash-only

Snapshot capture introduces:

- no automatic persistence
- no hidden substrate writes
- no disk reads
- no hook/lifecycle behavior

## Comparison Rule

`MarkerContinuityEngine` is a separate deterministic comparison engine.

It must:

- stay file-local only
- reject marker-family mismatch
- reject malformed snapshot shapes
- avoid git history
- avoid rename heuristics
- avoid LLM interpretation
- avoid hidden fuzzy logic

No previous snapshot means bootstrap only and no continuity claims.

## `/confidence` Rule

Comparison mode is additive and opt-in only.

Without explicit comparison input, `/confidence` remains the existing single-scan route.

With explicit comparison input, `/confidence` may add:

- continuity changes
- ambiguous cases

Packet 3 comparison rendering must stay bounded to:

- current scan
- continuity changes
- ambiguous cases
- observed
- moved
- retiered
- newly observed
- no longer observed
- ambiguous

Packet 3 comparison rendering must not introduce:

- reviewed-clean language
- score/trend/health language
- Packet 2 policy dependency

## No-Ship List

Do not ship Packet 3 if any of the following become necessary:

- changing `scan(files)` in place
- breaking existing single-scan `/confidence`
- reusing `ContinuityLedger`
- writing to `ForensicChain`
- widening `ForemansWalk`
- adding hook or lifecycle behavior
- adding semicolon-family support
- adding rename-aware or cross-file continuity
- forcing stronger claims where ambiguity remains
- using domain grouping as an identity key
- touching a file outside the approved Packet 3 structural fence
- introducing a migration-grade shared-contract widening

## Migration Guard

Packet 3 is additive Confidence-local contract work only.

Current approved posture is:

- no shared-contract widening
- no `MIGRATIONS.md` change
- no front-door sync in this structural lane

If execution reveals a real need to widen a shared contract or update a file outside the approved fence, emit `HOLD` and stop.
