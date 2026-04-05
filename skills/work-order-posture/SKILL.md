---
name: work-order-posture
public_label: Work Order Posture
class: operator-surface
tier: wave7b
description: "Turn a normalized Work Order intake into a visible default safety posture map for operator review."
---

# /work-order-posture

## Purpose

Use when you want to turn an existing Work Order intake object into a visible default posture map without asking the operator to think like a plugin engineer.

## Input Source

- Use an existing normalized `WorkOrderIntake` object only.
- Use `customerDataTouchpoints` and `quoteBillingBookingExposure` only for posture evidence visibility.
- Do not use `exclusions` for posture derivation.
- Keep `recommendedProfileId` fixed to `conservative` in v1.

## Evaluation Path

1. Read the existing `WorkOrderIntake` object.
2. Pass it to `WorkOrderPostureEngine.generate`.
3. Present the profile rationale, domain posture map, and protected/supervised/permissive groupings.
4. If posture `status` is `hold`, surface the HOLDs and stop.
5. If posture `status` is `ready`, ask whether the default looks right and note any conversational overrides for later build setup, but stop.

## Output Contract

Return the `WorkOrderPosture` object with:

- `postureId`
- `intakeRef`
- `status`
- `recommendedProfileId`
- `profileRationale`
- `domainPosture`
- `protectedDomains`
- `supervisedDomains`
- `permissiveDomains`
- `overrideInstructions`
- `holds`
- `source`
- `createdAt`

## Must Not

- add any profile-selection branch or balanced/velocity recommendation
- use `exclusions` for posture derivation
- mutate `ControlRodMode`, hook-runtime state, or `.claude/settings.json`
- apply overrides in this step
- create `SessionBrief`
- create permits or authorizations
- begin execution from posture generation alone
- add adaptive learning or trust-learning behavior