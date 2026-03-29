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

- Status: private runtime trust layer with Wave 1 implemented and Wave 2 Block A + Block B1 + Block C1 baselines implemented
- Git: initialized on `main`, Wave 0 bootstrap committed, no remote configured
- Runtime implementation: Wave 1 systems implemented (`HoldEngine`, `ConstraintsRegistry`, `SafetyInterlocks`, `ScopeGuard`, `SessionBrief`, `SessionReceipt`)
- HoldEngine contract spec: `docs/specs/HOLD_ENGINE.md`
- ConstraintsRegistry contract spec: `docs/specs/CONSTRAINTS_REGISTRY.md`
- SafetyInterlocks contract spec: `docs/specs/SAFETY_INTERLOCKS.md`
- ScopeGuard contract spec: `docs/specs/SCOPE_GUARD.md`
- SessionBrief contract spec: `docs/specs/SESSION_BRIEF.md`
- SessionReceipt contract spec: `docs/specs/SESSION_RECEIPT.md`
- Wave 1 runtime implementation: system runtime present for all six Wave 1 systems; integration/proof artifacts implemented (`tests/live/wave1.operator-flow.live.test.js`, `docs/WAVE1_CLOSEOUT.md`)
- Wave 2 Block A continuity baseline: implemented (`docs/specs/WAVE2_CONTINUITY_LAYER.md`, `docs/specs/CONTINUITY_LEDGER.md`, `src/ContinuityLedger.js`, `tests/golden/ContinuityLedger.golden.test.js`)
- Wave 2 Block B1 standing-risk baseline: implemented as derived logic (`docs/specs/STANDING_RISK_ENGINE.md`, `src/StandingRiskEngine.js`, `tests/golden/StandingRiskEngine.golden.test.js`)
- Standing Risk derivation uses explicit `continuationSignals`; no second standing-risk persistence substrate is implemented.
- Wave 2 Block C1 omission baseline: implemented as bounded evaluation logic (`docs/specs/OMISSION_COVERAGE_ENGINE.md`, `src/OmissionCoverageEngine.js`, `tests/golden/OmissionCoverageEngine.golden.test.js`)
- Block C1 requires explicit `profilePack` selection and is bounded to exactly three first-proof packs: `pricing_quote_change`, `form_customer_data_flow`, and `protected_destructive_operation`.
- Block C1 findings use fixed deterministic `missingItemCode` vocabulary and remain evaluation-scoped only.
- Block C1 does not persist omission findings and does not implement continuity-promotion workflow runtime yet.
- Block D runtime behavior is not implemented yet.
- No board/grouping logic and no score/confidence/ranking/anomaly/prediction logic are implemented in Block C1.
- Hook/runtime compatibility paths: not implemented yet
- Package metadata or publishing surfaces: not implemented yet
- Canon specs for current scope:
  - `docs/specs/WAVE1_TRUST_KERNEL.md`
  - `docs/specs/HOLD_ENGINE.md`
  - `docs/specs/CONSTRAINTS_REGISTRY.md`
  - `docs/specs/SAFETY_INTERLOCKS.md`
  - `docs/specs/SCOPE_GUARD.md`
  - `docs/specs/SESSION_BRIEF.md`
  - `docs/specs/SESSION_RECEIPT.md`
  - `docs/specs/WAVE2_CONTINUITY_LAYER.md`
  - `docs/specs/CONTINUITY_LEDGER.md`
  - `docs/specs/STANDING_RISK_ENGINE.md`
  - `docs/specs/OMISSION_COVERAGE_ENGINE.md`

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
