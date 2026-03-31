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

1. Gather explicit captured signals from approved surfaces.
2. Pass signals to `CompressedGovernanceHealthSkills.renderPreventionRecord`.
3. Return deterministic route output.

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
