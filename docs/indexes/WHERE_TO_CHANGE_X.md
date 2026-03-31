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

## Wave 2 Continuity Truth

- Change `docs/specs/WAVE2_CONTINUITY_LAYER.md` for Wave 2 continuity-first sequencing and Block A/B/C/D baseline boundaries.
- Change `docs/specs/CONTINUITY_LEDGER.md` for qualifying continuity entry rules, exclusions, and aging/outcome contracts.
- Change `docs/specs/STANDING_RISK_ENGINE.md` for derived standing-risk progression and continuation-signal derivation rules.
- Change `docs/specs/OMISSION_COVERAGE_ENGINE.md` for bounded omission-evaluation profile-pack rules and deterministic finding-shape contracts.
- Change `docs/specs/OPEN_ITEMS_BOARD.md` for one-board/four-group projection rules, explicit source mapping, and precedence+dedupe behavior.

## Wave 3 Evidence Truth

- Change `docs/specs/FORENSIC_CHAIN.md` for Wave 3 Block A1 append-only evidence-chain contract rules and linkage invariants.

## Wave 4 Control Rod Truth

- Change `docs/specs/CONTROL_ROD_MODE.md` for Wave 4 Block A1 Control Rod v2 contract rules (HARD_STOP LOTO + Permit semantics with unchanged autonomy enum).
- Change `docs/specs/SESSION_BRIEF.md` when Block B1 `controlRodProfile` adoption wording or Block D1 `toolboxTalk` wording requires clarification.

## Wave 4 Change Order Truth

- Change `docs/specs/CHANGE_ORDER_ENGINE.md` for Wave 4 Block B1 Change Order statuses, decision mapping, and deferred continuity-promotion contract rules.

## Wave 4 Buddy Truth

- Change `docs/specs/BUDDY_SYSTEM.md` for Wave 4 Block C1 watcher-only callout contract rules, urgency semantics, and Dead Man's Switch policy placement.

## Wave 3 Verification Truth

- Change `docs/specs/FOREMANS_WALK_ENGINE.md` for Wave 3 Block C1 post-session verification passes, finding model, precedence, and As-Built accountability rules.

## Wave 5 Operator Product Truth

- Change `docs/specs/WAVE5_OPERATOR_PRODUCT.md` for Wave 5 umbrella truth, locked decisions, 5A/5B split, anti-goals, and no-leakage fence.
- Change `docs/WAVE5_BLOCK0_SUBSTRATE_GATE.md` for Block 0 substrate merit rubric and decisions (Operator Trust Ledger, Warranty, Scarcity Signal, SessionBrief no-widening).
- Change `docs/specs/OPERATOR_TRUST_LEDGER.md` for Wave 5A Block A operator trust lifecycle substrate contract shape and invariants.
- Change `docs/specs/JOURNEYMAN_TRUST_ENGINE.md` for Wave 5A Block A deterministic trust decision contract shape and boundaries.
- Change `docs/specs/WARRANTY_MONITOR.md` for Wave 5A Block B derived-only warranty monitoring contract shape and invariants.
- Change `docs/specs/HOLD_ENGINE_SCARCITY_SIGNAL.md` for Wave 5A Block C derived-only scarcity signal contract shape and invariants.

## Wave 4 Closeout Truth

- Change `docs/WAVE4_CLOSEOUT.md` for Wave 4 Block D evidence map, no-leakage confirmation, and final signoff state.

## Wave 3 Closeout Truth

- Change `docs/WAVE3_CLOSEOUT.md` for Wave 3 Block D integration-proof evidence map, closeout verification snapshot, and final signoff state.

## Contract And Migration Truth

- Change `MIGRATIONS.md` when a real shared contract changes.
- Add future schema docs under `docs/schemas/` only when a real shared contract exists.

## Runtime And Tests

- Change `src/` for runtime implementation after a governed execution wave is approved.
- Change `src/ContinuityLedger.js` for Wave 2 Block A continuity persistence behavior.
- Change `src/StandingRiskEngine.js` for Wave 2 Block B1 derived standing-risk behavior.
- Change `src/OmissionCoverageEngine.js` for Wave 2 Block C1 bounded omission-evaluation behavior.
- Change `src/OpenItemsBoard.js` for Wave 2 Block D1 one-board projection behavior.
- Change `src/ForensicChain.js` for Wave 3 Block A1 append-only forensic evidence behavior.
- Change `src/ControlRodMode.js` for Wave 4 Block A1 Control Rod v2 behavior, including deterministic HARD_STOP LOTO + Permit gate evaluation.
- Change `src/SessionBrief.js` for Block B1 `controlRodProfile` normalized snapshot adoption behavior.
- Change `src/ChangeOrderEngine.js` for Wave 4 Block B1 formal drift-governance decision behavior.
- Change `src/BuddySystem.js` for Wave 4 Block C1 live watcher callout behavior and chain-authored event wiring.
- Change `src/ForemansWalk.js` for Wave 3 Block C1 post-session verification findings and As-Built accountability behavior.
- Change `src/OperatorTrustLedger.js` for Wave 5A Block A operator trust lifecycle persistence behavior.
- Change `src/JourneymanTrustEngine.js` for Wave 5A Block A deterministic trust decision and trust-ledger write behavior.
- Change `src/WarrantyMonitor.js` for Wave 5A Block B derived-only warranty monitoring behavior.
- Change `src/HoldEngineScarcitySignal.js` for Wave 5A Block C derived-only scarcity signal behavior.
- Add `tests/golden/ContinuityLedger.golden.test.js` for Continuity Ledger golden verification.
- Add `tests/golden/ForensicChain.golden.test.js` for Forensic Chain golden verification.
- Add `tests/golden/ControlRodMode.golden.test.js` for Control Rod Mode v2 golden verification.
- Change `tests/golden/SessionBrief.golden.test.js` for Block B1 `controlRodProfile` adoption golden verification.
- Add `tests/golden/ChangeOrderEngine.golden.test.js` for Change Order Engine v1 golden verification.
- Add `tests/golden/BuddySystem.golden.test.js` for Buddy System v1 golden verification.
- Add `tests/golden/ForemansWalk.golden.test.js` for Foreman's Walk golden verification.
- Add `tests/golden/StandingRiskEngine.golden.test.js` for Standing Risk Engine golden verification.
- Add `tests/golden/OmissionCoverageEngine.golden.test.js` for Omission & Coverage Engine golden verification.
- Add `tests/golden/OpenItemsBoard.golden.test.js` for Open Items Board golden verification.
- Add `tests/golden/OperatorTrustLedger.golden.test.js` for Wave 5A Block A operator trust lifecycle golden verification.
- Add `tests/golden/JourneymanTrustEngine.golden.test.js` for Wave 5A Block A deterministic trust decision golden verification.
- Add `tests/golden/WarrantyMonitor.golden.test.js` for Wave 5A Block B derived-only warranty monitoring golden verification.
- Add `tests/golden/HoldEngineScarcitySignal.golden.test.js` for Wave 5A Block C derived-only scarcity signal golden verification.
- Add golden references under `tests/golden/`.
- Add `tests/live/wave3.active-governance.live.test.js` for Wave 3 Block D integration proof.
- Add `tests/live/wave4.live-oversight.live.test.js` for Wave 4 Block D integration proof.
- Add live or integration verification under `tests/live/`.

## Reference Inputs

- Use `raw/governed-workflow/` for imported methodology references only.
- Use `raw/starters/` for starter/template inputs only.
- Do not edit reference inputs as a substitute for updating canon.
