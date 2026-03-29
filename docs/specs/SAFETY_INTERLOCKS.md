# SAFETY_INTERLOCKS.md
**Status:** Proposed contract baseline  
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 1 contract baseline for `SafetyInterlocks`. It covers dangerous-action categories, default stop behavior, explicit authorization gates, and protected-asset handling.

## Boundary

`SafetyInterlocks` defines how dangerous categories are classified and what response is required before work may continue.

This spec does not define:

- Hold lifecycle records
- persistent never-do rule records
- asked-vs-done comparison logic
- session-start briefing structure
- session-receipt structure
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Safety Locks`
- Internal build name: `SafetyInterlocks`
- Core contract object: `SafetyInterlock`

## SafetyInterlock Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `interlockId` | string | Yes | Stable identifier for the interlock record. |
| `actionCategory` | enum | Yes | Dangerous-action category for the evaluated work. |
| `defaultOutcome` | enum | Yes | Must be one of `stop`, `require_authorization`, or `allow_with_receipt`. |
| `requiresExplicitAuthorization` | boolean | Yes | Whether the operator must explicitly authorize the action in the current session. |
| `protectedTargets` | string[] | No | Files, folders, or resources that trigger protected-asset behavior. |
| `operatorPrompt` | string | Yes | Plain-language instruction shown when the interlock triggers. |
| `rationale` | string | Yes | Why this interlock exists. |
| `evidence` | string[] | Yes | Facts, repo truth, or operator statements that support the interlock. |
| `createdBy` | enum | Yes | Actor that created the interlock. Initial values: `architect` or `ai`. |
| `createdAt` | string | Yes | Timestamp in ISO 8601 format. |
| `updatedAt` | string | No | Latest interlock-change timestamp in ISO 8601 format. |
| `notes` | string | No | Plain-language maintenance notes. |

## Dangerous-Action Categories

| Category | Meaning |
|---|---|
| `destructive_change` | Deletes, overwrites, or irreversibly rewrites important project state. |
| `protected_surface_change` | Alters sync-blocking canon surfaces or other explicitly protected assets. |
| `external_side_effect` | Sends, publishes, opens, or modifies something outside the repo boundary. |
| `permission_escalation` | Requires elevated access, bypasses normal safeguards, or changes trust boundaries. |
| `secret_or_sensitive_access` | Reads, exposes, or transmits credentials or sensitive material. |

## Outcome Rules

- `stop` means work must halt until the operator changes scope or approves a different path.
- `require_authorization` means work may continue only after explicit operator authorization in the current session.
- `allow_with_receipt` means the action may proceed but must be captured in the session record.
- `protected_surface_change` should default to `require_authorization` or `stop`.
- `destructive_change`, `permission_escalation`, and `secret_or_sensitive_access` must never default to silent allow.

## Protected-Asset Behavior

- If a target appears in `protectedTargets`, the interlock applies even when the same action might otherwise be routine.
- Protected-asset handling must preserve operator visibility about what was targeted and why the interlock fired.
- An authorization prompt must name the protected target in plain language.
- Protected-target exceptions must be explicit; they must not be inferred from silence.

## Contract Invariants

- Every interlock must be readable in plain language by a non-technical operator.
- Every interlock must name a dangerous-action category.
- Every interlock must preserve a rationale and evidence basis.
- `requiresExplicitAuthorization=true` must align with `defaultOutcome=require_authorization` or `stop`.
- Safety interlocks must not silently weaken active never-do rules from `ConstraintsRegistry`.

## Example SafetyInterlock

```json
{
  "interlockId": "interlock_wave1_001",
  "actionCategory": "protected_surface_change",
  "defaultOutcome": "require_authorization",
  "requiresExplicitAuthorization": true,
  "protectedTargets": [
    "README.md",
    "CLAUDE.md"
  ],
  "operatorPrompt": "This change touches protected canon surfaces. Explicit approval is required before continuing.",
  "rationale": "Front-door truth surfaces are the only visible review layer for non-technical operators.",
  "evidence": [
    "CLAUDE.md marks stale front-door truth as a ship blocker.",
    "The sync doctrine requires same-wave updates for impacted surfaces."
  ],
  "createdBy": "architect",
  "createdAt": "2026-03-28T00:00:00Z"
}
```

## Current Implementation Truth

- This is a contract/spec artifact only.
- `SafetyInterlocks` runtime implementation now exists at `src/SafetyInterlocks.js` with golden coverage in `tests/golden/SafetyInterlocks.golden.test.js`.
- Persistence, transport, and UI surfaces remain undefined at this stage.
