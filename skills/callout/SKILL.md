---
name: callout
description: "Render a read-only callout-detail snapshot from current Buddy callouts already recorded."
---

# /callout

## Purpose

Use when you want to inspect the callouts the watcher is already holding, see which ones are active right now, and review their recorded detail without changing watcher state.

## Input Source

- Use existing Buddy callout snapshot input only.
- Keep supplied callout order unchanged.

## Render Path

1. Gather the current callout snapshot list.
2. Pass the list to `CalloutSkill.renderCallout`.
3. Return deterministic snapshot output.

## Output Contract

Route output includes:

- `route`
- `calloutCount`
- `callouts`
- `snapshotState`
- `renderNote`

## Must Not

- alter runtime state
- invoke Buddy mutator methods
- invoke `checkPresence`
- add watcher posture synthesis
- add advisory language
- add comparative or ordering math
- add any route beyond `/callout`
