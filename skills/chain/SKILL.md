---
name: chain
public_label: Chain
class: operator-surface
tier: wave5b
description: "Render existing ForensicChain entry history as a deterministic read/query/render-only view."
---

# /chain

## Purpose

Render existing forensic evidence chain history from shipped append-only truth.

## Input Source

- Query existing Forensic Chain read outputs (`getEntry` and/or `listEntries`).
- Do not append, update, or delete chain entries.

## Render Path

1. Invoke `node scripts/render-skill.js chain` via Bash.
2. The wrapper reads the most recent session state, extracts chain entries, and calls `CompressedHistoryTrustSkills.renderChain`.
3. Render the wrapper's JSON result faithfully.
4. If `status` is `hold`, surface the HOLD directly and stop.

## Output Contract

Return the `Chain` view with:

- `route`
- `chainId`
- `entryCount`
- `entryTypeSummary`
- `entries`

## Must Not

- append or mutate forensic chain state
- reinterpret `/chain` away from forensic history/linkage browsing
- introduce new engine logic behind the skill
- emit score, points, badges, rank, or leaderboard fields
- add package/install/runtime-hook claims
