# FOREMANS_WALK_ENGINE.md
**Status:** Proposed contract baseline  
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 3 Block C1 contract baseline for `ForemansWalk`.

`ForemansWalk` is a deterministic post-session verification engine that validates session execution against scope, control-rod posture, completeness, truthfulness, and evidence integrity.

## Boundary

`ForemansWalk` reads:

- `SessionBrief`
- `SessionReceipt`
- Control Rod profile posture (from `SessionBrief.controlRodProfile`)
- Forensic Chain linkage records
- optional Omission enrichment when available

`ForemansWalk` produces exactly:

- a finding report
- an As-Built accountability record

This spec does not define:

- live monitoring or watcher behavior
- buddy-agent behavior
- mid-session intervention or enforcement
- adaptive learning, anomaly intelligence, or score theater
- continuity writes or board writes
- standing-risk derivation behavior
- separate Phantom or As-Built engines
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Foreman's Walk`
- Internal build name: `ForemansWalk`
- Core contract object: `ForemansWalkFinding`

## Record Boundary

- SessionReceipt remains the session-of-record.
- As-Built is the accountability delta-of-record output of Foreman's Walk.
- As-Built does not replace SessionReceipt authority.

## Evaluate Input Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `sessionBrief` | object | Yes | Session-start contract object used for scope and posture checks. |
| `sessionReceipt` | object | Yes | Session closeout record used as the session-of-record input. |
| `performedActions` | object[] | No | Deterministic action records used for scope and constraint checks when explicit action metadata is needed. |
| `forensicEntries` | object[] | No | Forensic Chain linkage entries used for truthfulness and evidence-integrity checks. |
| `omissionEnrichment` | object | No | Optional omission findings for completeness enrichment only. |

## Required Review Passes

### Scope Compliance

- Compare performed work against `inScope` and anti-goals (`outOfScope`).
- Out-of-scope work routes to `DRIFT`.

### Constraint Compliance

- Compare performed actions against control-rod posture.
- Prohibited or unauthorized `HARD_STOP` actions route to `VIOLATION`.

### Completeness

- Compare `SessionBrief.inScope` against `SessionReceipt.completedWork`.
- Missing scoped work routes to `INCOMPLETE`.
- Omission enrichment may enrich this pass, but it is not a required dependency.

### Truthfulness

- Compare claims against evidence linkage.
- Claim without evidence routes to `PHANTOM`.
- Evidence without claim routes to `GHOST`.
- Partial support routes to `PARTIAL_VERIFICATION`.

### Evidence Integrity

- Detect broken, missing, or circular support linkage.
- Broken/missing/circular support routes to `EVIDENCE_GAP`.

## Finding Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `issueRef` | string | Yes | Deterministic issue key used for one-primary-finding precedence. |
| `findingType` | enum | Yes | Must be one of the allowed finding types below. |
| `severity` | enum | Yes | Deterministic severity after default mapping and SUPERVISED escalation. |
| `pass` | string | Yes | Pass name that emitted the winning primary finding. |
| `summary` | string | Yes | Plain-language finding summary. |
| `evidenceRefs` | string[] | Yes | String references supporting the finding. |

Allowed `findingType` values:

- `VIOLATION`
- `PHANTOM`
- `GHOST`
- `DRIFT`
- `INCOMPLETE`
- `PARTIAL_VERIFICATION`
- `EVIDENCE_GAP`

`CLEAN` is not a finding type.

A clean session produces:

- zero findings
- all-matched As-Built

## Severity Rules

Default severity mapping:

- `VIOLATION` = `CRITICAL`
- `PHANTOM` = `HIGH`
- `GHOST` = `HIGH`
- `DRIFT` = `MEDIUM`
- `INCOMPLETE` = `MEDIUM`
- `EVIDENCE_GAP` = `MEDIUM`
- `PARTIAL_VERIFICATION` = `LOW`

SUPERVISED escalation rule:

- Findings in a `SUPERVISED` domain auto-elevate one severity level.

## Precedence Rule

One issue emits one primary finding.

Deterministic precedence order:

1. `VIOLATION`
2. `PHANTOM` / `GHOST`
3. `DRIFT`
4. `INCOMPLETE`
5. `EVIDENCE_GAP`
6. `PARTIAL_VERIFICATION`

## As-Built Accountability Model

As-Built compares planned scope versus actual work.

Allowed item statuses:

- `MATCHED`
- `MODIFIED`
- `ADDED`
- `DEFERRED`
- `HELD`

As-Built is output-only accountability delta and does not replace SessionReceipt.

## Contract Invariants

- Foreman's Walk is post-session verification only.
- No live enforcement is introduced.
- No second operational substrate is introduced.
- Continuity remains the only cross-session operational substrate.
- Continuity, Standing Risk, and Open Items Board contracts are not widened by this block.

## Current Implementation Truth

- This is a Block C1 spec baseline.
- Runtime implementation exists at `src/ForemansWalk.js`.
- Golden proof exists at `tests/golden/ForemansWalk.golden.test.js`.
