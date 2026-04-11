**Status:** Packet 4 temporal signals architecture truth lock (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document hard-locks the bounded Packet 4 temporal lane for Confidence.

Packet 4 is an additive interpretation layer over explicit dated snapshot timelines only.

## Locked Truth

- Time source is explicit only: each timeline entry must provide `observedAt` plus a Packet 3 `snapshot`.
- Packet 4 ships a new derived engine only: `MarkerTemporalSignalsEngine`.
- `ConfidenceGradientEngine.scan(files)` meaning remains unchanged.
- `ConfidenceGradientEngine.buildSnapshot(files)` meaning remains unchanged.
- `MarkerContinuityEngine.compare(previousSnapshot, currentSnapshot)` meaning remains unchanged.
- `/confidence` remains read/query/render-only and gains one optional additive temporal section only when explicit temporal input is supplied.

## Explicit Time Source

Packet 4 time comes only from explicit ordered timeline entries shaped as:

- `observedAt`
- `snapshot`

Packet 4 must not infer time from:

- filesystem metadata
- git history
- branch age
- session date
- closeout date

## Derived Engine Architecture

- `MarkerTemporalSignalsEngine` consumes explicit dated timeline entries only.
- Packet 3 comparison rules remain the lineage gate for temporal claims.
- Temporal age attaches only to current markers in the latest snapshot.
- Current-tier age starts when the lineage last entered its current tier.
- If same-tier lineage cannot be proven cleanly, Packet 4 gets no age claim.

## Safe Temporal Vocabulary

Packet 4 may emit only these temporal findings:

- `STALE_HOLD`
- `UNRESOLVED_KILL`

Packet 4 may emit only these deterministic timeline or lineage errors:

- `TIMELINE_TOO_SHORT`
- `TIMELINE_TIMESTAMP_INVALID`
- `TIMELINE_ORDER_INVALID`
- `TIMELINE_MARKER_FAMILY_MISMATCH`
- `TIMELINE_SCAN_FENCE_MISMATCH`
- `TEMPORAL_LINEAGE_AMBIGUOUS`

## No Aging Of Required Coverage

- Packet 2 required coverage remains a separate explicit opt-in surface.
- Required coverage misses do not enter Packet 4 temporal findings.
- Packet 4 does not age, trend, or reinterpret `REQUIRED_COVERAGE_MISSING`.

## No-Risk-Promotion List

Packet 4 must not emit or imply:

- `RESOLVED`
- `FIXED`
- `IMPROVED`
- `RISK_ESCALATED`
- `STANDING`
- `ACCEPTED`
- any score
- any priority
- any health language
- any standing-risk language
- any resolution language

## Bounded Trend Posture

Trend remains bounded to:

- earliest versus latest tier totals
- net deltas by tier
- counts of `matched`, `newlyObserved`, `noLongerObserved`, `moved`, `retiered`, and `ambiguous`

Packet 4 does not ship:

- percentages
- trend lines
- health scores
- risk scores
- good/bad judgments

## Migration Guard

- Packet 4 is additive only.
- Packet 4 does not introduce a repo-global temporal policy file.
- Thresholds are explicit per evaluation and echoed in output.
- `MIGRATIONS.md` remains unchanged unless an additive route section unexpectedly becomes a shared-contract widening.
- If a shared-contract widening appears, stop with `HOLD`.

## Empty Repo Proof Posture

- Current real repo Confidence scan posture is empty.
- The bounded Confidence scan fence currently has zero observed slash-family markers.
- Packet 4 therefore cannot claim live repo stale/unresolved proof from current repo state.
- Packet 4 proof must use explicit dated synthetic timeline entries in tests.

## Deferred Beyond Packet 4

Packet 4 does not ship:

- semicolon-family execution
- rename-aware continuity
- cross-file continuity
- Standing Risk reuse
- Forensic Chain writes
- Foreman's Walk widening
- hook or lifecycle integration
- Packet 2 temporalization
- git- or filesystem-derived time

## Current Implementation Truth

- Runtime implementation lives at `src/MarkerTemporalSignalsEngine.js`.
- `/confidence` temporal composition lives at `src/ConfidenceSkill.js`.
- Golden proof lives at `tests/golden/MarkerTemporalSignalsEngine.golden.test.js` and `tests/golden/ConfidenceSkill.golden.test.js`.
