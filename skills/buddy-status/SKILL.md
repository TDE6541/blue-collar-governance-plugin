---
name: buddy-status
description: "Render a read-only watcher snapshot from current policy and active callouts already recorded."
---

# /buddy-status

## Purpose

Use when you want a read-only view of what the watcher is currently holding, what callouts are already active, and what the current watcher posture says.

## Input Source

- Use existing Buddy watcher policy input only.
- Use existing Buddy callout snapshot input only.
- Keep supplied callout order unchanged.

## Render Path

1. Gather the current watcher policy snapshot.
2. Gather the current callout snapshot list.
3. Pass both inputs to `BuddyStatusSkill.renderBuddyStatus`.
4. Return deterministic snapshot output.

## Output Contract

Route output includes:

- `route`
- `watcherPolicy`
- `calloutCount`
- `callouts`
- `snapshotState`
- `renderNote`

## Must Not

- alter runtime state
- invoke `checkPresence`
- invoke Buddy mutator methods
- add advisory language
- add comparative or ordering math
- add any route beyond `/buddy-status`
