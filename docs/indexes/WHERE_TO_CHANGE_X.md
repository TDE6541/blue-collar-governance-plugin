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
- Change `docs/specs/SESSION_LIFECYCLE_SKILLS.md` for Wave 5B Block A Session Lifecycle skill tranche contract boundaries and invariants.
- Change `docs/specs/COMPRESSED_INTELLIGENCE_SKILLS.md` for Wave 5B Block B Compressed Intelligence micro-slice contract boundaries and invariants.
- Change `docs/specs/COMPRESSED_HISTORY_TRUST_SKILLS.md` for Wave 5B Block C Compressed History & Trust micro-slice contract boundaries and invariants.
- Change `docs/specs/COMPRESSED_SAFETY_POSTURE_SKILLS.md` for Wave 5B Block D Compressed Safety posture micro-slice contract boundaries and invariants.
- Change `docs/specs/COMPRESSED_GOVERNANCE_HEALTH_SKILLS.md` for Wave 5B Block E1 Compressed Governance Health micro-slice contract boundaries and invariants.
- Change `docs/specs/CONTROL_ROD_POSTURE_SKILL.md` for the Wave 5B read-only `/control-rods` posture slice contract boundaries and invariants.
- Change `docs/specs/FIRE_BREAK_SKILL.md` for the Wave 5B read-only `/fire-break` audit slice contract boundaries and invariants.
- Change `docs/specs/CENSUS_SKILL.md` for the Wave 5B read-only `/census` repo snapshot slice contract boundaries and invariants.
- Change `docs/specs/DIAGNOSE_SKILL.md` for the Wave 5B read-only `/diagnose` evidence-view slice contract boundaries and invariants.
- Change `docs/specs/KEYSTONE_SKILL.md` for the Wave 5B read-only `/keystone` decision-support slice contract boundaries and invariants.
- Change `docs/specs/ELIMINATE_SKILL.md` for the Wave 5B read-only `/eliminate` hold-options slice contract boundaries and invariants.
- Change `docs/specs/BUDDY_STATUS_SKILL.md` for the Wave 5B read-only `/buddy-status` watcher-state slice contract boundaries and invariants.
- Change `docs/specs/CHANGE_ORDER_SKILL.md` for the Wave 5B read-only `/change-order` status slice contract boundaries and invariants.
- Change `docs/specs/CALLOUT_SKILL.md` for the Wave 5B read-only `/callout` callout-detail slice contract boundaries and invariants.
- Change `docs/specs/RED_TAG_SKILL.md` for the Wave 5B `/red-tag` interlock decision surface contract boundaries and invariants.
- Change `docs/specs/PERMIT_SKILL.md` for the Wave 5B `/permit` gate decision surface contract boundaries and invariants.

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
- Change `src/SessionLifecycleSkills.js` for Wave 5B Block A deterministic Session Lifecycle skill adapter behavior.
- Change `src/CompressedIntelligenceSkills.js` for Wave 5B Block B deterministic Compressed Intelligence skill adapter behavior.
- Change `src/CompressedHistoryTrustSkills.js` for Wave 5B Block C deterministic Compressed History & Trust skill adapter behavior.
- Change `src/CompressedSafetyPostureSkills.js` for Wave 5B Block D deterministic Compressed Safety posture skill adapter behavior.
- Change `src/CompressedGovernanceHealthSkills.js` for Wave 5B Block E1 deterministic Compressed Governance Health skill adapter behavior.
- Change `src/ControlRodPostureSkill.js` for deterministic read/query/render-only `/control-rods` posture rendering behavior.
- Change `src/FireBreakSkill.js` for deterministic read/query/render-only `/fire-break` audit snapshot rendering behavior.
- Change `src/CensusSkill.js` for deterministic read/query/render-only `/census` repo snapshot rendering behavior.
- Change `src/DiagnoseSkill.js` for deterministic read/query/render-only `/diagnose` evidence-view rendering behavior.
- Change `src/KeystoneSkill.js` for deterministic read/query/render-only `/keystone` decision-support rendering behavior.
- Change `src/EliminateSkill.js` for deterministic read/query/render-only `/eliminate` hold-options rendering behavior.
- Change `src/BuddyStatusSkill.js` for deterministic read/query/render-only `/buddy-status` watcher-state rendering behavior.
- Change `src/ChangeOrderSkill.js` for deterministic read/query/render-only `/change-order` status rendering behavior.
- Change `src/CalloutSkill.js` for deterministic read/query/render-only `/callout` callout-detail rendering behavior.
- Change `src/RedTagSkill.js` for deterministic evaluate/render-only `/red-tag` interlock decision behavior over existing SafetyInterlocks truth.
- Change `src/PermitSkill.js` for deterministic evaluate/render-only `/permit` gate decision behavior over existing ControlRodMode HARD_STOP permit-gate truth.
- Change `skills/toolbox-talk-SKILL.md` for Wave 5B Block A `/toolbox-talk` operator-facing skill behavior.
- Change `skills/receipt-SKILL.md` for Wave 5B Block A `/receipt` operator-facing skill behavior.
- Change `skills/as-built-SKILL.md` for Wave 5B Block A `/as-built` operator-facing skill behavior.
- Change `skills/walk-SKILL.md` for Wave 5B Block A `/walk` operator-facing skill behavior.
- Change `skills/phantoms-SKILL.md` for Wave 5B Block B `/phantoms` operator-facing skill behavior.
- Change `skills/ufo-SKILL.md` for Wave 5B Block B `/ufo` operator-facing skill behavior.
- Change `skills/gaps-SKILL.md` for Wave 5B Block B `/gaps` operator-facing skill behavior.
- Change `skills/chain-SKILL.md` for Wave 5B Block C `/chain` operator-facing skill behavior.
- Change `skills/warranty-SKILL.md` for Wave 5B Block C `/warranty` operator-facing skill behavior.
- Change `skills/journeyman-SKILL.md` for Wave 5B Block C `/journeyman` operator-facing skill behavior.
- Change `skills/constraints-SKILL.md` for Wave 5B Block D `/constraints` operator-facing skill behavior.
- Change `skills/silence-map-SKILL.md` for Wave 5B Block D `/silence-map` operator-facing skill behavior.
- Change `skills/prevention-record-SKILL.md` for Wave 5B Block E1 `/prevention-record` operator-facing skill behavior.
- Change `skills/rights-SKILL.md` for Wave 5B Block E1 `/rights` operator-facing skill behavior.
- Change `skills/control-rods-SKILL.md` for the Wave 5B read-only `/control-rods` operator-facing skill behavior.
- Change `skills/fire-break-SKILL.md` for the Wave 5B read-only `/fire-break` operator-facing skill behavior.
- Change `skills/census-SKILL.md` for the Wave 5B read-only `/census` operator-facing skill behavior.
- Change `skills/diagnose-SKILL.md` for the Wave 5B read-only `/diagnose` operator-facing skill behavior.
- Change `skills/keystone-SKILL.md` for the Wave 5B read-only `/keystone` operator-facing skill behavior.
- Change `skills/eliminate-SKILL.md` for the Wave 5B read-only `/eliminate` operator-facing skill behavior.
- Change `skills/buddy-status-SKILL.md` for the Wave 5B read-only `/buddy-status` operator-facing skill behavior.
- Change `skills/change-order-SKILL.md` for the Wave 5B read-only `/change-order` operator-facing skill behavior.
- Change `skills/callout-SKILL.md` for the Wave 5B read-only `/callout` operator-facing skill behavior.
- Change `skills/red-tag-SKILL.md` for the Wave 5B `/red-tag` operator-facing interlock decision surface behavior.
- Change `skills/permit-SKILL.md` for the Wave 5B `/permit` operator-facing gate decision surface behavior.
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
- Add `tests/golden/SessionLifecycleSkills.golden.test.js` for Wave 5B Block A Session Lifecycle skill adapter golden verification.
- Add `tests/golden/CompressedIntelligenceSkills.golden.test.js` for Wave 5B Block B Compressed Intelligence skill adapter golden verification.
- Add `tests/golden/CompressedHistoryTrustSkills.golden.test.js` for Wave 5B Block C Compressed History & Trust skill adapter golden verification.
- Add `tests/golden/CompressedSafetyPostureSkills.golden.test.js` for Wave 5B Block D Compressed Safety posture skill adapter golden verification.
- Add `tests/golden/CompressedGovernanceHealthSkills.golden.test.js` for Wave 5B Block E1 Compressed Governance Health skill adapter golden verification.
- Add `tests/golden/ControlRodPostureSkill.golden.test.js` for read-only `/control-rods` posture skill adapter golden verification.
- Add `tests/golden/FireBreakSkill.golden.test.js` for read-only `/fire-break` audit skill adapter golden verification.
- Add `tests/golden/CensusSkill.golden.test.js` for read-only `/census` repo snapshot skill adapter golden verification.
- Add `tests/golden/DiagnoseSkill.golden.test.js` for read-only `/diagnose` evidence-view skill adapter golden verification.
- Add `tests/golden/KeystoneSkill.golden.test.js` for read-only `/keystone` decision-support skill adapter golden verification.
- Add `tests/golden/EliminateSkill.golden.test.js` for read-only `/eliminate` hold-options skill adapter golden verification.
- Add `tests/golden/BuddyStatusSkill.golden.test.js` for read-only `/buddy-status` watcher-state skill adapter golden verification.
- Add `tests/golden/ChangeOrderSkill.golden.test.js` for read-only `/change-order` status skill adapter golden verification.
- Add `tests/golden/CalloutSkill.golden.test.js` for read-only `/callout` callout-detail skill adapter golden verification.
- Add `tests/golden/RedTagSkill.golden.test.js` for `/red-tag` interlock decision surface skill adapter golden verification.
- Add `tests/golden/PermitSkill.golden.test.js` for `/permit` gate decision surface skill adapter golden verification.
- Add golden references under `tests/golden/`.
- Add `tests/live/wave3.active-governance.live.test.js` for Wave 3 Block D integration proof.
- Add `tests/live/wave4.live-oversight.live.test.js` for Wave 4 Block D integration proof.
- Add live or integration verification under `tests/live/`.

## Reference Inputs

- Use `raw/governed-workflow/` for imported methodology references only.
- Use `raw/starters/` for starter/template inputs only.
- Do not edit reference inputs as a substitute for updating canon.
