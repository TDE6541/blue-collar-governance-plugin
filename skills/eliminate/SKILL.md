---
name: eliminate
description: "Render existing hold routes, scarcity posture, and resolution paths without adding advice."
---

# /eliminate

## Purpose

Use when you want to inspect what routes and options are already recorded on holds, what scarcity posture is already present, and what the existing resolution paths already say.

## Input Source

- Use existing hold snapshot input only.
- Use existing scarcity report input only.
- Join hold and scarcity rows by exact `holdId` only.

## Render Path

1. Gather hold snapshots from existing read truth.
2. Gather existing derived scarcity report.
3. Pass both inputs to `EliminateSkill.renderEliminate`.
4. Return deterministic route output.

## Output Contract

Route output includes:

- `route`
- `holdCount`
- `holds`
- `renderNote`

## Must Not

- alter runtime state
- infer missing scarcity values
- add recommendation language
- add ranking or scoring fields
- add any route beyond `/eliminate`

