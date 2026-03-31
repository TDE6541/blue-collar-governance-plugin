---
name: rights
description: "Render a static manual Bill of Rights declaration using read/query/render-only behavior."
---

# /rights

## Purpose

Render a static manual Bill of Rights declaration.

## Input Source

- Use the static manual declaration bundled in the approved governance-health tranche surface.
- Do not derive declaration content from trust-state engines.

## Render Path

1. Use `CompressedGovernanceHealthSkills.renderRights`.
2. Return deterministic route output.

## Output Contract

Route output includes:

- `route`
- `viewMode`
- `rights`

## Must Not

- derive declaration text from runtime trust-state data
- mutate any runtime state
- include any route beyond `/prevention-record` and `/rights`
