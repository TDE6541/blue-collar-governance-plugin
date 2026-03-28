# WAVE1_TRUST_KERNEL.md
**Status:** Active planning baseline  
**Audience:** Architect, implementers, maintainers

## Purpose

This document is the single source of truth for Wave 1 of Blue Collar Governance Plugin. It defines the mission, locked scope, non-goals, naming freeze, claims boundary, build order, and acceptance criteria for the Wave 1 trust kernel.

## Wave 1 Mission

Build the smallest runtime trust kernel that proves the category.

Wave 1 is successful only if a non-technical operator can:

1. define what the AI must never do
2. see what the AI was asked to do
3. see what the AI did that was not requested
4. stop dangerous or out-of-bounds work
5. leave the session with a clean as-built record

## Claims Boundary

- This repository is a private runtime/control layer.
- Governed Workflow is the methodology spine behind the work.
- This document defines planned scope and contract direction, not completed runtime behavior.
- No runtime implementation is claimed yet.
- No hook/runtime compatibility path is claimed yet.
- No package publishing, marketplace compatibility, or public release maturity is claimed yet.

## Naming Freeze

### Public / operator-facing names

| Public name | Internal build name |
|---|---|
| Holds | `HoldEngine` |
| Never-Do Rules | `ConstraintsRegistry` |
| Safety Locks | `SafetyInterlocks` |
| Scope Guard | `ScopeGuard` |
| Start Brief | `SessionBrief` |
| As-Built | `SessionReceipt` |

Internal engineering docs, contracts, and code should use the internal build names unless an operator-facing surface explicitly needs the public label.

## Locked Scope

Wave 1 includes these six systems only:

1. `HoldEngine`
2. `ConstraintsRegistry`
3. `SafetyInterlocks`
4. `ScopeGuard`
5. `SessionBrief`
6. `SessionReceipt`

## System Intent

### `HoldEngine`

Defines the core Hold object, lifecycle, and state-handling expectations. The promoted contract baseline for this system is `docs/specs/HOLD_ENGINE.md`.

### `ConstraintsRegistry`

Defines persistent never-do rules, enforcement classes, and registry precedence expectations. The promoted contract baseline for this system is `docs/specs/CONSTRAINTS_REGISTRY.md`.

### `SafetyInterlocks`

Defines dangerous-action categories, hard stops, explicit authorization gates, and protected-asset behavior. The promoted contract baseline for this system is `docs/specs/SAFETY_INTERLOCKS.md`.

### `ScopeGuard`

Defines the asked-vs-done comparison model and routing for approve, reject, or extend decisions. The promoted contract baseline for this system is `docs/specs/SCOPE_GUARD.md`.

### `SessionBrief`

Defines the session-start surface for scope, hazards, off-limits areas, constraints, and risk mode.

### `SessionReceipt`

Defines the end-of-session as-built record for planned versus actual work, holds, exclusions, and approved drift.

## Explicit Non-Goals

Wave 1 does not include:

- skins
- multi-agent watcher or buddy systems
- omission or expected-signal engines
- standing risk or UXO carry-forward systems
- adaptive autonomy learning
- review intelligence or anomaly engines
- prevention ledgers or ROI surfaces
- rights or warranty surfaces
- thesis-heavy customer framing
- runtime features outside the six Wave 1 systems

## Build Order

Wave 1 should be built in this order:

1. `HoldEngine` - contract baseline established in `docs/specs/HOLD_ENGINE.md`
2. `ConstraintsRegistry` - contract baseline established in `docs/specs/CONSTRAINTS_REGISTRY.md`
3. `SafetyInterlocks` - contract baseline established in `docs/specs/SAFETY_INTERLOCKS.md`
4. `ScopeGuard` - contract baseline established in `docs/specs/SCOPE_GUARD.md`
5. `SessionBrief`
6. `SessionReceipt`
7. integration and sync pass
8. final verification

## Acceptance Criteria

Wave 1 is complete only if:

- the repo remains a cleanly governed private runtime trust-kernel repo
- the six Wave 1 systems exist as real build/spec objects
- naming remains frozen and clean
- no held or non-goal systems leak into active scope
- the sync surfaces reflect the truth of the work
- `README.md` and `CLAUDE.md` match repo reality
- navigation docs match repo reality
- contract changes are logged when required
- no surprise files or off-scope features slip in

## Current Implementation Status

Current promoted state:

- Wave 0 bootstrap is in place and committed.
- `HoldEngine` has a promoted contract baseline in `docs/specs/HOLD_ENGINE.md`.
- `ConstraintsRegistry` has a promoted contract baseline in `docs/specs/CONSTRAINTS_REGISTRY.md`.
- `SafetyInterlocks` has a promoted contract baseline in `docs/specs/SAFETY_INTERLOCKS.md`.
- `ScopeGuard` has a promoted contract baseline in `docs/specs/SCOPE_GUARD.md`.
- `SessionBrief` and `SessionReceipt` contract specs are not documented yet.
- No Wave 1 runtime implementation has started.
