---
name: receipt
public_label: Receipt
class: operator-surface
tier: wave5b
description: "Render session receipt truth from existing SessionReceipt read paths with no state mutation."
---

# /receipt

## Purpose

Render closeout receipt truth from existing SessionReceipt records.

## Input Source

- Read an existing `SessionReceipt` object from approved runtime read paths.
- Do not create, update, or persist receipt state.

## Render Path

1. Read the target receipt.
2. Pass it to `SessionLifecycleSkills.renderReceipt`.
3. Render the returned view for operator consumption.

## Output Contract

Return the `Receipt` view with:

- `route`
- `receiptId`
- `briefRef`
- `outcome`
- `signoffRequired`
- `summary`
- `holdsRaised`
- `approvedDrift`
- `excludedWork`
- `artifactsChanged`
- `createdBy`
- `createdAt`
- `updatedAt`

## Must Not

- mutate receipt state
- create receipt records
- widen SessionReceipt contract
- emit score, points, badges, rank, or leaderboard fields
- add package/install/runtime-hook claims
