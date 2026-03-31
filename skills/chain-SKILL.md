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

1. Read existing chain entries from approved read paths.
2. Pass chain view input to `CompressedHistoryTrustSkills.renderChain`.
3. Render deterministic chain-history output fields.

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
