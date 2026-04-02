# SKIN_FRAMEWORK.md
**Status:** Wave 5 skins contract baseline (v4: tranches 1-4)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5 skins contract baseline for `SkinFramework`.

The tranche introduces one optional rendering layer over already-shipped canonical route views.

Same engine data, different rendering.

## Boundary

`SkinFramework` defines:

- the supported shipped skin ids
- the supported shipped route matrix
- the Whiteboard default rule for supported routes
- deterministic translation of existing canonical route views into skin display sections
- explicit fail-closed behavior for unsupported skin/route combinations
- structural distinction rules for Whiteboard, Punch List, Inspection Report, Work Order, Dispatch Board, Ticket System, Daily Log, Repair Order, Kitchen Ticket, Farm Ledger, and Safety / LOTO Log

This spec does not define:

- any new engine behavior or new engine write paths
- any change to existing route-output contracts
- any widening of SessionBrief, Warranty, Scarcity Signal, or Control Rod contracts
- any route beyond current shipped canonical route views
- any `/skin` slash route
- any skin editor, customization UI, or generalized template engine
- onboarding, package, install, runtime-hook, compatibility, or marketplace behavior
- Military Brief, Estimate / Bid, or later skin tranches beyond tranche 4

## Public And Internal Names

- Public/operator-facing tranche label: `Skin Framework`
- Internal build name: `SkinFramework`
- Supported skins: `whiteboard`, `punch-list`, `inspection-report`, `work-order`, `dispatch-board`, `ticket-system`, `daily-log`, `repair-order`, `kitchen-ticket`, `farm-ledger`, `safety-loto-log`

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
| `work-order` | `/toolbox-talk`, `/receipt`, `/as-built` |
| `dispatch-board` | `/walk`, `/phantoms`, `/change-order`, `/control-rods` |
| `ticket-system` | `/receipt`, `/walk`, `/phantoms`, `/change-order` |
| `daily-log` | `/toolbox-talk`, `/receipt`, `/as-built`, `/walk` |
| `repair-order` | `/receipt`, `/as-built` |
| `kitchen-ticket` | `/walk`, `/phantoms`, `/change-order` |
| `farm-ledger` | `/toolbox-talk`, `/receipt`, `/as-built`, `/walk`, `/change-order` |
| `safety-loto-log` | `/permit`, `/lockout` |

Tranche 1-4 limits:

- `inspection-report` does not support `/toolbox-talk`.
- `work-order` does not support `/walk`, `/phantoms`, `/change-order`, or `/control-rods`.
- `dispatch-board` does not support `/toolbox-talk`, `/receipt`, or `/as-built`.
- `ticket-system` does not support `/toolbox-talk`, `/as-built`, or `/control-rods`.
- `daily-log` does not support `/phantoms`, `/change-order`, or `/control-rods`.
- `repair-order` does not support `/toolbox-talk`, `/walk`, `/phantoms`, `/change-order`, or `/control-rods`.
- `kitchen-ticket` does not support `/toolbox-talk`, `/receipt`, `/as-built`, or `/control-rods`.
- `farm-ledger` does not support `/phantoms`, `/control-rods`, `/permit`, or `/lockout`.
- `safety-loto-log` does not support `/toolbox-talk`, `/receipt`, `/as-built`, `/walk`, `/phantoms`, `/change-order`, or `/control-rods`.
- Routes outside this matrix remain raw canonical views in shipped skin behavior.

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
- `work-order` is a job-start / scope-of-work document view.
- `dispatch-board` is a grouped operational overview / board-lane view.
- `ticket-system` is a record-detail / lifecycle view.
- `daily-log` is a category-organized project-memory / work / issues / notes view and may render safety or hazard sections only when the canonical route already carries that truth.
- `repair-order` is a diagnostic request / findings / performed-work or unresolved-exception view.
- `kitchen-ticket` is a terse item-first operational ticket stack.
- `farm-ledger` is a chronological ledger / carry-forward record and must collapse to a plain domain or area ledger when field semantics are not honestly present in canonical route truth.
- `safety-loto-log` is an authorization / control record over shipped `/permit` and `/lockout` truth only and must not cosplay a fuller industrial form than the route data supports.
- No two skins may ship as near-duplicates with renamed headings only.
- `inspection-report` must not invent green/yellow/red or other evaluative semantics where the canonical route view does not honestly support them.
- `dispatch-board` must not invent GPS, fleet telemetry, dispatch timing, or crew-ownership fields not present in canonical route truth.
- `ticket-system` must not invent age badges, SLA markers, ETA, assignment state, or duration fields not present in canonical route truth.
- `daily-log` must not invent safety incidents, attendance logs, superintendent review chains, or dual-signoff records where the canonical route view does not honestly support them.
- `repair-order` must not invent RO numbers, labor hours, labor rate, parts cost, parts inventory, technician assignment, invoice state, checkout state, or approval signatures where the canonical route view does not honestly support them.
- `kitchen-ticket` must not invent prep timers, age colors, overdue badges, ETA, station timers, station routing, bump workflow semantics, or derived rush flags where the canonical route view does not honestly support them.
- `farm-ledger` must not invent acreage, crop names, weather, soil conditions, equipment tracking, seed / chemical / fertilizer data, yield, season totals, geospatial field ids, or owner/customer farm metadata where the canonical route view does not honestly support them.
- `safety-loto-log` must not invent lock numbers, tag numbers, equipment ids, checklist steps, permit ids, signatures, release authorizers, work-order ids, or safety incident narrative where the canonical route view does not honestly support them.

## No-Fake-Field Rule

- Skin rendering must use existing canonical route fields only.
- Skin rendering must not invent scores, ranks, badges, leaderboards, or other gamification fields.
- Skin rendering must not invent workflow state, severity, approval state, or evaluation state not present in canonical route truth.
- Skin rendering must not invent labor totals, pricing, GPS / fleet telemetry, ETA, age badges, SLA markers, duration, or assignment metadata not present in canonical route truth.
- Skin rendering must not invent repair-cost, labor-hour, parts, timer, kitchen-station, incident, or approval-signature metadata not present in canonical route truth.
- Skin rendering must not invent acreage, crop, weather, soil, equipment-tracking, yield, geospatial, lock-id, tag-id, signature, release-authority, or checklist metadata not present in canonical route truth.
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
| `supported` | boolean | Yes | Whether the requested skin supports the route in the shipped support matrix. |
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
- This contract is the sole tranche 1-4 skin behavior owner.
