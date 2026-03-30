# CONTROL_ROD_MODE.md
**Status:** Proposed contract baseline  
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 3 Block B1 contract baseline for `ControlRodMode`.

`ControlRodMode` is a static pre-session profile-resolution and normalization surface for per-domain supervision posture.

## Boundary

`ControlRodMode` defines autonomy levels, starter profiles, starter domains, and normalized profile snapshot shape.

This spec does not define:

- mid-session intervention or live enforcement behavior
- adaptive learning, history analysis, or profile auto-tuning
- override workflows or temporary autonomy upgrades
- Foreman's Walk violation determination behavior
- Continuity or Open Items Board widening
- a second cross-session operational substrate
- LOTO v2 semantics
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Control Rod Mode`
- Internal build name: `ControlRodMode`
- Core contract object: `ControlRodProfileSnapshot`

## Autonomy Levels

`autonomyLevel` must be one of:

- `FULL_AUTO`
- `SUPERVISED`
- `HARD_STOP`

## Starter Profiles

Built-in starter profiles for v1:

- `conservative`
- `balanced`
- `velocity`

## Starter Domain Baseline

Starter domains for v1:

- `pricing_quote_logic` (Pricing / quote logic)
- `customer_data_pii` (Customer data / PII)
- `database_schema` (Database schema)
- `protected_destructive_ops` (Protected / destructive ops)
- `auth_security_surfaces` (Auth / security surfaces)
- `existing_file_modification` (Existing file modification)
- `new_file_creation` (New file creation)
- `ui_styling_content` (UI / styling / content)
- `documentation_comments` (Documentation / comments)
- `test_files` (Test files)

## Domain Rule Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `domainId` | string | Yes | Stable domain identifier. |
| `label` | string | Yes | Operator-readable domain label. |
| `filePatterns` | string[] | Yes | File-pattern set for the domain. |
| `operationTypes` | string[] | Yes | Operation-type set for the domain. |
| `autonomyLevel` | enum | Yes | Must be one of `FULL_AUTO`, `SUPERVISED`, or `HARD_STOP`. |
| `justification` | string | Yes | Plain-language reason for the selected posture. |

## ControlRodProfileSnapshot Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `profileId` | string | Yes | Stable profile identifier. |
| `profileLabel` | string | Yes | Operator-readable profile label. |
| `domainRules` | DomainRule[] | Yes | Normalized, deterministic set of domain rules for this session snapshot. |

## Profile Resolution Rules

- Input may be a preset profile id (`conservative`, `balanced`, `velocity`) or an explicit profile object.
- Stored session truth must be a normalized snapshot object.
- String preset input must resolve to the same deterministic normalized snapshot each time.
- Explicit profile input must validate against v1 domain and autonomy constraints before storing.
- `overrideAllowed` is intentionally cut from v1.
- No second authorization field is introduced in SessionBrief.
- `HARD_STOP` authorization remains derived from explicit inclusion in session scope.

## Contract Invariants

- Control Rod Mode v1 is static and pre-session only.
- No live enforcement routing is implemented in this block.
- No continuity-promotion behavior is implemented in this block.
- Continuity remains the only cross-session operational substrate.
- Forensic Chain remains evidence substrate only.

## Example ControlRodProfileSnapshot

```json
{
  "profileId": "conservative",
  "profileLabel": "Conservative",
  "domainRules": [
    {
      "domainId": "pricing_quote_logic",
      "label": "Pricing / quote logic",
      "filePatterns": ["**/*pricing*.*", "**/*quote*.*"],
      "operationTypes": ["modify_logic", "change_rules"],
      "autonomyLevel": "HARD_STOP",
      "justification": "Revenue-impacting logic requires explicit operator scope approval."
    }
  ]
}
```

## Current Implementation Truth

- This is a Block B1 spec baseline.
- Runtime implementation exists at `src/ControlRodMode.js`.
- Golden proof exists at `tests/golden/ControlRodMode.golden.test.js`.
