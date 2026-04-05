# WORK_ORDER_INTAKE.md
**Status:** Wave 7B Block D contract baseline
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 7B Block D contract baseline for `WorkOrderIntakeEngine`.

`WorkOrderIntakeEngine` introduces a Work Order front door alongside the unchanged existing Work Order skin by evaluating a structured intake payload and returning a normalized intake object, HOLDs, and follow-up questions.

## Boundary

WorkOrderIntakeEngine is a deterministic, stateless intake evaluator.

The existing Work Order skin remains unchanged. Intake is structurally separate from the current skin/render surface.

Claude extracts available fields from the operator's plain-language input, then calls the engine with structured values.

This spec does not define:

- natural-language parsing inside the engine
- Work Order skin rendering changes
- SessionBrief creation
- hook-runtime mutation
- persistence
- scaffold generation
- protection-default generation
- all-trades intake behavior

## Public And Internal Names

- Public/operator-facing label: `Work Order Intake`
- Internal build name: `WorkOrderIntakeEngine`
- Core contract object: `WorkOrderIntake`

## Evaluation Model

The engine evaluates explicit structured input and returns:

- `status`
- `normalizedIntake`
- `holds`
- `followUpQuestions`

The engine does not write files, mutate session state, call hook runtime, or begin implementation work.

## Statuses

`status` must be one of:

- `complete`
- `hold`

## HOLD Reasons

Hold `reason` must be one of:

- `MISSING_REQUIRED`
- `EXPLICITLY_DEFERRED`

`EXPLICITLY_DEFERRED` may be emitted only when the operator explicitly declines to provide a required field. Missing input must stay `MISSING_REQUIRED` unless explicit deferral is supplied.

## Evaluation Input Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `intakeId` | string | Yes | Stable intake identifier supplied by the caller. |
| `createdAt` | string | Yes | ISO 8601 timestamp supplied by the caller. |
| `source` | string | No | Intake source label. Defaults to `claude_structured_input`. |
| `businessName` | string or null | Yes | Business name. |
| `tradeOrServiceType` | string or null | Yes | Trade or service type. |
| `serviceArea` | string or null | Yes | Service area. |
| `contactPath` | string or null | Yes | Phone number or contact path. |
| `whatTheyWantBuilt` | string or null | Yes | Plain-language build request. |
| `exclusions` | string or null | No | Exclusions or red lines. |
| `customerDataTouchpoints` | string or null | Yes | Customer-data touchpoints. |
| `quoteBillingBookingExposure` | string or null | Yes | Quote, billing, payment, or booking exposure. |
| `explicitDeferrals` | string[] | No | Required fields the operator explicitly declined to answer. |

## WorkOrderIntake Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `intakeId` | string | Yes | Stable intake identifier. |
| `status` | string | Yes | `complete` or `hold`. |
| `businessName` | string or null | Yes | Normalized business name. |
| `tradeOrServiceType` | string or null | Yes | Normalized trade or service type. |
| `serviceArea` | string or null | Yes | Normalized service area. |
| `contactPath` | string or null | Yes | Normalized phone number or contact path. |
| `whatTheyWantBuilt` | string or null | Yes | Normalized build request. |
| `exclusions` | string or null | No | Normalized exclusions or red lines. |
| `customerDataTouchpoints` | string or null | Yes | Normalized customer-data touchpoints. |
| `quoteBillingBookingExposure` | string or null | Yes | Normalized quote, billing, payment, or booking exposure. |
| `holds` | object[] | Yes | Deterministic HOLD records for missing required fields. |
| `followUpQuestions` | object[] | Yes | Deterministic follow-up questions for unresolved required fields. |
| `source` | string | Yes | Source label for the evaluated intake. |
| `createdAt` | string | Yes | ISO 8601 timestamp carried through from evaluation input. |

## Canonical Follow-Up Questions

| Field | Canonical question |
|---|---|
| `businessName` | `What is the business name?` |
| `tradeOrServiceType` | `What trade or service does the business provide?` |
| `serviceArea` | `What area do they serve?` |
| `contactPath` | `What phone number or contact path should customers use?` |
| `whatTheyWantBuilt` | `What do they want built?` |
| `customerDataTouchpoints` | `What customer information or data will this touch?` |
| `quoteBillingBookingExposure` | `Will this touch quotes, invoices, payments, or booking?` |

## Contract Invariants

- Work Order intake is structurally separate from the existing Work Order skin/render surface.
- The engine is deterministic and stateless.
- Missing required fields emit HOLDs instead of guesses.
- Follow-up questions are bounded to one canonical question per unresolved required field.
- Intake does not create SessionBrief, session state, scaffold output, or protection defaults.
- `MIGRATIONS.md` remains unchanged.

## Current Implementation Truth

- This is a Wave 7B Block D spec baseline.
- Runtime implementation exists at `src/WorkOrderIntakeEngine.js`.
- Operator-facing skill exists at `skills/work-order-intake/SKILL.md`.
- Golden proof exists at `tests/golden/WorkOrderIntakeEngine.golden.test.js`.