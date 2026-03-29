# WHERE_TO_CHANGE_X.md

## Purpose

Use this index to find the right canon surface before making a change.

## Front Door And Repo Identity

- Change `README.md` for repo identity, status, and public-facing truth.
- Change `CLAUDE.md` for AI operating posture, sync blockers, and closeout expectations.
- Change `REPO_INDEX.md` for top-level repo navigation.

## Governance And Session Rules

- Change `TEAM_CHARTER.md` for governing doctrine and roles.
- Change `AI_EXECUTION_DOCTRINE.md` for execution procedure and HOLD handling.
- Change `CONTRIBUTING.md` for contributor workflow rules.

## Wave 1 Product Truth

- Change `docs/specs/WAVE1_TRUST_KERNEL.md` for Wave 1 mission, scope, non-goals, naming freeze, build order, and acceptance criteria.
- Change `docs/specs/HOLD_ENGINE.md` for the Hold object contract, status lifecycle, and lifecycle invariants.
- Change `docs/specs/CONSTRAINTS_REGISTRY.md` for persistent never-do rules, enforcement classes, and registry precedence.
- Change `docs/specs/SAFETY_INTERLOCKS.md` for dangerous-action categories, hard stops, and authorization gates.
- Change `docs/specs/SCOPE_GUARD.md` for asked-vs-done comparison and approve/reject/extend routing.
- Change `docs/specs/SESSION_BRIEF.md` for startup scope, hazards, off-limits areas, constraints, and risk mode.
- Change `docs/specs/SESSION_RECEIPT.md` for planned-vs-actual closeout truth, holds, exclusions, and approved drift.
- Change `docs/WAVE1_CLOSEOUT.md` for durable Wave 1 system-by-system evidence and final closeout signoff state.

## Contract And Migration Truth

- Change `MIGRATIONS.md` when a real shared contract changes.
- Add future schema docs under `docs/schemas/` only when a real shared contract exists.

## Runtime And Tests

- Change `src/` for runtime implementation after a governed execution wave is approved.
- Add golden references under `tests/golden/`.
- Add live or integration verification under `tests/live/`.

## Reference Inputs

- Use `raw/governed-workflow/` for imported methodology references only.
- Use `raw/starters/` for starter/template inputs only.
- Do not edit reference inputs as a substitute for updating canon.
