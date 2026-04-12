---
name: confidence-transitions
description: "Preview and explicitly append neutral confidence transition findings from explicit marker continuity compare input."
---

# /confidence-transitions

## Purpose

Use when you want to convert explicit Packet 3 marker continuity compare output into append-ready neutral transition findings, review them first, and append only when explicitly requested.

## Input Source

- Use explicit `MarkerContinuityEngine.compare(...)` output only.
- Provide explicit `sessionId` and `recordedAt` for append-ready entry generation.
- Keep comparison input unchanged.
- Keep append request explicit (`append: true`) when writing to chain.

## Render Path

1. Gather explicit compare input.
2. Pass compare input and append-shape fields to `ConfidenceTransitionsSkill.renderConfidenceTransitions(...)`.
3. Default to preview behavior.
4. Append only when `append: true` is explicitly requested and a chain is provided.

## Output Contract

Route output includes:

- `route`
- `action`
- `appendRequested`
- `generatedCount`
- `generatedEntries`
- `appendedCount`
- `appendedEntryIds`

## Must Not

- mutate `/confidence`
- introduce resolution semantics
- introduce restoration semantics
- auto-append
- auto-resolve disappearance
- emit entry types other than `FINDING`
- emit transition classes beyond `NEWLY_OBSERVED`, `NO_LONGER_OBSERVED`, `RETIERED`
- emit entries for `MATCHED` without `retiered`
- emit entries for `AMBIGUOUS`
- add linked history traversal or `linkedEntryRefs` graphing
