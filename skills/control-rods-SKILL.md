---
name: control-rods
description: "Render Control Rod posture/status visibility using read/query/render-only behavior."
---

# /control-rods

## Purpose

Render read-only Control Rod posture/status visibility from existing ControlRodMode truth.

## Input Source

- Use existing ControlRodMode read posture/status surfaces only.
- Use starter-profile id visibility from existing read paths.
- Use current profile posture visibility from existing profile normalization output.

## Render Path

1. Gather current `controlRodProfile` input.
2. Pass input to `ControlRodPostureSkill.renderControlRods`.
3. Return deterministic route output.

## Output Contract

Route output includes:

- `route`
- `starterProfileIds`
- `profile`
- `summary`
- `domains`

## Must Not

- edit profile posture
- change profile posture
- run permit or LOTO gate decisions
- add any route beyond `/control-rods`
