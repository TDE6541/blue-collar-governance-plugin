---
name: work-order-scaffold
public_label: Work Order Scaffold
class: operator-surface
tier: wave7b
description: "Convert a normalized Work Order intake object into a governed scaffold with explicit scope fences, anti-goals, acceptance criteria, and HOLDs."
---

# /work-order-scaffold

## Purpose

Use when you want to turn an existing Work Order intake object into a governed scaffold the operator can review without needing any prompt-engineering syntax.

## Input Source

- Use an existing normalized `WorkOrderIntake` object only.
- Preserve intake values exactly.
- Preserve missing intake fields as scaffold HOLDs and `[HOLD: fieldName]` placeholders.
- Do not add protected domains, control-rod hints, or protection defaults.

## Evaluation Path

1. Read the existing `WorkOrderIntake` object.
2. Pass it to `WorkOrderScaffoldEngine.generate`.
3. If scaffold `status` is `hold`, surface the scaffold with its HOLDs and stop.
4. If scaffold `status` is `ready`, return the scaffold and stop.

## Output Contract

Return the `WorkOrderScaffold` object with:

- `scaffoldId`
- `intakeRef`
- `status`
- `goal`
- `scope`
- `antiGoals`
- `acceptanceCriteria`
- `doNotShip`
- `holds`
- `source`
- `createdAt`

## Must Not

- write files or create directories
- mutate session state or hook-runtime state
- create `SessionBrief`
- generate code or scaffold files
- add `protectedDomains`
- add `controlRodHint`
- add any profile/default-protection output
- begin execution from scaffold generation alone
- add any prompt blob meant for direct paste/use