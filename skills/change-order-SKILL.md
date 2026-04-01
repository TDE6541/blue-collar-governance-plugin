---
name: change-order
description: "Render a read-only snapshot of existing change orders and their current recorded decision status."
---

# /change-order

## Purpose

Use when you want a read-only view of what change orders already exist, what status each one is in, and what the current recorded decision state says.

## Input Source

- Use existing change-order snapshot input only.
- Preserve supplied record order exactly.

## Render Path

1. Gather current change-order snapshot records.
2. Pass records to `ChangeOrderSkill.renderChangeOrder`.
3. Return deterministic snapshot output.

## Output Contract

Route output includes:

- `route`
- `changeOrderCount`
- `changeOrders`
- `snapshotState`
- `renderNote`

## Must Not

- invoke `createFromDrift`
- invoke `decide`
- invoke mutating ChangeOrderEngine methods
- alter runtime state
- add action language or recommendation language
- add comparative or ordering math
- add any route beyond `/change-order`
