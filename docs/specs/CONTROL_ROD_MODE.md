# CONTROL_ROD_MODE.md
**Status:** Wave 4 Block A1 contract baseline (v2)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 4 Block A1 contract baseline for `ControlRodMode`.

`ControlRodMode` is a deterministic control surface for:

- static profile resolution and normalization
- HARD_STOP LOTO authorization validation
- HARD_STOP permit-gate decisioning

## Boundary

`ControlRodMode` defines autonomy levels, starter profiles, starter domains, normalized profile shape, and deterministic HARD_STOP gating semantics.

This spec does not define:

- adaptive learning, history analysis, or profile auto-tuning
- rod suggestions or recommendation logic
- buddy behavior or live watcher behavior
- Foreman's Walk finding determination behavior
- continuity redesign or board redesign
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Control Rod Mode`
- Internal build name: `ControlRodMode`
- Core contract objects:
  - `ControlRodProfileSnapshot`
  - `LotoAuthorization`
  - `PermitDecision`

## Autonomy Levels

`autonomyLevel` must be one of:

- `FULL_AUTO`
- `SUPERVISED`
- `HARD_STOP`

No fourth autonomy level is allowed.

## Starter Profiles

Built-in starter profiles:

- `conservative`
- `balanced`
- `velocity`

## Starter Domain Baseline

Starter domains:

- `pricing_quote_logic`
- `customer_data_pii`
- `database_schema`
- `protected_destructive_ops`
- `auth_security_surfaces`
- `existing_file_modification`
- `new_file_creation`
- `ui_styling_content`
- `documentation_comments`
- `test_files`

## Domain Rule Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `domainId` | string | Yes | Stable domain identifier. |
| `label` | string | Yes | Operator-readable domain label. |
| `filePatterns` | string[] | Yes | File-pattern set for the domain. |
| `operationTypes` | string[] | Yes | Operation-type set for the domain. |
| `autonomyLevel` | enum | Yes | One of `FULL_AUTO`, `SUPERVISED`, or `HARD_STOP`. |
| `justification` | string | Yes | Plain-language reason for selected posture. |

## ControlRodProfileSnapshot Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `profileId` | string | Yes | Stable profile identifier. |
| `profileLabel` | string | Yes | Operator-readable profile label. |
| `domainRules` | DomainRule[] | Yes | Normalized deterministic domain-rule set. |

## Profile Resolution Rules

- Input may be a preset id (`conservative`, `balanced`, `velocity`) or explicit profile object.
- Stored session truth remains a normalized snapshot object.
- Preset resolution is deterministic.
- Explicit profile input must validate against v2 domain and autonomy constraints.

## HARD_STOP Upgrade: LOTO Authorization

`LotoAuthorization` required fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `authorizationId` | string | Yes | Stable authorization id. |
| `domainId` | string | Yes | HARD_STOP domain this authorization applies to. |
| `authorizedBy` | string | Yes | Operator identity for authorization. |
| `authorizedAt` | string | Yes | ISO 8601 authorization timestamp. |
| `reason` | string | Yes | Plain-language authorization reason. |
| `scope` | object | Yes | Session-bound or expiry-bound scope object. |
| `conditions` | string[] | No | Optional constraints. |
| `chainRef` | string | Yes | Forensic reference for this authorization event. |

`scope.scopeType` must be one of:

- `SESSION` (requires `scope.sessionId`)
- `EXPIRY` (requires `scope.expiresAt` ISO 8601)

## HARD_STOP Upgrade: Permit Process

`PermitDecision` required fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `permitId` | string | Yes | Stable permit id. |
| `sessionId` | string | Yes | Session id for permit decision context. |
| `requestedDomains` | string[] | Yes | Requested HARD_STOP domains. |
| `scopeJustification` | string | Yes | Why this scoped work is requested. |
| `riskAssessment` | string | Yes | Operator-readable risk assessment. |
| `rollbackPlan` | string | Yes | Rollback plan before action proceeds. |
| `operatorDecision` | enum | Yes | `GRANTED`, `DENIED`, or `CONDITIONAL`. |
| `conditions` | string[] | Conditional | Required and non-empty when `operatorDecision=CONDITIONAL`. |
| `chainRef` | string | Yes | Forensic reference for permit decision. |

Permit-gate outcomes are deterministic:

- `GRANTED` -> proceed
- `DENIED` -> do not proceed
- `CONDITIONAL` -> proceed under explicit conditions

Permit process applies only to HARD_STOP domains.

## Gate Decision Invariants

- Non-HARD_STOP domains do not require permit or LOTO.
- HARD_STOP domains require valid LOTO authorization and permit objects.
- Authorization domain and permit requested domains must match gate domain.
- Session-bound authorization must match gate session id.
- Expiry-bound authorization must not be expired at evaluation time.

## Contract Invariants

- Autonomy enum remains exactly three levels.
- No adaptive learning behavior is introduced.
- No rod suggestion behavior is introduced.
- No buddy behavior is introduced.
- Continuity remains the only cross-session operational substrate.
- Forensic Chain remains evidence substrate only.

## Current Implementation Truth

- This is a Block A1 v2 spec baseline.
- Runtime implementation exists at `src/ControlRodMode.js`.
- Golden proof exists at `tests/golden/ControlRodMode.golden.test.js`.
