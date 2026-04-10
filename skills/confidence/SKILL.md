---
name: confidence
public_label: Confidence
class: operator-surface
tier: confidence-phase1
description: "Render a read-only confidence-marker map from deterministic slash-marker scans inside the approved repo fence."
---

# /confidence

## Purpose

Use when you want a read-only view of explicit confidence markers across the approved Phase 1 scan fence.

## Input Source

- Collect explicit file snapshots from `src/`, `hooks/`, `scripts/`, and `.claude/` only.
- Scan `*.js` files only.
- Pass the file snapshots to `ConfidenceGradientEngine.scan(...)`.
- Pass the resulting engine report to `ConfidenceSkill.renderConfidence(...)`.
- Treat only `///`, `////`, `/////`, and `//////` as shipped markers.
- Treat `/{7,}` and semicolon-family markers as non-markers in Phase 1.

## Render Path

1. Collect the approved file snapshots only.
2. Run `ConfidenceGradientEngine.scan(...)`.
3. Pass the engine report to `ConfidenceSkill.renderConfidence(...)`.
4. Return the canonical route render first.

## Output Contract

Return the route object with:

- `route`
- `markerFamily`
- `tierTotals`
- `fileMarkerMap`
- `domainGrouping`
- `topHoldKillLocations`

## Must Not

- widen the scan fence
- scan `docs/`, `skills/`, `tests/`, `raw/`, `.git/`, or `node_modules/`
- mutate files, runtime state, board state, or chain state
- implement semicolon-family support
- add scores, trends, percentages, or governance-health math
