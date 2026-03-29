# SESSION_RECEIPT.md
**Status:** Proposed contract baseline  
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 1 contract baseline for `SessionReceipt`. It covers the end-of-session as-built record for planned versus actual work, holds, exclusions, and approved drift.

## Boundary

`SessionReceipt` defines closeout truth after a governed session or wave finishes.

This spec does not define:

- Hold lifecycle records
- persistent never-do rule records
- dangerous-action taxonomies
- asked-vs-done comparison logic at evaluation time
- session-start briefing structure
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `As-Built`
- Internal build name: `SessionReceipt`
- Core contract object: `SessionReceipt`

## SessionReceipt Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `receiptId` | string | Yes | Stable identifier for the receipt. |
| `briefRef` | string | No | Reference to the originating `SessionBrief` when one exists. |
| `plannedWork` | string[] | Yes | Plain-language list of work that was planned at session start. |
| `completedWork` | string[] | Yes | Plain-language list of work that actually completed. |
| `untouchedWork` | string[] | Yes | Planned items intentionally left unfinished or unchanged. |
| `holdsRaised` | string[] | Yes | Hold identifiers or summaries raised during the session. |
| `approvedDrift` | string[] | Yes | Work that expanded beyond the original plan but was explicitly approved. |
| `excludedWork` | string[] | Yes | Work intentionally kept out of the session. |
| `artifactsChanged` | string[] | Yes | Files or surfaces changed during the session. |
| `outcome` | enum | Yes | Must be one of `complete`, `complete_with_holds`, `partial`, or `stopped`. |
| `signoffRequired` | boolean | Yes | Whether additional operator review is required before ship or next-wave execution. |
| `summary` | string | Yes | Plain-language closeout summary. |
| `createdBy` | enum | Yes | Actor that created the receipt. Initial values: `architect` or `ai`. |
| `createdAt` | string | Yes | Timestamp in ISO 8601 format. |
| `updatedAt` | string | No | Latest receipt-change timestamp in ISO 8601 format. |
| `notes` | string | No | Plain-language maintenance notes. |

## Outcome Rules

- `complete` means planned work finished without unresolved holds that block closeout.
- `complete_with_holds` means the core work finished but visible holds remain.
- `partial` means only part of the planned work finished.
- `stopped` means the session ended because a hold, stop condition, or scope boundary prevented completion.
- `approvedDrift` must stay explicit; it must not be merged silently into `plannedWork`.

## Closeout Rules

1. `plannedWork` and `completedWork` must both remain visible.
2. `untouchedWork` and `excludedWork` must not be collapsed into the same list.
3. `holdsRaised` must preserve visible trace of unresolved or resolved trust interruptions.
4. `artifactsChanged` must name the actual changed surfaces, not generic categories.
5. `signoffRequired=true` should be used whenever the outcome or drift still needs operator review.

## Contract Invariants

- Every receipt must be readable by a non-technical operator.
- The receipt must tell the truth about what happened, not what was hoped for.
- `approvedDrift` must be explicit when scope expanded beyond the original plan.
- `summary` must describe the real outcome in plain language.
- SessionReceipt records closeout truth; it does not replace the startup brief.

## Example SessionReceipt

```json
{
  "receiptId": "receipt_wave1_001",
  "briefRef": "brief_wave1_001",
  "plannedWork": [
    "Run full Wave 1 verification.",
    "Truth-sync stale canon surfaces."
  ],
  "completedWork": [
    "Ran full Wave 1 verification.",
    "Truth-synced stale canon surfaces."
  ],
  "untouchedWork": [],
  "holdsRaised": [],
  "approvedDrift": [],
  "excludedWork": [
    "Wave 2 behavior implementation."
  ],
  "artifactsChanged": [
    "docs/specs/HOLD_ENGINE.md",
    "docs/specs/WAVE1_TRUST_KERNEL.md",
    "CLAUDE.md",
    "REPO_INDEX.md",
    "docs/INDEX.md",
    "docs/indexes/WHERE_TO_CHANGE_X.md"
  ],
  "outcome": "complete",
  "signoffRequired": true,
  "summary": "Wave 1 runtime truth sync completed; final Architect signoff remains pending.",
  "createdBy": "ai",
  "createdAt": "2026-03-28T00:00:00Z"
}
```

## Current Implementation Truth

- This is a contract/spec artifact only.
- `SessionReceipt` runtime implementation now exists at `src/SessionReceipt.js` with golden coverage in `tests/golden/SessionReceipt.golden.test.js`.
- Persistence, transport, and UI surfaces remain undefined at this stage.