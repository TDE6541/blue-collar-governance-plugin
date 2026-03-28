# SCOPE_GUARD.md
**Status:** Proposed contract baseline  
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 1 contract baseline for `ScopeGuard`. It covers the asked-vs-done comparison model and the routing decisions for `approve`, `reject`, or `extend`.

## Boundary

`ScopeGuard` defines how requested work is compared to observed work and how unauthorized drift is surfaced for operator review.

This spec does not define:

- Hold lifecycle records
- persistent never-do rule records
- dangerous-action taxonomies
- session-start briefing structure
- session-receipt structure
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Scope Guard`
- Internal build name: `ScopeGuard`
- Core contract object: `ScopeEvaluation`

## ScopeEvaluation Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `evaluationId` | string | Yes | Stable identifier for the scope comparison record. |
| `requestedWork` | string[] | Yes | Plain-language list of what the AI was asked to do. |
| `observedWork` | string[] | Yes | Plain-language list of what the AI actually did. |
| `matchedWork` | string[] | Yes | Requested items that were completed without drift. |
| `unauthorizedWork` | string[] | Yes | Observed work that was not requested or approved. |
| `missingWork` | string[] | Yes | Requested work that was not completed. |
| `decision` | enum | Yes | Must be one of `approve`, `reject`, or `extend`. |
| `decisionReason` | string | Yes | Plain-language explanation for the routing decision. |
| `requiresOperatorAction` | boolean | Yes | Whether the operator must explicitly resolve the result before the wave may continue. |
| `evidence` | string[] | Yes | Facts, repo truth, or operator statements supporting the comparison. |
| `createdBy` | enum | Yes | Actor that created the evaluation. Initial values: `architect` or `ai`. |
| `createdAt` | string | Yes | Timestamp in ISO 8601 format. |
| `updatedAt` | string | No | Latest evaluation-change timestamp in ISO 8601 format. |
| `approvedExtensions` | string[] | No | Additional work explicitly approved after the original request. |
| `notes` | string | No | Plain-language maintenance notes. |

## Decision Rules

- `approve` means observed work matches requested work closely enough to continue or close out.
- `reject` means unauthorized work or trust-significant divergence requires rollback, correction, or explicit refusal to ship.
- `extend` means the operator may expand scope, but only through explicit approval of the additional work.
- `unauthorizedWork` must never be hidden inside `matchedWork`.
- `approvedExtensions` may convert previously unauthorized work into approved scope, but only after explicit operator approval.

## Comparison Rules

1. Start from the requested work, not the implementation's self-description.
2. Compare observed work to requested work in plain language first.
3. Treat work outside the approved wave boundary as unauthorized unless it was explicitly extended.
4. Missing work and unauthorized work must both remain visible in the evaluation.
5. ScopeGuard compares what happened; it does not decide dangerous-action taxonomy or never-do rule policy by itself.

## Contract Invariants

- Every evaluation must be readable by a non-technical operator.
- `decisionReason` must explain the routing outcome in plain language.
- `approve` must not be used when unauthorized work remains unresolved.
- `extend` requires operator action before the additional work becomes in-scope.
- ScopeGuard must preserve the distinction between requested work, observed work, and approved extensions.

## Example ScopeEvaluation

```json
{
  "evaluationId": "scope_wave1_001",
  "requestedWork": [
    "Define the HoldEngine contract.",
    "Update the navigation surfaces that point to HoldEngine."
  ],
  "observedWork": [
    "Defined the HoldEngine contract.",
    "Updated the navigation surfaces.",
    "Suggested a ScopeGuard follow-up."
  ],
  "matchedWork": [
    "Define the HoldEngine contract.",
    "Update the navigation surfaces that point to HoldEngine."
  ],
  "unauthorizedWork": [
    "Suggested a ScopeGuard follow-up."
  ],
  "missingWork": [],
  "decision": "extend",
  "decisionReason": "The extra follow-up should be explicitly approved before it becomes part of the wave.",
  "requiresOperatorAction": true,
  "evidence": [
    "The approved wave named only HoldEngine and sync files.",
    "The observed output included adjacent future work."
  ],
  "createdBy": "ai",
  "createdAt": "2026-03-28T00:00:00Z"
}
```

## Current Implementation Truth

- This is a contract/spec artifact only.
- No `ScopeGuard` runtime implementation exists yet.
- Persistence, transport, and UI surfaces remain undefined at this stage.
