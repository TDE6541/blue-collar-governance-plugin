# B_PRIME_RESTORATION_PHASE1_TRUTH_LOCK.md
**Status:** B' Phase 1 structural truth lock
**Audience:** Architect, implementers, maintainers

## Purpose

This document locks the Phase 1 contract posture for the B' restoration structural lane.

Phase 1 ships only:

- one deterministic `RestorationEngine`
- one thin authoring surface: `/resolve`
- one thin derived ledger view: `/restoration`
- one additive projection adapter that maps verified continuity-linked restoration records into existing `OpenItemsBoard` `currentSessionResolvedOutcomes` input shape

## Frozen Boundaries

Phase 1 must not:

- widen `StandingRiskEngine`, `OmissionCoverageEngine`, `ForemansWalk`, `OpenItemsBoard`, `WarrantyMonitor`, `ContinuityLedger`, `SessionBrief`, `SessionReceipt`, `ControlRodMode`, or `HookRuntime`
- add a second persistence substrate, hidden cache, or hidden ledger
- add new hook enforcement patterns or lifecycle handlers
- add Walk Pass 6
- add recurrence or `RECURRED`
- add new `ForensicChain` entry families
- add migration entries for this lane

## Stable `findingRef` Gate

`findingRef` must be derived from already-published source-engine outputs or from explicit manual identity ingredients only.

### Standing Risk

- Source truth: existing `StandingRiskEngine` output
- Required published ingredient: `entryId`
- Normalized `findingRef`: `standing-risk:<entryId>`

### Omission

- Source truth: existing `OmissionCoverageEngine.evaluate(...)` output
- Required published ingredients: `sessionId`, `profilePack`, `missingItemCode`
- Normalized `findingRef`: `omission:<sessionId>:<profilePack>:<missingItemCode>`

No source-engine widening is allowed to create a new published omission id.

### Foreman's Walk

- Source truth: existing `ForemansWalk.evaluate(...)` output
- Required published ingredients: `sessionOfRecordRef`, `issueRef`
- Normalized `findingRef`: `foremans-walk:<sessionOfRecordRef>:<issueRef>`

### Manual

- Manual findings are allowed only when explicit identity ingredients are supplied.
- Required ingredients: `manualFindingKey`, `findingType`, `sourceArtifact`, `sourceLocation`
- Normalized `findingRef`: `manual:<manualFindingKey>:<findingType>:<sourceArtifact>:<sourceLocation>`

Manual findings must not fall back to free-text summary hashing or summary-only identity.

## `ForensicChain` Reuse Lock

Phase 1 restoration records must be carried through existing `ForensicChain` entry families only.

Phase 1 uses:

- `OPERATOR_ACTION` for authored restoration records

Phase 1 does not add:

- new entry families
- new linkage field families
- new persistence semantics outside existing chain payload/source refs/evidence refs

## Board Projection Lock

`OpenItemsBoard` remains continuity-only for resolved-outcomes projection.

The additive adapter may produce `currentSessionResolvedOutcomes` items only when a restoration record is:

1. `VERIFIED`
2. explicitly linked to an existing `continuityEntryId`

Walk-only and manual-only restored items stay visible on `/restoration` and must not be forced into Board `Resolved this session`.

## Warranty Lock

`WarrantyMonitor` remains unchanged in Phase 1.

No warranty fields, derived rules, or persistence claims are widened by this lane.

## Persistence Lock

Phase 1 runtime is stateless.

- `RestorationEngine` creates normalized restoration records from explicit input.
- `RestorationEngine` derives restoration records from existing `ForensicChain` read truth.
- Persistence, when used, remains existing `ForensicChain` append-only truth via `OPERATOR_ACTION` entries.

No second restoration store is introduced.

## Migration Guard

- `MIGRATIONS.md` remains unchanged.
- If truthful implementation would require widened published output shape, new `ForensicChain` entry families, or widened Board/Walk/Warranty/Standing Risk/Omission contracts, execution must stop with `HOLD`.
