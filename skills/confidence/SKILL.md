---
name: confidence
public_label: Confidence
class: operator-surface
tier: confidence-phase1-plus-required-coverage-plus-marker-continuity-plus-temporal-signals
description: "Render a read-only confidence-marker map plus optional required coverage, optional marker continuity, and optional explicit dated temporal signals from deterministic slash-marker scans inside the approved repo fence."
---

# /confidence

## Purpose

Use when you want a read-only view of explicit confidence markers across the approved confidence scan fence, with optional explicit required coverage evaluation, optional explicit marker continuity comparison, and optional explicit dated temporal interpretation.

## Input Source

- Collect explicit file snapshots from `src/`, `hooks/`, `scripts/`, and `.claude/` only.
- Scan `*.js` files only.
- Pass the file snapshots to `ConfidenceGradientEngine.scan(...)`.
- If explicit snapshot capture is needed for later comparison, pass the same file snapshots to `ConfidenceGradientEngine.buildSnapshot(...)`.
- If repo-root `confidence-required-coverage.json` is present and intentionally supplied as explicit input, pass the same file snapshots plus the parsed policy object to `ConfidenceGradientEngine.evaluateRequiredCoverage(...)`.
- If explicit previous and current snapshots are intentionally supplied for comparison, pass them to `MarkerContinuityEngine.compare(previousSnapshot, currentSnapshot)`.
- If explicit dated timeline entries are intentionally supplied for temporal evaluation, pass ordered `{ observedAt, snapshot }` entries plus explicit thresholds to `MarkerTemporalSignalsEngine.evaluateTimeline(timelineEntries, options)`.
- Pass the scan report to `ConfidenceSkill.renderConfidence(...)`.
- When required coverage was evaluated, pass that report as `requiredCoverageView`.
- When marker continuity was evaluated, pass that report as `markerContinuityView`.
- When temporal signals were evaluated, pass that report as `markerTemporalSignalsView`.
- Treat only `///`, `////`, `/////`, and `//////` as shipped markers.
- Treat `/{7,}` and semicolon-family markers as non-markers in this baseline.
- Treat time as explicit only; do not infer it from git, filesystem metadata, branch age, session date, or closeout date.

## Render Path

1. Collect the approved file snapshots only.
2. Run `ConfidenceGradientEngine.scan(...)`.
3. If explicit snapshot capture is needed, run `ConfidenceGradientEngine.buildSnapshot(...)`.
4. If explicit required coverage policy input is present, run `ConfidenceGradientEngine.evaluateRequiredCoverage(...)`.
5. If explicit previous and current snapshots are present, run `MarkerContinuityEngine.compare(...)`.
6. If explicit dated timeline entries are present, run `MarkerTemporalSignalsEngine.evaluateTimeline(...)`.
7. Pass the scan report to `ConfidenceSkill.renderConfidence(...)`.
8. When available, pass the required coverage report as `requiredCoverageView`.
9. When available, pass the marker continuity report as `markerContinuityView`.
10. When available, pass the marker temporal signals report as `markerTemporalSignalsView`.
11. Return the canonical route render first.

## Output Contract

Return the route object with:

- `route`
- `markerFamily`
- `tierTotals`
- `fileMarkerMap`
- `domainGrouping`
- `topHoldKillLocations`
- optional `requiredCoverage`
- optional `markerContinuity`
- optional `markerTemporalSignals`

When `requiredCoverage` is present, it must remain separate from observed marker truth and contain only:

- `policyMode`
- `markerFamily`
- `targetCount`
- `evaluatedTargetCount`
- `findings`
- `policyErrors`

When `markerContinuity` is present, it must remain separate from current scan truth and contain only:

- `comparisonVersion`
- `markerFamily`
- `previousSnapshotVersion`
- `currentSnapshotVersion`
- `continuityChanges`
- `ambiguousCases`

When `markerTemporalSignals` is present, it must remain separate from current scan truth, required coverage, and marker continuity, and contain only:

- `temporalVersion`
- `markerFamily`
- `thresholds`
- `timeline`
- `findings`
- `errors`
- `trendSummary`

## Must Not

- widen the scan fence
- scan `docs/`, `skills/`, `tests/`, `raw/`, `.git/`, or `node_modules/`
- mutate files, runtime state, board state, or chain state
- implement semicolon-family support
- add domain-keyed policy, globs, or inheritance
- imply reviewed-and-clean semantics
- add scores, priorities, percentages, or governance-health math
- add standing-risk or resolution language
- add rename-aware or cross-file continuity claims
- age Packet 2 required coverage
- infer temporal meaning from git history, filesystem metadata, branch age, session date, or closeout date
