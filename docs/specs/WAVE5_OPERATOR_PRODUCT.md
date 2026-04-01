# WAVE5_OPERATOR_PRODUCT.md
**Status:** Wave 5A Block 0 shipped; Wave 5A Blocks A-C and Wave 5B Blocks A-D-E1 plus `/control-rods` through `/lockout` are implemented; additional Wave 5 work outside the current shipped set remains pending; package/install/runtime-hook/compatibility claims remain unverified
**Audience:** Architect, implementers, maintainers

## Purpose

This document is the Wave 5 umbrella truth surface.

Wave 5 is one narrative wave executed in two delivery phases:

- Wave 5A
- Wave 5B

Wave 5A starts with Block 0 as a docs-only truth-sync and substrate-gate step, then implements the first runtime baseline in Block A.

## What Wave 5 Proves

Wave 5 proves that trust-state evolution can be governed with:

- explicit substrate decisions made on engineering merit
- no hidden engine behavior under skill labels
- strict docs/runtime claim discipline
- implementation-facing no-leakage enforcement

## Why Wave 5 Is Different From Waves 1-4

Waves 1-4 shipped runtime baselines and closeout proof.

Wave 5 starts with a governance-first gate:

- lock umbrella truth first
- pressure-test substrate decisions first
- execute naming/no-leakage scrub first
- keep runtime untouched in Block 0

## Locked Decisions

- Wave 5 remains one narrative wave executed as 5A / 5B.
- Wave 5A Block 0 is docs-only and ships truth-sync, substrate-gate, and naming scrub only.
- Wave 5 runtime behavior is not shipped in Block 0.
- Operator Trust Ledger passes the Block 0 merit gate and is approved as the Wave 5A substrate direction candidate.
- Block A implements Operator Trust Ledger v1 and Journeyman Trust Engine v1 with SessionBrief no-widening preserved.
- Block B implements Warranty Monitor v1 as derived-only monitoring with no new persisted substrate.
- Warranty remains derived-first by default and is not a standalone substrate in Block 0.
- HoldEngine Scarcity Signal is approved as additive enrichment direction and is implemented in Block C as derived-only enrichment (no substrate widening).
- Wave 5B Block A implements Session Lifecycle skills (`/toolbox-talk`, `/receipt`, `/as-built`, `/walk`) as read/query/render-only surfaces with no shared-contract widening.
- Wave 5B Block B implements Compressed Intelligence skills (`/phantoms`, `/ufo`, `/gaps`) as read/query/render-only surfaces with no shared-contract widening.
- Wave 5B Block C implements Compressed History & Trust skills (`/chain`, `/warranty`, `/journeyman`) as read/query/render-only surfaces with no shared-contract widening.
- Wave 5B Block D implements Compressed Safety posture skills (`/constraints`, `/silence-map`) as read/query/render-only surfaces with no shared-contract widening and no standalone `/control-rods` skill.
- Wave 5B Block E1 implements Compressed Governance Health skills (`/prevention-record`, `/rights`) as read/query/render-only surfaces with no shared-contract widening.
- A Wave 5B post-E1 slice implements `/control-rods` as a read/query/render-only posture/status surface with no shared-contract widening and no edit semantics.
- A Wave 5B post-control-rods slice implements `/fire-break` as a manual read/query/render-only governance snapshot over existing Open Items Board truth with no shared-contract widening and no control semantics.
- A Wave 5B post-fire-break slice implements `/census` as a manual read/query/render-only repo snapshot surface over explicit local repo truth with no shared-contract widening and no analytics behavior.
- A Wave 5B post-census slice implements `/diagnose` as a read/query/render-only evidence-linked diagnostic view over existing Walk + Chain truth with no shared-contract widening and no heuristic synthesis behavior.
- A Wave 5B post-diagnose slice implements `/keystone` as a read/query/render-only keystone-finding view over existing Walk findings and existing severity labels with no shared-contract widening, no dependency analysis, and no ranking/weighting/scoring behavior.
- A Wave 5B post-keystone slice implements `/eliminate` as a read/query/render-only hold-options view over existing hold snapshots and existing derived scarcity assessments with direct `holdId` join only, explicit null scarcity when unmatched, and no recommendation/ranking/pruning/scoring behavior.
- A Wave 5B post-eliminate slice implements `/buddy-status` as a read/query/render-only watcher-state view over existing Buddy policy and callout snapshots with no shared-contract widening, no control semantics, and no mutation behavior.
- A Wave 5B post-buddy-status slice implements `/change-order` as a read/query/render-only status view over existing change-order snapshots and deterministic statuses with no shared-contract widening, no action semantics, and no mutation behavior.
- A Wave 5B post-change-order slice implements `/callout` as a read/query/render-only callout-detail view over existing Buddy callout snapshots with no shared-contract widening, no control semantics, and no mutation behavior.
- A Wave 5B post-callout slice implements `/red-tag` as a thin evaluate/render interlock decision surface over existing SafetyInterlocks truth with no shared-contract widening, no persistence substrate, and no tag lifecycle mutation semantics.
- A Wave 5B post-red-tag slice implements `/permit` as a thin evaluate/render gate decision surface over existing ControlRodMode HARD_STOP permit-gate truth with no shared-contract widening, no queue/workflow substrate, and no permit lifecycle mutation semantics.
- A Wave 5B post-permit slice implements `/lockout` as a thin evaluate/render LOTO authorization validation surface over existing ControlRodMode validation truth with no shared-contract widening, no queue/inbox/ledger/workflow substrate, and no permit-coupling semantics.
- `/prevention-record` is explicit-signal-only and does not emit speculative value claims.
- `/rights` is a static manual declaration route and is not derived from trust-state engines.
- SessionBrief no-widening is hard-locked for Wave 5 (`journeymanLevel` is not added).
- Journeyman trust reads state at query/render time.
- Skill topology now includes exactly 37 skills across 10 groups.
- Skills are deterministic route adapters only; no hidden engine behavior is allowed inside skills.
- Package/install/runtime hook/compatibility claims must remain explicit and honest until verified by real shipped surfaces.

## Current Truth Baseline

- Wave 4 runtime remains the shipped implementation baseline.
- Wave 5 Block 0 truth surfaces now exist at:
  - `docs/specs/WAVE5_OPERATOR_PRODUCT.md`
  - `docs/WAVE5_BLOCK0_SUBSTRATE_GATE.md`
- Wave 5A Block A runtime baselines are now implemented at:
  - `docs/specs/OPERATOR_TRUST_LEDGER.md`
  - `docs/specs/JOURNEYMAN_TRUST_ENGINE.md`
  - `src/OperatorTrustLedger.js`
  - `src/JourneymanTrustEngine.js`
  - `tests/golden/OperatorTrustLedger.golden.test.js`
  - `tests/golden/JourneymanTrustEngine.golden.test.js`
- Wave 5A Block B derived-only warranty baseline is now implemented at:
  - `docs/specs/WARRANTY_MONITOR.md`
  - `src/WarrantyMonitor.js`
  - `tests/golden/WarrantyMonitor.golden.test.js`
- Wave 5A Block C derived-only scarcity baseline is now implemented at:
  - `docs/specs/HOLD_ENGINE_SCARCITY_SIGNAL.md`
  - `src/HoldEngineScarcitySignal.js`
  - `tests/golden/HoldEngineScarcitySignal.golden.test.js`
- Wave 5B Block A Session Lifecycle skill tranche is now implemented at:
  - `docs/specs/SESSION_LIFECYCLE_SKILLS.md`
  - `skills/toolbox-talk-SKILL.md`
  - `skills/receipt-SKILL.md`
  - `skills/as-built-SKILL.md`
  - `skills/walk-SKILL.md`
  - `src/SessionLifecycleSkills.js`
  - `tests/golden/SessionLifecycleSkills.golden.test.js`
- Wave 5B Block B Compressed Intelligence skill micro-slice is now implemented at:
  - `docs/specs/COMPRESSED_INTELLIGENCE_SKILLS.md`
  - `skills/phantoms-SKILL.md`
  - `skills/ufo-SKILL.md`
  - `skills/gaps-SKILL.md`
  - `src/CompressedIntelligenceSkills.js`
  - `tests/golden/CompressedIntelligenceSkills.golden.test.js`
- Wave 5B Block C Compressed History & Trust skill micro-slice is now implemented at:
  - `docs/specs/COMPRESSED_HISTORY_TRUST_SKILLS.md`
  - `skills/chain-SKILL.md`
  - `skills/warranty-SKILL.md`
  - `skills/journeyman-SKILL.md`
  - `src/CompressedHistoryTrustSkills.js`
  - `tests/golden/CompressedHistoryTrustSkills.golden.test.js`
- Wave 5B Block D Compressed Safety posture skill micro-slice is now implemented at:
  - `docs/specs/COMPRESSED_SAFETY_POSTURE_SKILLS.md`
  - `skills/constraints-SKILL.md`
  - `skills/silence-map-SKILL.md`
  - `src/CompressedSafetyPostureSkills.js`
  - `tests/golden/CompressedSafetyPostureSkills.golden.test.js`
- Wave 5B Block E1 Compressed Governance Health skill micro-slice is now implemented at:
  - `docs/specs/COMPRESSED_GOVERNANCE_HEALTH_SKILLS.md`
  - `skills/prevention-record-SKILL.md`
  - `skills/rights-SKILL.md`
  - `src/CompressedGovernanceHealthSkills.js`
  - `tests/golden/CompressedGovernanceHealthSkills.golden.test.js`
- A Wave 5B read-only `/control-rods` posture slice is now implemented at:
  - `docs/specs/CONTROL_ROD_POSTURE_SKILL.md`
  - `skills/control-rods-SKILL.md`
  - `src/ControlRodPostureSkill.js`
  - `tests/golden/ControlRodPostureSkill.golden.test.js`
- A Wave 5B read-only `/fire-break` audit slice is now implemented at:
  - `docs/specs/FIRE_BREAK_SKILL.md`
  - `skills/fire-break-SKILL.md`
  - `src/FireBreakSkill.js`
  - `tests/golden/FireBreakSkill.golden.test.js`
- A Wave 5B read-only `/census` repo snapshot slice is now implemented at:
  - `docs/specs/CENSUS_SKILL.md`
  - `skills/census-SKILL.md`
  - `src/CensusSkill.js`
  - `tests/golden/CensusSkill.golden.test.js`
- A Wave 5B read-only `/diagnose` evidence-view slice is now implemented at:
  - `docs/specs/DIAGNOSE_SKILL.md`
  - `skills/diagnose-SKILL.md`
  - `src/DiagnoseSkill.js`
  - `tests/golden/DiagnoseSkill.golden.test.js`
- A Wave 5B read-only `/keystone` decision-support slice is now implemented at:
  - `docs/specs/KEYSTONE_SKILL.md`
  - `skills/keystone-SKILL.md`
  - `src/KeystoneSkill.js`
  - `tests/golden/KeystoneSkill.golden.test.js`
- A Wave 5B read-only `/eliminate` hold-options slice is now implemented at:
  - `docs/specs/ELIMINATE_SKILL.md`
  - `skills/eliminate-SKILL.md`
  - `src/EliminateSkill.js`
  - `tests/golden/EliminateSkill.golden.test.js`
- A Wave 5B read-only `/buddy-status` watcher-state slice is now implemented at:
  - `docs/specs/BUDDY_STATUS_SKILL.md`
  - `skills/buddy-status-SKILL.md`
  - `src/BuddyStatusSkill.js`
  - `tests/golden/BuddyStatusSkill.golden.test.js`
- A Wave 5B read-only `/change-order` status slice is now implemented at:
  - `docs/specs/CHANGE_ORDER_SKILL.md`
  - `skills/change-order-SKILL.md`
  - `src/ChangeOrderSkill.js`
  - `tests/golden/ChangeOrderSkill.golden.test.js`
- A Wave 5B read-only `/callout` callout-detail slice is now implemented at:
  - `docs/specs/CALLOUT_SKILL.md`
  - `skills/callout-SKILL.md`
  - `src/CalloutSkill.js`
  - `tests/golden/CalloutSkill.golden.test.js`
- A Wave 5B `/red-tag` interlock decision surface is now implemented at:
  - `docs/specs/RED_TAG_SKILL.md`
  - `skills/red-tag-SKILL.md`
  - `src/RedTagSkill.js`
  - `tests/golden/RedTagSkill.golden.test.js`
- A Wave 5B `/permit` gate decision surface is now implemented at:
  - `docs/specs/PERMIT_SKILL.md`
  - `skills/permit-SKILL.md`
  - `src/PermitSkill.js`
  - `tests/golden/PermitSkill.golden.test.js`
- A Wave 5B `/lockout` LOTO validation surface is now implemented at:
  - `docs/specs/LOCKOUT_SKILL.md`
  - `skills/lockout-SKILL.md`
  - `src/LockoutSkill.js`
  - `tests/golden/LockoutSkill.golden.test.js`
- Later / not yet shipped: additional Wave 5 work outside the current shipped set, including skins, onboarding/package work, and later proof/integration work, remains pending.
- Skills outside the current shipped set remain unimplemented.
- Not claimed / not verified: no installable plugin package, runtime hook path, or compatibility layer is implemented yet.

## Substrate Merit Rule

A candidate substrate survives only when all checks pass:

1. Distinct lifecycle: it governs state that existing substrates cannot represent without distortion.
2. Honest derivation test: derived-only representation is shown to be brittle or dishonest.
3. Operator legibility: the contract can be queried/rendered without hidden behavior.
4. Contract discipline: shape boundaries and migration impact can be stated explicitly.
5. Integration value: added complexity is justified by measurable trust-surface clarity.

Doctrine inheritance alone is not sufficient evidence.

## Wave 5A / 5B Split

Wave 5A:

- Block 0 truth sync, substrate gate, naming scrub, no-leakage fence refresh
- Block A runtime/spec/test baseline for Operator Trust Ledger v1 and Journeyman Trust Engine v1
- Block B runtime/spec/test baseline for Warranty Monitor v1 (derived-only)
- Block C runtime/spec/test baseline for HoldEngine Scarcity Signal v1 (derived-only)
- later 5A blocks only by explicit approval

Wave 5B:

- Block A runtime/spec/test baseline for Session Lifecycle skills (`/toolbox-talk`, `/receipt`, `/as-built`, `/walk`) as read/query/render-only surfaces
- Block B runtime/spec/test baseline for Compressed Intelligence skills (`/phantoms`, `/ufo`, `/gaps`) as read/query/render-only surfaces
- Block C runtime/spec/test baseline for Compressed History & Trust skills (`/chain`, `/warranty`, `/journeyman`) as read/query/render-only surfaces
- Block D runtime/spec/test baseline for Compressed Safety posture skills (`/constraints`, `/silence-map`) as read/query/render-only surfaces
- post-control-rods runtime/spec/test baseline for read-only `/fire-break` audit skill surface
- post-fire-break runtime/spec/test baseline for read-only `/census` repo snapshot skill surface
- post-census runtime/spec/test baseline for read-only `/diagnose` evidence-view skill surface
- post-diagnose runtime/spec/test baseline for read-only `/keystone` decision-support skill surface
- post-keystone runtime/spec/test baseline for read-only `/eliminate` hold-options skill surface
- post-eliminate runtime/spec/test baseline for read-only `/buddy-status` watcher-state skill surface
- post-buddy-status runtime/spec/test baseline for read-only `/change-order` status skill surface
- post-change-order runtime/spec/test baseline for read-only `/callout` callout-detail skill surface
- post-callout runtime/spec/test baseline for `/red-tag` interlock decision surface
- post-red-tag runtime/spec/test baseline for `/permit` gate decision surface
- post-permit runtime/spec/test baseline for `/lockout` LOTO validation surface
- downstream implementation and integration work that depends on Wave 5A contract decisions

## Block 0 Scope

Block 0 includes:

- Wave 5 umbrella truth lock
- substrate decision memo
- front-door/index sync
- implementation-facing naming scrub and leakage fence refresh

Block 0 excludes:

- runtime engine implementation
- test implementation changes
- package/publish/runtime hook claims beyond what is already real

## Wave 5 Anti-Goals

Wave 5 Block 0 does not ship:

- runtime JS behavior changes
- test behavior changes
- SessionBrief widening
- hidden engine logic labeled as "skills"
- fake install, package, publish, or marketplace readiness claims

## No-Leakage Fence

Implementation-facing and canonical surfaces must not carry personal-name or external-network/product references.

Use role/product-neutral wording (for example `Architect`, `operator`, `builder`, `team`, `field crew`).

## Proof Spine Summary

Wave 5 Block 0 truth and decision proof is anchored in:

- `README.md`
- `CLAUDE.md`
- `REPO_INDEX.md`
- `docs/INDEX.md`
- `docs/indexes/WHERE_TO_CHANGE_X.md`
- `TEAM_CHARTER.md`
- `docs/WAVE5_BLOCK0_SUBSTRATE_GATE.md`
