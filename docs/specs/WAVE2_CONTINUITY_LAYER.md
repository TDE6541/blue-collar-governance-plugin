# WAVE2_CONTINUITY_LAYER.md
**Status:** Block A and Block B1 baselines implemented; Architect signoff pending
**Audience:** Architect, implementers, maintainers

## Purpose

This document is the Wave 2 umbrella baseline for continuity-first progression in the Blue Collar Governance Plugin runtime.

Wave 2 begins by establishing a persisted continuity substrate before any derived risk or board views.

## Locked Wave 2 Cut

Wave 2 ships four things only:

1. Continuity Ledger v0
2. Standing Risk Engine v1
3. Omission & Coverage Engine v1
4. Open Items Board v1

Block A delivers Continuity Ledger v0. Block B1 delivers Standing Risk Engine v1 derived baseline (spec + logic + golden proof).

## Continuity-First Posture

Continuity Ledger is the persisted substrate.

Standing Risk, Omission/Coverage, and Open Items Board are later derived or review layers.

## Block A Scope

Block A includes:

- continuity qualification and persistence rules
- carry-forward aging using session-count and carry-count
- operator outcome handling using `resolve`, `dismiss`, and `explicitly_accept`
- source and evidence linkage back to session artifacts

Block A excludes:

- standing-risk derivation logic
- omission-coverage analysis logic
- board aggregation or board rendering logic
- watcher, anomaly, adaptive trust, rights, and warranty layers

## Block B1 Scope

Block B1 includes:

- derived standing-risk contract and state progression (`OPEN`, `CARRIED`, `STANDING`)
- terminal state mapping from continuity operator outcomes (`RESOLVED`, `DISMISSED`, `EXPLICITLY_ACCEPTED`)
- explicit `continuationSignals` input contract for deterministic triad evaluation

Block B1 excludes:

- standing-risk persistence substrate
- score/rank/prediction logic
- omission/coverage runtime
- board runtime

## Carry-Forward Eligibility

Continuity may include only unresolved, still-relevant items in these classes:

- unresolved Holds
- still-relevant blocked protected/destructive operations
- operator-deferred decisions that constrain later work
- unresolved omission findings that survive closeout

Continuity must not include:

- rejected unauthorized changes
- dismissed false positives
- informational notes
- completed closed events

## Block A Acceptance Boundaries

Block A is complete only if:

- `docs/specs/CONTINUITY_LEDGER.md` defines qualifying and non-qualifying continuity behavior
- runtime exists at `src/ContinuityLedger.js`
- golden proof exists at `tests/golden/ContinuityLedger.golden.test.js`
- no Standing Risk, Omission/Coverage, or Open Items Board runtime behavior is implemented
- no SessionBrief/SessionReceipt contract widening is required

## Current Implementation Truth

- Block A continuity baseline spec exists at `docs/specs/CONTINUITY_LEDGER.md`.
- Block A runtime exists at `src/ContinuityLedger.js`.
- Block A golden proof exists at `tests/golden/ContinuityLedger.golden.test.js`.
- Block B1 standing-risk baseline is implemented as derived logic (`docs/specs/STANDING_RISK_ENGINE.md`, `src/StandingRiskEngine.js`, `tests/golden/StandingRiskEngine.golden.test.js`).
- Omission/Coverage and Open Items Board are not implemented in Block B1.