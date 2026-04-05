---
name: work-order-intake
public_label: Work Order Intake
class: operator-surface
tier: wave7b
description: "Turn a plain-language Work Order start into a structured intake evaluation with deterministic HOLDs and follow-up questions."
---

# /work-order-intake

## Purpose

Use when you want to start a Work Order intake from plain language, ask only for the missing required details, and stop at a normalized intake object.

## Input Source

- Start from the operator's plain-language description and any explicit follow-up answers.
- Extract only fields the operator actually stated.
- Leave unresolved required fields as `null`.
- Use `explicitDeferrals` only when the operator explicitly declines to provide a required field.
- Provide explicit `intakeId` and ISO 8601 `createdAt` metadata when calling the engine.

## Evaluation Path

1. Extract structured values from the operator's plain-language start without guessing.
2. Pass the structured input to `WorkOrderIntakeEngine.evaluate`.
3. If `status` is `hold`, surface the `holds` and `followUpQuestions` and stop.
4. If `status` is `complete`, return the normalized intake object and stop.

## Output Contract

Return:

- `status`
- `normalizedIntake`
- `holds`
- `followUpQuestions`

## Must Not

- infer missing fields
- treat missing as deferred
- mutate session state or hook-runtime state
- create SessionBrief or SessionReceipt
- generate scaffold, implementation output, or protection defaults
- treat intake as part of the existing Work Order skin contract
- add a second intake skin or any extra intake route beyond `/work-order-intake`
- begin execution from intake alone