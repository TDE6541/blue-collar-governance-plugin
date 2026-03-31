---
name: census
description: "Render a manual local repo snapshot from explicit observable truth."
---

# /census

## Purpose

Render a manual repo snapshot from explicit local truth.

## Input Source

- Use explicit local snapshot input only.
- Keep provided values exactly as supplied.

## Render Path

1. Gather local repo snapshot data.
2. Pass input to `CensusSkill.renderCensus`.
3. Return deterministic route output.

## Output Contract

Route output includes:

- `route`
- `repoIdentity`
- `localGitPosture`
- `shippedInventory`
- `artifactCounts`
- `keySurfacePresence`
- `snapshot`

## Must Not

- alter runtime state
- alter repo state
- use network access
- add any route beyond `/census`
