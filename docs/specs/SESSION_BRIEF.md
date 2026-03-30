# SESSION_BRIEF.md
**Status:** Proposed contract baseline  
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 1 contract baseline for `SessionBrief`. It covers the startup session surface for scope, hazards, off-limits areas, constraints, and risk mode.

## Boundary

`SessionBrief` defines what must be visible at the start of a governed session before runtime work proceeds.

This spec does not define:

- Hold lifecycle records
- persistent never-do rule records
- dangerous-action taxonomies
- asked-vs-done comparison logic
- session-receipt structure
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Start Brief`
- Internal build name: `SessionBrief`
- Core contract object: `SessionBrief`

## SessionBrief Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `briefId` | string | Yes | Stable identifier for the session brief. |
| `goal` | string | Yes | One-sentence statement of the session objective. |
| `inScope` | string[] | Yes | Explicit list of work approved for the session. |
| `outOfScope` | string[] | Yes | Explicit list of what the session must not widen into. |
| `protectedAssets` | string[] | Yes | Files, folders, or resources that need extra care or explicit approval. |
| `activeConstraints` | string[] | Yes | Never-do rules or other active boundaries visible at session start. |
| `hazards` | string[] | Yes | Known risks that could create trust or execution problems if ignored. |
| `riskMode` | enum | Yes | Must be one of `strict`, `guarded`, or `permitted`. |
| `expectedOutputs` | string[] | Yes | Artifacts the operator expects by closeout. |
| `truthSources` | string[] | Yes | Canon sources the session should treat as authoritative. |
| `approvalsNeeded` | string[] | No | Extra approvals required before specific work may proceed. |
| `controlRodProfile` | string | No | Optional control-rod profile label for session posture. This is the only approved additive field in Wave 3 Block 0. |
| `createdBy` | enum | Yes | Actor that created the brief. Initial values: `architect` or `ai`. |
| `createdAt` | string | Yes | Timestamp in ISO 8601 format. |
| `updatedAt` | string | No | Latest brief-change timestamp in ISO 8601 format. |
| `notes` | string | No | Plain-language maintenance notes. |

## Risk Modes

| Risk mode | Meaning |
|---|---|
| `strict` | Default to stop or HOLD when uncertainty appears. |
| `guarded` | Proceed only inside explicit boundaries with visible approvals for exceptions. |
| `permitted` | Lower-friction execution is allowed, but still inside canon constraints and closeout requirements. |

## Session-Start Rules

- A brief must exist before trust-kernel runtime work starts.
- `inScope` and `outOfScope` must both be explicit.
- `protectedAssets`, `activeConstraints`, and `hazards` must be visible at session start rather than discovered silently later.
- `riskMode` must be stated in plain language terms the operator can understand.
- `truthSources` must point to canon, not reference-only material.

## Wave 3 Block 0 Contract Clarifier

- controlRodProfile is the only approved additive field in Block 0.
- No second authorization field is introduced in SessionBrief.
- HARD_STOP authorization derives from explicit inclusion in inScope for the current session.

## Contract Invariants

- Every brief must be readable by a non-technical operator.
- `goal`, `inScope`, and `expectedOutputs` must align with the approved wave.
- `outOfScope` must remain visible throughout the session.
- A brief must not imply runtime behavior beyond what is implemented.
- SessionBrief provides startup truth only; it does not replace the end-of-session receipt.

## Example SessionBrief

```json
{
  "briefId": "brief_wave1_001",
  "goal": "Run a governed Wave 1 session with runtime truth synchronized.",
  "inScope": [
    "Add the SessionBrief contract spec.",
    "Update the required navigation and sync surfaces."
  ],
  "outOfScope": [
    "Wave 2 behavior implementation.",
    "Package publishing surfaces",
    "SessionReceipt contract work"
  ],
  "protectedAssets": [
    "README.md",
    "CLAUDE.md",
    "docs/specs/WAVE1_TRUST_KERNEL.md"
  ],
  "activeConstraints": [
    "No Wave 2 behavior implementation in this session.",
    "No widening beyond the six locked systems."
  ],
  "hazards": [
    "Stale canon surfaces would create trust drift.",
    "Reference material must not be treated as canon."
  ],
  "riskMode": "strict",
  "expectedOutputs": [
    "A promoted SessionBrief contract spec.",
    "Synchronized repo truth surfaces."
  ],
  "truthSources": [
    "docs/specs/WAVE1_TRUST_KERNEL.md",
    "CLAUDE.md",
    "REPO_INDEX.md"
  ],
  "createdBy": "architect",
  "createdAt": "2026-03-28T00:00:00Z"
}
```

## Current Implementation Truth

- This is a contract/spec artifact only.
- `SessionBrief` runtime implementation now exists at `src/SessionBrief.js` with golden coverage in `tests/golden/SessionBrief.golden.test.js`.
- Persistence, transport, and UI surfaces remain undefined at this stage.