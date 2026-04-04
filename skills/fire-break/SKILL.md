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

1. Invoke `node scripts/render-skill.js fire-break` via Bash.
2. The wrapper checks for persisted Open Items Board projection data. If these are not available, the wrapper returns a deterministic HOLD.
3. Render the wrapper's JSON result faithfully.
4. If `status` is `hold`, surface the HOLD directly and stop.

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

