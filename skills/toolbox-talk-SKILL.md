---
name: toolbox-talk
public_label: Toolbox Talk
class: operator-surface
tier: wave5b
description: "Render startup carry-forward context from SessionBrief.toolboxTalk using read/query/render-only behavior."
---

# /toolbox-talk

## Purpose

Render startup carry-forward context from existing SessionBrief truth.

## Input Source

- Read an existing `SessionBrief` object from approved runtime read paths.
- Do not create or mutate SessionBrief state.

## Render Path

1. Read the target brief.
2. Pass it to `SessionLifecycleSkills.renderToolboxTalk`.
3. Render the returned view as plain language plus refs.

## Output Contract

Return the `Toolbox Talk` view with:

- `route`
- `briefId`
- `available`
- `summary`
- `counts`
- `refs`
- `currentHazards`
- `activeDeferredChangeOrderSummary`
- `permitLockoutSummary`
- `continuityStandingRiskSummary`

## Must Not

- write or update brief state
- widen SessionBrief fields
- infer identity from ambient system state
- emit score, points, badges, rank, or leaderboard fields
- add package/install/runtime-hook claims
