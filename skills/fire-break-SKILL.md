---
name: fire-break
description: "Render manual governance snapshot visibility from Open Items Board truth."
---

# /fire-break

## Purpose

Render a manual governance health snapshot from existing Open Items Board output.

## Input Source

- Use existing Open Items Board projection output only.
- Keep source refs and evidence refs exactly as supplied.

## Render Path

1. Gather current Open Items Board snapshot.
2. Pass input to `FireBreakSkill.renderFireBreak`.
3. Return deterministic route output.

## Output Contract

Route output includes:

- `route`
- `boardLabel`
- `sessionId`
- `precedence`
- `groups`
- `snapshot`

## Must Not

- alter runtime state
- trigger control behavior
- run automation behavior
- add any route beyond `/fire-break`

