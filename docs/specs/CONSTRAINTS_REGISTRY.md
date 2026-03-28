# CONSTRAINTS_REGISTRY.md
**Status:** Proposed contract baseline  
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 1 contract baseline for `ConstraintsRegistry`. It covers persistent never-do rules, enforcement classes, registry precedence, and the minimum shape required to preserve operator-visible trust boundaries.

## Boundary

`ConstraintsRegistry` defines never-do rule records and how they are ordered and interpreted.

This spec does not define:

- Hold lifecycle records
- dangerous-action taxonomies
- asked-vs-done comparison logic
- session-start briefing structure
- session-receipt structure
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Never-Do Rules`
- Internal build name: `ConstraintsRegistry`
- Core contract object: `ConstraintRule`

## ConstraintRule Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `ruleId` | string | Yes | Stable identifier for the rule record. |
| `label` | string | Yes | Short operator-readable rule name. |
| `instruction` | string | Yes | Plain-language statement of what the AI must not do. |
| `status` | enum | Yes | Must be one of `proposed`, `active`, `disabled`, or `archived`. |
| `enforcementClass` | enum | Yes | Must be one of `hard_block`, `protected_asset`, `requires_confirmation`, or `scope_limit`. |
| `severity` | enum | Yes | Must be one of `critical`, `high`, or `standard`. |
| `rationale` | string | Yes | Why this never-do rule exists. |
| `evidence` | string[] | Yes | Facts, repo truth, or operator statements that support the rule. |
| `appliesTo` | string[] | Yes | Assets, actions, or contexts the rule covers. |
| `exceptions` | string[] | No | Explicitly allowed exceptions. Empty means no exceptions are granted. |
| `createdBy` | enum | Yes | Actor that created the rule. Initial values: `architect` or `ai`. |
| `createdAt` | string | Yes | Timestamp in ISO 8601 format. |
| `updatedAt` | string | No | Latest rule-change timestamp in ISO 8601 format. |
| `notes` | string | No | Plain-language maintenance notes. |

## Enforcement Classes

| Enforcement class | Meaning |
|---|---|
| `hard_block` | The action is never allowed inside the current trust boundary. |
| `protected_asset` | The action is disallowed when it touches named protected files, folders, or resources. |
| `requires_confirmation` | The action is disallowed unless the operator explicitly authorizes it in the current session. |
| `scope_limit` | The action is disallowed when it falls outside the approved session or wave scope. |

## Status Rules

- New rules begin in `proposed`.
- Only `active` rules are enforceable.
- `disabled` keeps the rule visible but inactive.
- `archived` preserves history for a rule that should no longer be reactivated casually.
- Rule status changes must preserve the original instruction, rationale, and evidence.

## Registry Precedence

1. `hard_block` outranks every other enforcement class.
2. `protected_asset` outranks `requires_confirmation` and `scope_limit` when a protected target is involved.
3. `requires_confirmation` outranks `scope_limit` when the same action is both out of scope and confirmation-gated.
4. If two active rules conflict, the stricter effective outcome wins until the operator resolves the conflict explicitly.
5. Exceptions narrow a rule; they do not silently weaken unrelated active rules.

## Contract Invariants

- Every rule must be readable in plain language by a non-technical operator.
- Every rule must preserve a traceable rationale and evidence basis.
- `instruction` must describe a prohibition, not a suggestion.
- `ruleId` must remain stable for the life of the rule record.
- A rule must not imply dangerous-action taxonomy details that belong to `SafetyInterlocks`.

## Example ConstraintRule

```json
{
  "ruleId": "rule_wave1_001",
  "label": "Never edit protected canon surfaces without approval",
  "instruction": "Do not modify sync-blocking canon files outside the approved wave.",
  "status": "active",
  "enforcementClass": "protected_asset",
  "severity": "critical",
  "rationale": "Non-technical operators rely on canon surfaces to stay truthful and synchronized.",
  "evidence": [
    "CLAUDE.md marks stale front-door truth as a ship blocker.",
    "The approved wave names the files that may be changed."
  ],
  "appliesTo": [
    "README.md",
    "CLAUDE.md",
    "REPO_INDEX.md",
    "docs/INDEX.md",
    "docs/indexes/WHERE_TO_CHANGE_X.md"
  ],
  "createdBy": "architect",
  "createdAt": "2026-03-28T00:00:00Z"
}
```

## Current Implementation Truth

- This is a contract/spec artifact only.
- No `ConstraintsRegistry` runtime implementation exists yet.
- Persistence, transport, and UI surfaces remain undefined at this stage.
