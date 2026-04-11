---
name: confidence
public_label: Confidence
class: operator-surface
tier: confidence-phase1-plus-required-coverage
description: "Render a read-only confidence-marker map and optional required coverage view from deterministic slash-marker scans inside the approved repo fence."
---

# /confidence

## Purpose

Use when you want a read-only view of explicit confidence markers across the approved confidence scan fence, with optional explicit required coverage evaluation.

## Input Source

- Collect explicit file snapshots from `src/`, `hooks/`, `scripts/`, and `.claude/` only.
- Scan `*.js` files only.
- Pass the file snapshots to `ConfidenceGradientEngine.scan(...)`.
- If repo-root `confidence-required-coverage.json` is present and intentionally supplied as explicit input, pass the same file snapshots plus the parsed policy object to `ConfidenceGradientEngine.evaluateRequiredCoverage(...)`.
- Pass the scan report to `ConfidenceSkill.renderConfidence(...)`.
- When required coverage was evaluated, pass that report as `requiredCoverageView`.
- Treat only `///`, `////`, `/////`, and `//////` as shipped markers.
- Treat `/{7,}` and semicolon-family markers as non-markers in this baseline.

## Render Path

1. Collect the approved file snapshots only.
2. Run `ConfidenceGradientEngine.scan(...)`.
3. If explicit required coverage policy input is present, run `ConfidenceGradientEngine.evaluateRequiredCoverage(...)`.
4. Pass the scan report to `ConfidenceSkill.renderConfidence(...)`.
5. When available, pass the required coverage report as `requiredCoverageView`.
6. Return the canonical route render first.

## Output Contract

Return the route object with:

- `route`
- `markerFamily`
- `tierTotals`
- `fileMarkerMap`
- `domainGrouping`
- `topHoldKillLocations`
- optional `requiredCoverage`

When `requiredCoverage` is present, it must remain separate from observed marker truth and contain only:

- `policyMode`
- `markerFamily`
- `targetCount`
- `evaluatedTargetCount`
- `findings`
- `policyErrors`

## Must Not

- widen the scan fence
- scan `docs/`, `skills/`, `tests/`, `raw/`, `.git/`, or `node_modules/`
- mutate files, runtime state, board state, or chain state
- implement semicolon-family support
- add domain-keyed policy, globs, or inheritance
- imply reviewed-and-clean semantics
- add scores, trends, percentages, or governance-health math
