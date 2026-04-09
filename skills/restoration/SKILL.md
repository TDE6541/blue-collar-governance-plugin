---
name: restoration
description: "Render a deterministic restoration ledger from existing Forensic Chain truth and surface continuity-only Board resolved-outcomes projection."
---

# /restoration

## Purpose

Render a derived restoration ledger from existing `ForensicChain` truth.

## Input Source

- Use existing `ForensicChain` read output only.
- Derive restoration records through `RestorationEngine.listRecords(...)`.
- Derive Board resolved-outcomes through the additive projection adapter only.

## Render Path

1. Gather existing chain read output.
2. Pass it to `RestorationSkill.renderRestoration(...)`.
3. Return the deterministic ledger view.

## Output Contract

Route output includes:

- `route`
- `chainId`
- `recordCount`
- `verifiedCount`
- `boardProjectionCount`
- `records`
- `boardResolvedOutcomes`

## Must Not

- alter chain state
- alter continuity state
- alter Board state
- add a hidden restoration store
- force walk-only or manual-only restored items into Board projection
