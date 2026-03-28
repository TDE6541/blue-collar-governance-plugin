# CLAUDE.md

## Repo Identity

This repository is the Blue Collar Governance Plugin runtime trust layer. It is a private control surface for non-technical AI operators and builders. Governed Workflow is the methodology spine behind the work, but this repository is not the governed-workflow repo.

## Session Posture

- Treat every substantive change as governed work.
- Plan before execution unless the Architect explicitly narrows the task to a trivial correction.
- Keep Wave 1 constrained to the trust-kernel mission and the six locked systems.
- Prefer plain language, minimal diffs, and evidence-backed statements.
- If repo truth and conversation diverge, repo truth wins until the canon surfaces are updated.

## Non-Negotiables

- HOLD > GUESS
- Evidence-first
- No silent mangling
- Contract discipline
- Minimal diffs
- No destructive git
- No public/private confusion
- No theory bleed into the runtime spec
- No adjacent improvements while here

## Current Repo Truth

- Status: early private bootstrap
- Git: initialized on `main`, Wave 0 bootstrap committed, no remote configured
- Runtime implementation: not started
- HoldEngine contract spec: `docs/specs/HOLD_ENGINE.md`
- ConstraintsRegistry contract spec: `docs/specs/CONSTRAINTS_REGISTRY.md`
- SafetyInterlocks contract spec: `docs/specs/SAFETY_INTERLOCKS.md`
- ScopeGuard contract spec: `docs/specs/SCOPE_GUARD.md`
- Remaining Wave 1 system contracts: `SessionBrief` and `SessionReceipt`
- Wave 1 runtime implementation: not started
- Hook/runtime compatibility paths: not implemented yet
- Package metadata or publishing surfaces: not implemented yet
- Canon specs for current scope:
  - `docs/specs/WAVE1_TRUST_KERNEL.md`
  - `docs/specs/HOLD_ENGINE.md`
  - `docs/specs/CONSTRAINTS_REGISTRY.md`
  - `docs/specs/SAFETY_INTERLOCKS.md`
  - `docs/specs/SCOPE_GUARD.md`

## Canon And Reference Boundary

- Canon surfaces are the root governance files and promoted docs under `docs/specs/`.
- `raw/governed-workflow/` contains governed-workflow source docs and skills as reference inputs only.
- `raw/starters/` contains starter/template source material only.
- Reference inputs do not override canon and do not create runtime claims by themselves.

## Required Sync Surfaces

Inspect and update these when behavior, workflow, setup truth, contracts, or repo navigation change:

- `README.md`
- `CLAUDE.md`
- `REPO_INDEX.md`
- `docs/INDEX.md`
- `docs/indexes/WHERE_TO_CHANGE_X.md`
- `TEAM_CHARTER.md`
- `AI_EXECUTION_DOCTRINE.md`
- `CONTRIBUTING.md`
- `MIGRATIONS.md`

A stale `README.md` or `CLAUDE.md` is a ship blocker.

## Closeout Requirements

Every governed execution closeout should state:

- Changes made
- Acceptance criteria status
- Remaining HOLDs
- Next actions
- Signoff status

Also confirm sync status for:

- `README.md`
- `CLAUDE.md`
- `REPO_INDEX.md`
- `docs/INDEX.md`
- `docs/indexes/WHERE_TO_CHANGE_X.md`
- `MIGRATIONS.md` when touched

## Practical Reminders

- Do not claim runtime behavior that does not exist.
- Do not treat reference material as implementation authority.
- Do not start runtime implementation for `HoldEngine`, `ConstraintsRegistry`, `SafetyInterlocks`, `ScopeGuard`, `SessionBrief`, or `SessionReceipt` without an approved governed plan.
