# STANDING_RISK_ENGINE.md
**Status:** Proposed contract baseline  
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 2 Block B1 contract baseline for `StandingRiskEngine`.

`StandingRiskEngine` derives escalation state from continuity truth and explicit continuation signals. It does not persist a competing standing-risk substrate.

## Boundary

`StandingRiskEngine` computes derived standing state only.

This spec does not define:

- persistence of standing-risk records
- omission or coverage analysis
- board grouping or board presentation
- anomaly, watcher, or automation branching logic
- scoring, ranking, or prediction logic
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Standing Risk`
- Internal build name: `StandingRiskEngine`
- Core derived object: `StandingRiskView`

## Derived-Only Posture

- Continuity Ledger remains the persisted substrate.
- Standing Risk is recomputed from continuity entries plus explicit `continuationSignals` input.
- No second persistence store is introduced in Block B1.

## Standing States

Derived states are:

- `OPEN`
- `CARRIED`
- `STANDING`

Derived terminal states are:

- `RESOLVED`
- `DISMISSED`
- `EXPLICITLY_ACCEPTED`

## Escalation Triad

Promotion requires all three:

1. unresolved continuity entry (`operatorOutcome` not set)
2. later relevant work continued
3. blast radius still exists

If any triad condition is false, derived state remains `OPEN`.

## Age Model

- Escalation uses `sessionCount` and `carryCount` only.
- Wall-clock time does not escalate state.
- Idle time does not escalate state.

## continuationSignals Input Contract

`continuationSignals` is a first-class Standing Risk evaluation input.

Each signal object must include:

| Field | Type | Required | Description |
|---|---|---|---|
| `entryId` | string | Yes | Continuity entry identifier to evaluate. |
| `relevantWorkContinued` | boolean | Yes | Whether later work continued in a way relevant to this entry. |
| `blastRadiusStillExists` | boolean | Yes | Whether unresolved risk impact is still present. |
| `evidenceRefs` | string[] | Yes | Evidence references supporting the signal values. |

Evaluation context also includes:

| Field | Type | Required | Description |
|---|---|---|---|
| `evaluationSessionId` | string | Yes | Session id for the current standing-risk derivation pass. |

### Session Relevance Rule

A continuation signal is considered for escalation only when:

- `entry.lastSeenSessionId` equals `evaluationSessionId`
- and `entry.lastSeenSessionId` differs from `entry.originSessionId`

This prevents unrelated later sessions from escalating entries.

## Deterministic Progression

For unresolved entries with triad satisfied:

- `carryCount = 0` => `OPEN`
- `carryCount = 1` => `CARRIED`
- `carryCount >= 2` => `STANDING`

## Terminal Outcome Rules

Continuity operator outcomes map directly to terminal standing states:

- `resolve` => `RESOLVED`
- `dismiss` => `DISMISSED`
- `explicitly_accept` => `EXPLICITLY_ACCEPTED`

Terminal states do not continue escalating on the same `entryId`.

## Reappearance Rule

Dismissed, accepted, or resolved entries do not re-escalate on the same `entryId`.

Reappearance requires a new continuity entry id created from new qualifying evidence.

## Non-blocked_operation Rule

For continuity entries where `entryType` is not `blocked_operation`:

- no heuristic scoring
- no NLP inference
- no time-based inference
- no promotion without explicit continuation signal evidence

If explicit continuation signal evidence is absent, derived state remains `OPEN`.

## Current Implementation Truth

- This is a Block B1 spec baseline.
- Runtime implementation exists at `src/StandingRiskEngine.js`.
- Golden proof exists at `tests/golden/StandingRiskEngine.golden.test.js`.
