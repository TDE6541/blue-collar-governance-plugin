---
name: diagnose
description: "Render evidence-linked diagnostic visibility from existing Walk and Chain truth."
---

# /diagnose

## Purpose

Render an evidence-linked diagnostic view from existing Walk findings and existing Chain entries.

## Input Source

- Use existing `ForemansWalk.evaluate(...)` output only.
- Use existing `ForensicChain` read output only.
- Keep provided values exactly as supplied.

## Render Path

1. Gather current Walk evaluation output.
2. Gather current Chain read output.
3. Pass both to `DiagnoseSkill.renderDiagnose`.
4. Return deterministic route output.

## Output Contract

Route output includes:

- `route`
- `chainId`
- `findingCount`
- `findingSummary`
- `chainEntryCount`
- `chainEntryTypeSummary`
- `linkedEvidenceRefCount`
- `unlinkedEvidenceRefCount`
- `diagnostics`

## Must Not

- alter runtime state
- alter chain data
- add weighted ordering math
- add confidence math
- invent causal claims
- add any route beyond `/diagnose`
