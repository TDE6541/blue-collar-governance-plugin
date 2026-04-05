# WORK_ORDER_POSTURE.md
**Status:** Wave 7B Block F contract baseline
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 7B Block F contract baseline for `WorkOrderPostureEngine`.

`WorkOrderPostureEngine` converts a normalized `WorkOrderIntake` object into a visible default safety posture for the Work Order pilot.

## Boundary

`WorkOrderPostureEngine` is a deterministic, stateless posture generator.

The posture object is a review surface, not an execution trigger.

This spec does not define:

- profile-selection branches
- adaptive learning or trust-learning
- exclusions parsing for posture derivation
- `ControlRodMode` mutation
- hook-runtime integration
- `.claude/settings.json` writes
- `SessionBrief` creation
- permits, authorizations, or session start
- automatic execution

## Public And Internal Names

- Public/operator-facing label: `Work Order Posture`
- Internal build name: `WorkOrderPostureEngine`
- Core contract object: `WorkOrderPosture`

## Evaluation Model

The engine consumes an existing `WorkOrderIntake` object and returns a deterministic `WorkOrderPosture`.

The engine does not write files, mutate hook/runtime state, apply overrides, or begin implementation work.

## Statuses

`status` must be one of:

- `ready`
- `hold`

## Posture HOLD Reasons

Posture hold `reason` must be one of:

- `INTAKE_MISSING`
- `INTAKE_DEFERRED`

## V1 Recommendation Lock

In Work Order pilot v1:

- `recommendedProfileId` is always `conservative`
- the 10-domain autonomy map is always the conservative starter-profile map
- intake evidence does not change autonomy levels

This spec does not permit:

- `deriveProfile`
- `selectProfile`
- balanced or velocity recommendation branches
- intake-driven autonomy changes

## Input Boundary

Block F consumes the existing `WorkOrderIntake` contract without widening it.

Only these intake fields may affect posture evidence in v1:

- `customerDataTouchpoints`
- `quoteBillingBookingExposure`

These fields may affect only:

- `profileRationale`
- `domainPosture[].rationale`
- `domainPosture[].intakeEvidence`
- `domainPosture[].protectionBasis`
- `domainPosture[].isDefault`
- `holds`

These fields must not affect autonomy levels.

These intake fields are not used for posture derivation in v1:

- `businessName`
- `tradeOrServiceType`
- `serviceArea`
- `contactPath`
- `whatTheyWantBuilt`
- `exclusions`

## Protection Basis Values

`protectionBasis` must be one of:

- `doctrine`
- `doctrine_with_evidence`

## DomainPostureEntry Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `domainId` | string | Yes | Stable domain identifier. |
| `domainLabel` | string | Yes | Operator-readable domain label. |
| `autonomyLevel` | string | Yes | Copied from the conservative 10-domain map. |
| `rationale` | string | Yes | Plain-language reason for the current visible posture. |
| `intakeEvidence` | string[] | Yes | Intake field names used as visible posture evidence. |
| `protectionBasis` | string | Yes | `doctrine` or `doctrine_with_evidence`. |
| `isDefault` | boolean | Yes | `true` when the entry remains on doctrinal defaults only. |

## WorkOrderPosture Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `postureId` | string | Yes | Stable posture identifier derived from intake. |
| `intakeRef` | string | Yes | Intake identifier this posture traces to. |
| `status` | string | Yes | `ready` or `hold`. |
| `recommendedProfileId` | string | Yes | Always `conservative` in v1. |
| `profileRationale` | string | Yes | Plain-language explanation for the recommendation lock and evidence visibility. |
| `domainPosture` | DomainPostureEntry[] | Yes | Visible 10-domain posture map. |
| `protectedDomains` | string[] | Yes | `HARD_STOP` domain ids in baseline order. |
| `supervisedDomains` | string[] | Yes | `SUPERVISED` domain ids in baseline order. |
| `permissiveDomains` | string[] | Yes | `FULL_AUTO` domain ids in baseline order. |
| `overrideInstructions` | string[] | Yes | Plain-language review and later-override instructions. |
| `holds` | object[] | Yes | HOLDs for incomplete governance-exposure evidence. |
| `source` | string | Yes | Posture-generation source label. |
| `createdAt` | string | Yes | ISO 8601 timestamp carried through from intake. |

## Mapping Rules

### `customerDataTouchpoints`

When present and non-empty:

- affects `customer_data_pii`
- autonomy level stays `HARD_STOP`
- rationale becomes specific
- `protectionBasis = doctrine_with_evidence`
- `intakeEvidence = ["customerDataTouchpoints"]`
- `isDefault = false`

When null:

- `customer_data_pii` still stays `HARD_STOP`
- rationale states exposure is unconfirmed
- emit a HOLD explaining posture evidence is incomplete
- `protectionBasis = doctrine`
- `intakeEvidence = []`
- `isDefault = true`

### `quoteBillingBookingExposure`

When present and non-empty:

- affects `pricing_quote_logic`
- autonomy level stays `HARD_STOP`
- rationale becomes specific
- `protectionBasis = doctrine_with_evidence`
- `intakeEvidence = ["quoteBillingBookingExposure"]`
- `isDefault = false`

When null:

- `pricing_quote_logic` still stays `HARD_STOP`
- rationale states exposure is unconfirmed
- emit a HOLD explaining posture evidence is incomplete
- `protectionBasis = doctrine`
- `intakeEvidence = []`
- `isDefault = true`

### Always-Protected Domains By Doctrine

These remain `HARD_STOP` by doctrine in the Work Order pilot:

- `auth_security_surfaces`
- `protected_destructive_ops`
- `database_schema`

No intake field changes their autonomy level.

## Contract Invariants

- `recommendedProfileId` is always `conservative` in v1.
- The 10-domain autonomy map is the conservative starter-profile map for all posture outputs.
- `exclusions` is not used in posture derivation.
- The posture surface is visible and reviewable, not self-applying.
- Operator authority remains intact through review and later override capture.
- No `ControlRodMode`, hook-runtime, or settings mutation is introduced.
- No adaptive learning or all-trades generalization is introduced.
- `MIGRATIONS.md` remains unchanged.

## Current Implementation Truth

- This is a Wave 7B Block F spec baseline.
- Runtime implementation exists at `src/WorkOrderPostureEngine.js`.
- Operator-facing skill exists at `skills/work-order-posture/SKILL.md`.
- Golden proof exists at `tests/golden/WorkOrderPostureEngine.golden.test.js`.