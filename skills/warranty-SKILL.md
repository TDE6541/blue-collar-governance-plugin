---
name: warranty
public_label: Warranty
class: operator-surface
tier: wave5b
description: "Render existing WarrantyMonitor derived posture views with read/query/render-only behavior."
---

# /warranty

## Purpose

Render existing derived warranty posture views from shipped Warranty Monitor truth.

## Input Source

- Query existing `WarrantyMonitor.deriveWarrantyViews(...)` output from approved read/query paths.
- Do not create warranty persistence state or writeback records.

## Render Path

1. Read existing derived warranty views.
2. Pass views to `CompressedHistoryTrustSkills.renderWarranty`.
3. Render deterministic warranty posture output fields.

## Output Contract

Return the `Warranty` view with:

- `route`
- `viewCount`
- `stateSummary`
- `views`

## Must Not

- create or persist warranty state
- reinterpret `/warranty` away from existing derived monitor output
- introduce new engine logic behind the skill
- emit score, points, badges, rank, or leaderboard fields
- add package/install/runtime-hook claims
