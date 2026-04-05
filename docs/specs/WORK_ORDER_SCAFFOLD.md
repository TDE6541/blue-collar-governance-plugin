# WORK_ORDER_SCAFFOLD.md
**Status:** Wave 7B Block E contract baseline
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 7B Block E contract baseline for `WorkOrderScaffoldEngine`.

`WorkOrderScaffoldEngine` converts a normalized `WorkOrderIntake` object into a governed build scaffold that stays planning-only.

## Boundary

`WorkOrderScaffoldEngine` is a deterministic, stateless scaffold generator.

The scaffold is a plan object, not an execution trigger.

This spec does not define:

- file or directory creation
- session-state mutation
- hook-runtime integration
- `SessionBrief` creation
- scaffold execution
- protection defaults
- control-rod hints
- protected-domain outputs
- code generation

## Public And Internal Names

- Public/operator-facing label: `Work Order Scaffold`
- Internal build name: `WorkOrderScaffoldEngine`
- Core contract object: `WorkOrderScaffold`

## Evaluation Model

The engine consumes an existing `WorkOrderIntake` object and returns a deterministic `WorkOrderScaffold`.

The engine does not write files, mutate session state, call hook runtime, create `SessionBrief`, or begin implementation work.

## Statuses

`status` must be one of:

- `ready`
- `hold`

## Scaffold HOLD Reasons

Scaffold hold `reason` must be one of:

- `INTAKE_MISSING`
- `INTAKE_DEFERRED`

Missing required intake fields propagate as `INTAKE_MISSING`. Explicitly deferred intake fields propagate as `INTAKE_DEFERRED`.

## Input Boundary

Block E consumes the existing `WorkOrderIntake` contract without widening it.

Allowed intake influences are limited to:

- `businessName`
- `tradeOrServiceType`
- `serviceArea`
- `contactPath`
- `whatTheyWantBuilt`
- `exclusions`
- `customerDataTouchpoints`
- `quoteBillingBookingExposure`

In Block E, these inputs may influence only:

- `goal`
- `scope`
- `antiGoals`
- `acceptanceCriteria`
- `doNotShip`
- `holds`

They must not influence protection defaults, profile hints, protected-domain outputs, or any execution posture.

## WorkOrderScaffold Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `scaffoldId` | string | Yes | Stable scaffold identifier derived from intake. |
| `intakeRef` | string | Yes | Intake identifier this scaffold traces to. |
| `status` | string | Yes | `ready` or `hold`. |
| `goal` | string | Yes | Plain-language governed build goal. |
| `scope` | string[] | Yes | Explicit scope fence derived from intake. |
| `antiGoals` | string[] | Yes | Explicit anti-goals, including structural planning-only constraints. |
| `acceptanceCriteria` | string[] | Yes | Later-execution acceptance targets derived from intake. |
| `doNotShip` | string[] | Yes | Explicit ship-blocking conditions. |
| `holds` | object[] | Yes | Intake-propagated scaffold HOLD records. |
| `source` | string | Yes | Scaffold-generation source label. |
| `createdAt` | string | Yes | ISO 8601 timestamp carried through from intake. |

## Inline HOLD Placeholder Rule

When required intake fields remain unresolved, the scaffold may surface explicit placeholders inline using:

- `[HOLD: fieldName]`

The engine must never replace missing intake values with guesses.

## Structural Anti-Goals Always Present

Every scaffold must include these structural anti-goals:

- `do not begin execution from this scaffold alone`
- `do not silently shift from planning to implementation`
- `do not add features, integrations, or scope beyond what is explicitly listed`

## Structural Do-Not-Ship Conditions Always Present

Every scaffold must include at least:

- `ship is blocked if any INTAKE_MISSING HOLD remains unresolved`
- `ship is blocked if scope items were added that are not traced to intake`

## Contract Invariants

- The scaffold remains planning-only.
- The scaffold does not include `protectedDomains`.
- The scaffold does not include `controlRodHint`.
- The scaffold does not include any profile/default-protection output.
- The scaffold does not create files, code, or execution triggers.
- `MIGRATIONS.md` remains unchanged.

## Current Implementation Truth

- This is a Wave 7B Block E spec baseline.
- Runtime implementation exists at `src/WorkOrderScaffoldEngine.js`.
- Operator-facing skill exists at `skills/work-order-scaffold/SKILL.md`.
- Golden proof exists at `tests/golden/WorkOrderScaffoldEngine.golden.test.js`.