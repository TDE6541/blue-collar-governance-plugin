# OMISSION_COVERAGE_ENGINE.md
**Status:** Proposed contract baseline  
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 2 Block C1 contract baseline for `OmissionCoverageEngine`.

`OmissionCoverageEngine` evaluates bounded, profile-pack-specific expected outputs and emits deterministic omission findings when expected outputs are missing.

## Boundary

`OmissionCoverageEngine` defines evaluation logic only.

This spec does not define:

- persistence of omission findings
- writes to `ContinuityLedger`
- board grouping or board presentation
- standing-risk derivation behavior
- anomaly, watcher, or automation branching logic
- confidence, score, rank, priority, or prediction outputs
- universal completeness modeling
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Omission & Coverage`
- Internal build name: `OmissionCoverageEngine`
- Core derived object: `OmissionFinding`

## Explicit Profile-Pack Selection

`profilePack` is required input for every evaluation.

Block C1 supports exactly these profile packs:

- `pricing_quote_change`
- `form_customer_data_flow`
- `protected_destructive_operation`

Unknown profile packs must fail deterministically.

No implicit inference, NLP fallback, or smart-guess routing is allowed.

## Expected Item Vocabulary

The engine checks this fixed expected-item vocabulary:

- `REQUEST_CAPTURED`
- `QUOTE_CHANGE_APPLIED`
- `CUSTOMER_DATA_FLOW_CAPTURED`
- `PROTECTED_OPERATION_OUTCOME_CAPTURED`
- `EXCLUSIONS_STATED`
- `BLOCKED_ITEMS_RECORDED`
- `UNRESOLVED_DECISIONS_CAPTURED`
- `VERIFICATION_ARTIFACTS_PRESENT`
- `RECEIPT_COMPLETE`

## Pack-Specific Expected Outputs

Each pack uses a short expected-output list:

### `pricing_quote_change`

- `REQUEST_CAPTURED`
- `QUOTE_CHANGE_APPLIED`
- `EXCLUSIONS_STATED`
- `BLOCKED_ITEMS_RECORDED`
- `UNRESOLVED_DECISIONS_CAPTURED`
- `VERIFICATION_ARTIFACTS_PRESENT`
- `RECEIPT_COMPLETE`

### `form_customer_data_flow`

- `REQUEST_CAPTURED`
- `CUSTOMER_DATA_FLOW_CAPTURED`
- `EXCLUSIONS_STATED`
- `BLOCKED_ITEMS_RECORDED`
- `UNRESOLVED_DECISIONS_CAPTURED`
- `VERIFICATION_ARTIFACTS_PRESENT`
- `RECEIPT_COMPLETE`

### `protected_destructive_operation`

- `REQUEST_CAPTURED`
- `PROTECTED_OPERATION_OUTCOME_CAPTURED`
- `EXCLUSIONS_STATED`
- `BLOCKED_ITEMS_RECORDED`
- `UNRESOLVED_DECISIONS_CAPTURED`
- `VERIFICATION_ARTIFACTS_PRESENT`
- `RECEIPT_COMPLETE`

## Evaluation Input Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `profilePack` | enum | Yes | Must be one of the 3 supported profile packs. |
| `sessionId` | string | Yes | Session identifier for this omission-evaluation pass. |
| `observedExpectedItems` | enum[] | Yes | Expected-item codes observed in the session evidence; may be empty. |
| `observationRefs` | string[] | Yes | Evidence references supporting evaluation context. |

## Deterministic Finding Shape

`OmissionFinding` must include:

| Field | Type | Required | Description |
|---|---|---|---|
| `profilePack` | enum | Yes | Profile pack used for this evaluation. |
| `missingExpectedItem` | enum | Yes | Missing expected-item code. |
| `missingItemCode` | enum | Yes | Deterministic missing-item code. |
| `summary` | string | Yes | Plain-language missing-output statement. |
| `evidenceRefs` | string[] | Yes | Evidence references used during evaluation. |

No `confidence`, `score`, `rank`, `priority`, `anomaly`, `prediction`, `boardGroup`, or `boardColumn` fields are allowed.

## missingItemCode Vocabulary

Fixed vocabulary:

- `MISSING_REQUEST_CAPTURE`
- `MISSING_QUOTE_CHANGE_ARTIFACT`
- `MISSING_CUSTOMER_DATA_FLOW_ARTIFACT`
- `MISSING_OPERATION_OUTCOME_RECORD`
- `MISSING_EXCLUSIONS_STATEMENT`
- `MISSING_BLOCKED_ITEMS_RECORD`
- `MISSING_UNRESOLVED_DECISIONS_RECORD`
- `MISSING_VERIFICATION_ARTIFACT`
- `MISSING_RECEIPT_COMPLETENESS`

## Evaluation Invariants

- Clean known-profile sessions with all required expected outputs must return zero findings.
- Wrong-pack expected outputs must not be evaluated.
- Findings must remain plain-language and operator-legible.
- Findings remain evaluation-scoped in Block C1.

## Continuity Linkage (Documented Only)

If unresolved omission findings later require carry-forward, promotion should route through existing continuity truth using `entryType=omission_finding`.

Block C1 does not implement persistence or continuity writes.

## Current Implementation Truth

- This is a Block C1 spec baseline.
- Runtime implementation exists at `src/OmissionCoverageEngine.js`.
- Golden proof exists at `tests/golden/OmissionCoverageEngine.golden.test.js`.

