# SKIN_FRAMEWORK.md
**Status:** Wave 5 skins tranche 1 contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5 skins tranche 1 contract baseline for `SkinFramework`.

The tranche introduces one optional rendering layer over already-shipped canonical route views.

Same engine data, different rendering.

## Boundary

`SkinFramework` defines:

- the supported tranche 1 skin ids
- the supported tranche 1 route matrix
- the Whiteboard default rule for supported routes
- deterministic translation of existing canonical route views into skin display sections
- explicit fail-closed behavior for unsupported skin/route combinations
- structural distinction rules for Whiteboard, Punch List, and Inspection Report

This spec does not define:

- any new engine behavior or new engine write paths
- any change to existing route-output contracts
- any widening of SessionBrief, Warranty, Scarcity Signal, or Control Rod contracts
- any route beyond current shipped canonical route views
- any `/skin` slash route
- any skin editor, customization UI, or generalized template engine
- onboarding, package, install, runtime-hook, compatibility, or marketplace behavior
- Military Brief, Estimate / Bid, or later skin tranches

## Public And Internal Names

- Public/operator-facing tranche label: `Skin Framework`
- Internal build name: `SkinFramework`
- Tranche 1 supported skins: `whiteboard`, `punch-list`, `inspection-report`

## Core Rule

- Skin rendering is optional.
- Existing canonical route views remain the underlying truth.
- Skin rendering may change labels, section headings, and layout only.
- Skin rendering must not add hidden computation or fake fields.

## Supported Route Matrix

| Skin | Supported Routes |
|---|---|
| `whiteboard` | `/toolbox-talk`, `/receipt`, `/as-built`, `/walk` |
| `punch-list` | `/toolbox-talk`, `/receipt`, `/as-built`, `/walk` |
| `inspection-report` | `/receipt`, `/as-built`, `/walk` |

Tranche 1 limits:

- `inspection-report` does not support `/toolbox-talk`.
- Routes outside this matrix remain raw canonical views in tranche 1.

## Default Rule

- `whiteboard` is the default skin only for supported routes.
- If no skin id is supplied and the route is unsupported by `whiteboard`, the framework must fail closed to raw canonical render.

## Fail-Closed Rule

- Unsupported skin/route combinations must not be coerced into Whiteboard.
- Unsupported skin/route combinations must not emit partial translation.
- Unsupported skin/route combinations must return the raw canonical route view unchanged underneath.
- Unsupported status must be explicit in framework output and tests.

## Structural Distinction Rules

- `whiteboard` is the minimum-information universal board.
- `punch-list` is a closeout/status list with sign-off framing.
- `inspection-report` is an observation/evaluation/corrections view.
- No two skins may ship as near-duplicates with renamed headings only.
- `inspection-report` must not invent green/yellow/red or other evaluative semantics where the canonical route view does not honestly support them.

## No-Fake-Field Rule

- Skin rendering must use existing canonical route fields only.
- Skin rendering must not invent scores, ranks, badges, leaderboards, or other gamification fields.
- Skin rendering must not invent workflow state, severity, approval state, or evaluation state not present in canonical route truth.
- Skin rendering must not widen raw route objects with skin-only fields.

## Runtime Contract

Input:

- `rawView`: object with canonical route-view shape from an already-shipped route adapter
- `skinId`: optional string; when omitted, default behavior applies

Output object:

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal canonical route from `rawView.route`. |
| `requestedSkinId` | string | Yes | Requested skin id or defaulted `whiteboard`. |
| `appliedSkinId` | string\|null | Yes | Applied skin id when supported; otherwise `null`. |
| `supported` | boolean | Yes | Whether the requested skin supports the route in tranche 1. |
| `fallbackMode` | string | Yes | `none` or `raw_canonical_view`. |
| `rawView` | object | Yes | Canonical route view preserved unchanged underneath. |
| `presentation` | object\|null | Yes | Skin presentation payload when supported; otherwise `null`. |
| `renderNote` | string | Yes | Deterministic render note. |

`presentation` object shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `skinId` | string | Yes | Applied skin id. |
| `skinLabel` | string | Yes | Human-readable skin label. |
| `title` | string | Yes | Skin title for the rendered route. |
| `sections` | object[] | Yes | Ordered deterministic display sections. |

`sections` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `sectionId` | string | Yes | Stable section id. |
| `heading` | string | Yes | Skin-specific section heading. |
| `lines` | string[] | Yes | Deterministic display lines derived from existing canonical route fields only. |

## Contract Invariants

- output is deterministic for the same inputs
- input objects remain unchanged after rendering
- raw canonical route views remain unchanged underneath
- unsupported combinations fail closed to raw canonical render
- existing route-output contracts remain unchanged
- no hidden write path is introduced

## Current Implementation Truth

- Runtime framework implementation exists at `src/SkinFramework.js`.
- Golden proof exists at `tests/golden/SkinFramework.golden.test.js`.
- This contract is the sole tranche 1 skin behavior owner.
