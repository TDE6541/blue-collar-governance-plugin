# COMPRESSED_SAFETY_POSTURE_SKILLS.md
**Status:** Wave 5B Block D contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B Block D compressed Safety posture micro-slice contract baseline.

The slice introduces two operator-facing skills that are read/query/render-only surfaces over already-shipped runtime truth:

- `/constraints`
- `/silence-map`

## Boundary

This spec defines:

- deterministic skill-surface output contracts for the two approved routes
- fixed route-to-runtime mappings for this micro-slice
- explicit anti-widening and anti-gamification constraints for skill surfaces

This spec does not define:

- new engine behavior or new engine write paths
- SessionBrief schema changes
- SessionReceipt schema changes
- Control Rod enum/profile changes
- Operator Trust Ledger, Journeyman Trust Engine, Warranty Monitor, or Scarcity contract changes
- skills outside `/constraints` and `/silence-map`
- `/control-rods` as a standalone skill
- stateful operator-action surfaces (`/callout`, `/change-order`, `/lockout`, `/permit`, `/red-tag`)
- skins, onboarding, package, install, runtime-hook, compatibility, or marketplace behavior
- telemetry, phone-home, external API, account-required, or payment-gate behavior
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing tranche label: `Compressed Safety Posture Skills`
- Internal build name: `CompressedSafetyPostureSkills`
- Core routes: `/constraints`, `/silence-map`

## Fixed Mapping Rules

- `/constraints` maps to `ConstraintsRegistry` read-only posture view only.
- `/silence-map` maps to a read-only composite posture view over existing `ConstraintsRegistry`, `SafetyInterlocks`, and `ControlRodMode` posture/status truth.
- `/silence-map` may read current Control Rod posture/status only; it must not expose rod edit/update semantics.
- Mapping reinterpretation is not allowed in this block.

## Read/Query/Render-Only Posture

- Compressed Safety posture skills consume existing runtime truth only.
- Compressed Safety posture skills render deterministic views only.
- Compressed Safety posture skills do not mutate existing engine state.
- Compressed Safety posture skills do not introduce hidden write paths.
- Compressed Safety posture skills do not widen shared contracts.

## Route Contracts

## `/constraints`

Input: existing `ConstraintsRegistry` read outputs only (`listRules` and/or `getRule` read paths).

Route behavior:

- include current constraint posture visibility by status and enforcement class
- preserve existing rule status vocabulary (`proposed`, `active`, `disabled`, `archived`)
- preserve existing enforcement vocabulary (`hard_block`, `protected_asset`, `requires_confirmation`, `scope_limit`)
- never create/update/resolve rules

Output object:

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/constraints`. |
| `ruleCount` | number | Yes | Number of rules in the rendered view. |
| `maintainedCount` | number | Yes | Number of non-archived rules in the rendered view. |
| `statusSummary` | object | Yes | Count map by `proposed`, `active`, `disabled`, `archived`. |
| `enforcementSummary` | object | Yes | Count map by `hard_block`, `protected_asset`, `requires_confirmation`, `scope_limit`. |
| `rules` | object[] | Yes | Deterministic rule list (`ruleId`, `label`, `status`, `enforcementClass`, `severity`, `instruction`, `rationale`, `evidence`, `appliesTo`, `exceptions`, `createdBy`, `createdAt`, `updatedAt`, `notes`). |

## `/silence-map`

Input: existing read outputs only:

- `ConstraintsRegistry` read outputs (`listRules` and/or `getRule`)
- `SafetyInterlocks` read outputs (`listInterlocks` and/or `getInterlock`)
- `ControlRodMode` posture/status read outputs (`resolveProfile` and/or `listStarterProfileIds`)

Route behavior:

- include only blocked/restricted/guarded posture visibility from existing truth
- include active-constraint posture only for blocked/restricted/guarded buckets
- include safety interlock posture by default outcome and explicit-authorization flags
- include Control Rod posture/status by domain autonomy level only
- never create/update/resolve constraints or interlocks
- never expose rod edit/update semantics
- never imply `/control-rods` shipped as a standalone skill

Output object:

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/silence-map`. |
| `profile` | object | Yes | Control Rod posture identity (`profileId`, `profileLabel`). |
| `summary` | object | Yes | Count map for blocked/restricted/guarded posture across constraints, interlocks, and rod domains. |
| `blocked` | object | Yes | Blocked posture buckets (`constraints`, `safetyInterlocks`, `controlRodDomains`). |
| `restricted` | object | Yes | Restricted posture buckets (`constraints`). |
| `guarded` | object | Yes | Guarded posture buckets (`constraints`, `safetyInterlocks`, `controlRodDomains`). |

`blocked.constraints` item shape:

- `ruleId`
- `label`
- `enforcementClass`
- `status`

`blocked.safetyInterlocks` and `guarded.safetyInterlocks` item shape:

- `interlockId`
- `actionCategory`
- `defaultOutcome`
- `requiresExplicitAuthorization`

`blocked.controlRodDomains` and `guarded.controlRodDomains` item shape:

- `domainId`
- `label`
- `autonomyLevel`

## Anti-Gamification Rule

Compressed Safety posture skills must not emit:

- `score`
- `points`
- `badge`
- `rank`
- `leaderboard`
- engagement analytics or social comparison outputs

## Contract Invariants

- output is deterministic for the same inputs
- input objects remain unchanged after rendering
- existing engine contracts remain unchanged
- SessionBrief no-widening remains enforced (`journeymanLevel` is not introduced)
- no hidden write path is introduced
- `/silence-map` remains view-only for Control Rod posture/status

## Current Implementation Truth

- This is a Wave 5B Block D v1 spec baseline.
- Runtime adapter implementation exists at `src/CompressedSafetyPostureSkills.js`.
- Golden proof exists at `tests/golden/CompressedSafetyPostureSkills.golden.test.js`.
- Operator-facing skill artifacts exist at:
  - `skills/constraints-SKILL.md`
  - `skills/silence-map-SKILL.md`
