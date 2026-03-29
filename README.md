# Blue Collar Governance Plugin

**Status:** Wave 1 runtime implemented and verified; final Architect signoff pending
**Repo type:** Private runtime/control layer  
**Implementation state:** All six Wave 1 systems now have runtime implementations (`HoldEngine`, `ConstraintsRegistry`, `SafetyInterlocks`, `ScopeGuard`, `SessionBrief`, `SessionReceipt`)

## What This Repo Is

This repository is the private runtime trust layer for Blue Collar Governance Plugin. It is aimed at non-technical AI operators and builders who need explicit boundaries, dangerous-action control, unauthorized-change detection, and a durable session record without having to review source code directly.

Governed Workflow is the methodology spine behind the work. This repository is not the methodology repo. Its job is to hold the runtime trust kernel and the repo truth needed to build that kernel in a governed way.

## Current Truth

- Wave 0 bootstrap is committed.
- All six Wave 1 systems now exist as promoted contract/spec objects under `docs/specs/`.
- Wave 1 runtime now includes all six systems (`HoldEngine`, `ConstraintsRegistry`, `SafetyInterlocks`, `ScopeGuard`, `SessionBrief`, `SessionReceipt`).
- Golden proof exists for each Wave 1 system under `tests/golden/`.
- Live proof exists at `tests/live/wave1.operator-flow.live.test.js`.
- Full Wave 1 verification passed (40 tests passed, 0 failed).
- No Wave 2 behavior is implemented or implied.
- No installable plugin package, runtime hook path, or compatibility layer is implemented yet.
- No skins, marketplace packaging, or public-product polish work is in scope for Wave 1.

## Wave 1 Focus

Wave 1 is limited to six systems:

- `HoldEngine`
- `ConstraintsRegistry`
- `SafetyInterlocks`
- `ScopeGuard`
- `SessionBrief`
- `SessionReceipt`

The authoritative Wave 1 scope, naming freeze, non-goals, build order, and acceptance criteria live in `docs/specs/WAVE1_TRUST_KERNEL.md`.

Promoted Wave 1 contract baselines:

- `docs/specs/HOLD_ENGINE.md`
- `docs/specs/CONSTRAINTS_REGISTRY.md`
- `docs/specs/SAFETY_INTERLOCKS.md`
- `docs/specs/SCOPE_GUARD.md`
- `docs/specs/SESSION_BRIEF.md`
- `docs/specs/SESSION_RECEIPT.md`

## Start Here

Read these in order:

1. `CLAUDE.md`
2. `TEAM_CHARTER.md`
3. `AI_EXECUTION_DOCTRINE.md`
4. `docs/specs/WAVE1_TRUST_KERNEL.md`
5. `docs/INDEX.md`
6. `REPO_INDEX.md`

## Repository Structure

```text
.
├── src/                           # Runtime implementation area (Wave 1 systems implemented)
├── tests/
│   ├── golden/                    # Golden cases for trust-kernel behavior
│   └── live/                      # Live or integration verification
├── docs/
│   ├── specs/                     # Canonical product and runtime specs
│   ├── indexes/                   # Navigation aids for maintenance and edits
│   └── INDEX.md                   # Docs front door
├── raw/
│   ├── governed-workflow/         # Reference inputs only, not canon
│   └── starters/                  # Starter/template source material, not canon
├── scripts/                       # Utility scripts when needed
├── README.md
├── CLAUDE.md
├── REPO_INDEX.md
├── TEAM_CHARTER.md
├── AI_EXECUTION_DOCTRINE.md
├── CONTRIBUTING.md
└── MIGRATIONS.md
```

## Canon Vs Reference

- Canon surfaces are the root governance files and promoted specs under `docs/specs/`.
- `raw/governed-workflow/` contains imported methodology references only.
- `raw/starters/` contains starter/template inputs only.
- Reference material does not become repo truth until it is explicitly promoted into canon.

## Working In This Repo

There is no end-to-end runtime setup sequence yet. Runtime code exists for all six Wave 1 systems, live integration proof exists at `tests/live/wave1.operator-flow.live.test.js`, and closeout evidence is captured in `docs/WAVE1_CLOSEOUT.md`; compatibility surfaces are not implemented.

## Contributing

Use `CONTRIBUTING.md` for contribution rules and `MIGRATIONS.md` for contract-change logging.