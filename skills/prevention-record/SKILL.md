---
name: prevention-record
description: "Render conservative cumulative governance history from explicit captured signals using read/query/render-only behavior."
---

# /prevention-record

## Purpose

Render a conservative cumulative governance-history view from explicit captured governance signals only.

## Input Source

- Query existing outputs from `ForemansWalk`, `OpenItemsBoard`, `ContinuityLedger`, `StandingRiskEngine`, and `ForensicChain`.
- Supply only explicit captured signals from those surfaces.
- Do not mutate source-state surfaces.

## Render Path

1. Invoke `node scripts/render-skill.js prevention-record` via Bash.
2. The wrapper reads the most recent session state, extracts available forensic entries, and calls `CompressedGovernanceHealthSkills.renderPreventionRecord`.
3. Render the wrapper's JSON result faithfully.
4. If `status` is `hold`, surface the HOLD directly and stop.

## Output Contract

Route output includes:

- `route`
- `sessionId`
- `sourceCounts`
- `capturedSignals`

## Must Not

- infer unsupported claims
- emit speculative harm/value statements
- include any route beyond `/prevention-record` and `/rights`
