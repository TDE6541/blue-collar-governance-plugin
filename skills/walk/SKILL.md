---
name: walk
public_label: Walk
class: operator-surface
tier: wave5b
description: "Render Foreman's Walk evaluation output for post-session verification with no engine mutation."
---

# /walk

## Purpose

Render Foreman's Walk evaluation results as a deterministic post-session verification view.

## Input Source

- Query existing `ForemansWalk.evaluate(...)` output.
- Optional Packet 5 composition only: a caller that already has precomputed `confidenceSidecarView` data may pass it to the in-process `/walk` render adapter.
- The shipped `node scripts/render-skill.js walk` wrapper remains persisted-walk-only in this packet and does not discover or compute confidence input.
- Do not alter Foreman's Walk inputs or engine state.

## Render Path

1. Invoke `node scripts/render-skill.js walk` via Bash.
2. The wrapper checks for persisted sessionBrief and sessionReceipt data required by the Walk engine. If these are not available, the wrapper returns a deterministic HOLD.
3. Render the wrapper's JSON result faithfully.
4. If `status` is `hold`, surface the HOLD directly and stop.

## Optional Packet 5 Sidecar Composition

- `SessionLifecycleSkills.renderWalk(walkEvaluation, { confidenceSidecarView })` may compose one separate informational `confidence` block.
- Packet 5 supports only `observedMarkers`, `requiredCoverage`, and `markerContinuity`.
- Packet 5 does not render temporal sidecar sections.
- The sidecar is canonical-only and does not change findings, severity, blocking posture, clean-closeout posture, `sessionOfRecordRef`, or `asBuiltStatusCounts`.
- Existing unsupported skin plus sidecar requests must remain on the raw canonical fallback path.

## Output Contract

Return the `Walk` view with:

- `route`
- `findingCount`
- `findingSummary`
- `findings`
- `sessionOfRecordRef`
- `asBuiltStatusCounts`
- optional `confidence`

## Must Not

- mutate Foreman's Walk behavior
- widen Foreman's Walk contract
- compute confidence data during `/walk` rendering
- add live watcher behavior or other non-session-lifecycle features
- emit score, points, badges, rank, or leaderboard fields
- add package/install/runtime-hook claims
