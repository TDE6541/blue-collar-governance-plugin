# Docs Index

## Purpose

This directory holds canonical documentation and navigation aids for the Blue Collar Governance Plugin repo.

## Canonical Docs

- `docs/specs/WAVE1_TRUST_KERNEL.md` - authoritative Wave 1 mission, scope, naming freeze, non-goals, build order, and acceptance criteria
- `docs/specs/HOLD_ENGINE.md` - authoritative HoldEngine contract baseline for the Hold object and lifecycle
- `docs/specs/CONSTRAINTS_REGISTRY.md` - authoritative ConstraintsRegistry contract baseline for persistent never-do rules
- `docs/specs/SAFETY_INTERLOCKS.md` - authoritative SafetyInterlocks contract baseline for dangerous-action control
- `docs/specs/SCOPE_GUARD.md` - authoritative ScopeGuard contract baseline for asked-vs-done comparison
- `docs/specs/SESSION_BRIEF.md` - authoritative SessionBrief contract baseline for the startup session surface
- `docs/specs/SESSION_RECEIPT.md` - authoritative SessionReceipt contract baseline for the as-built session record
- `docs/specs/WAVE2_CONTINUITY_LAYER.md` - authoritative Wave 2 continuity-first umbrella baseline for Block A
- `docs/specs/CONTINUITY_LEDGER.md` - authoritative Continuity Ledger v0 contract baseline
- `docs/specs/STANDING_RISK_ENGINE.md` - authoritative Standing Risk Engine v1 derived escalation contract baseline
- `docs/specs/OMISSION_COVERAGE_ENGINE.md` - authoritative Omission & Coverage Engine v1 bounded omission-evaluation contract baseline
- `docs/specs/OPEN_ITEMS_BOARD.md` - authoritative Open Items Board v1 one-board projection contract baseline
- `docs/specs/FORENSIC_CHAIN.md` - authoritative Forensic Chain v1 append-only evidence-substrate contract baseline
- `docs/specs/CONTROL_ROD_MODE.md` - authoritative Control Rod Mode v2 deterministic HARD_STOP LOTO + Permit contract baseline
- `docs/specs/FOREMANS_WALK_ENGINE.md` - authoritative Foreman's Walk Engine v1 post-session verification contract baseline
- `docs/specs/CHANGE_ORDER_ENGINE.md` - authoritative Change Order Engine v1 formal live drift-governance contract baseline
- `docs/specs/BUDDY_SYSTEM.md` - authoritative Buddy System v1 watcher-only live oversight contract baseline
- `docs/indexes/WHERE_TO_CHANGE_X.md` - maintenance navigation map
- `docs/WAVE1_CLOSEOUT.md` - durable Wave 1 integration/proof closeout evidence map
- `docs/WAVE2_CLOSEOUT.md` - durable Wave 2 integration/proof closeout evidence map
- `docs/WAVE3_CLOSEOUT.md` - durable Wave 3 integration/proof closeout evidence map
- `docs/specs/WAVE4_LIVE_OVERSIGHT.md` - authoritative Wave 4 umbrella contract baseline
- `docs/WAVE4_CLOSEOUT.md` - durable Wave 4 integration/proof closeout evidence map
- `docs/specs/WAVE5_OPERATOR_PRODUCT.md` - authoritative Wave 5 umbrella truth (one narrative wave executed as 5A / 5B)
- `docs/specs/SKIN_FRAMEWORK.md` - authoritative Wave 5 skins rendering contract baseline
- `docs/WAVE5_BLOCK0_SUBSTRATE_GATE.md` - authoritative Wave 5A Block 0 substrate merit-gate memo
- `docs/specs/OPERATOR_TRUST_LEDGER.md` - authoritative Wave 5A Block A Operator Trust Ledger v1 contract baseline
- `docs/specs/JOURNEYMAN_TRUST_ENGINE.md` - authoritative Wave 5A Block A Journeyman Trust Engine v1 contract baseline
- `docs/specs/WARRANTY_MONITOR.md` - authoritative Wave 5A Block B Warranty Monitor v1 derived-only contract baseline
- `docs/specs/HOLD_ENGINE_SCARCITY_SIGNAL.md` - authoritative Wave 5A Block C HoldEngine Scarcity Signal v1 derived-only contract baseline
- `docs/specs/SESSION_LIFECYCLE_SKILLS.md` - authoritative Wave 5B Block A Session Lifecycle skill tranche read/query/render-only contract baseline
- `docs/specs/COMPRESSED_INTELLIGENCE_SKILLS.md` - authoritative Wave 5B Block B Compressed Intelligence skill micro-slice read/query/render-only contract baseline
- `docs/specs/COMPRESSED_HISTORY_TRUST_SKILLS.md` - authoritative Wave 5B Block C Compressed History & Trust skill micro-slice read/query/render-only contract baseline
- `docs/specs/COMPRESSED_SAFETY_POSTURE_SKILLS.md` - authoritative Wave 5B Block D Compressed Safety posture skill micro-slice read/query/render-only contract baseline
- `docs/specs/COMPRESSED_GOVERNANCE_HEALTH_SKILLS.md` - authoritative Wave 5B Block E1 Compressed Governance Health skill micro-slice read/query/render-only contract baseline
- `docs/specs/CONTROL_ROD_POSTURE_SKILL.md` - authoritative Wave 5B read-only `/control-rods` posture skill slice contract baseline
- `docs/specs/FIRE_BREAK_SKILL.md` - authoritative Wave 5B read-only `/fire-break` audit skill slice contract baseline
- `docs/specs/CENSUS_SKILL.md` - authoritative Wave 5B read-only `/census` repo snapshot skill slice contract baseline
- `docs/specs/DIAGNOSE_SKILL.md` - authoritative Wave 5B read-only `/diagnose` evidence-view skill slice contract baseline
- `docs/specs/KEYSTONE_SKILL.md` - authoritative Wave 5B read-only `/keystone` decision-support skill slice contract baseline
- `docs/specs/ELIMINATE_SKILL.md` - authoritative Wave 5B read-only `/eliminate` hold-options skill slice contract baseline
- `docs/specs/BUDDY_STATUS_SKILL.md` - authoritative Wave 5B read-only `/buddy-status` watcher-state skill slice contract baseline
- `docs/specs/CHANGE_ORDER_SKILL.md` - authoritative Wave 5B read-only `/change-order` status skill slice contract baseline
- `docs/specs/CALLOUT_SKILL.md` - authoritative Wave 5B read-only `/callout` callout-detail skill slice contract baseline
- `docs/specs/RED_TAG_SKILL.md` - authoritative Wave 5B `/red-tag` interlock decision surface contract baseline
- `docs/specs/PERMIT_SKILL.md` - authoritative Wave 5B `/permit` gate decision surface contract baseline
- `docs/specs/LOCKOUT_SKILL.md` - authoritative Wave 5B `/lockout` LOTO validation surface contract baseline

## Current State

- `docs/specs/` contains the Wave 1 umbrella spec, promoted contract specs for all six Wave 1 systems, the Wave 2 Block A/B/C/D baseline specs, and the Wave 3 Block A1 Forensic Chain + Block B1 Control Rod Mode + Block C1 Foreman's Walk baseline specs.
- Wave 2 Block D closeout evidence map exists at `docs/WAVE2_CLOSEOUT.md`; Architect final signoff is pending.
- Wave 4 Block A1 Control Rod Mode is shipped in current docs/runtime truth with deterministic HARD_STOP LOTO + Permit semantics while preserving the same three-level autonomy enum.
- Wave 4 Block B1 Change Order Engine is shipped in current docs/runtime truth with deterministic `APPROVED`, `REJECTED`, and `DEFERRED` outcomes for live drift governance.
- Wave 4 Block C1 Buddy System is shipped in current docs/runtime truth as watcher-only live oversight that writes callouts to existing Forensic Chain.
- Wave 3 Block C1 Foreman's Walk is shipped in current docs/runtime truth as post-session verification only and produces findings plus As-Built accountability delta without live intervention.
- Wave 3 Block D is shipped in current docs/runtime truth: live integration proof exists at `tests/live/wave3.active-governance.live.test.js` and closeout evidence exists at `docs/WAVE3_CLOSEOUT.md`.
- Wave 4 Buddy behavior is shipped as watcher-only; multi-agent control-room behavior is not shipped.
- Wave 4 Block D is shipped in current docs/runtime truth: live integration proof exists at `tests/live/wave4.live-oversight.live.test.js` and closeout evidence exists at `docs/WAVE4_CLOSEOUT.md`.
- Wave 5 is one narrative wave executed as 5A / 5B.
- Wave 5 now includes 37 skills across 10 groups and keeps SessionBrief no-widening (`journeymanLevel` is not introduced).
- Shipped now: Wave 5A Block 0 truth-sync/substrate-gate/naming-scrub, Wave 5A Blocks A-C, Wave 5B Blocks A-D-E1, and the read-only or thin surfaces `/control-rods`, `/fire-break`, `/census`, `/diagnose`, `/keystone`, `/eliminate`, `/buddy-status`, `/change-order`, `/callout`, `/red-tag`, `/permit`, and `/lockout`.
- Warranty remains derived-first in Wave 5 and HoldEngine Scarcity Signal remains derived-only enrichment.
- Shipped skill tranches remain deterministic route adapters over existing engine truth with no hidden behavior.
- Wave 5 skins tranche 2 is implemented at `docs/specs/SKIN_FRAMEWORK.md`, `src/SkinFramework.js`, and `tests/golden/SkinFramework.golden.test.js`.
- Tranche 2 skin support is locked to Whiteboard and Punch List for `/toolbox-talk`, `/receipt`, `/as-built`, and `/walk`; Inspection Report for `/receipt`, `/as-built`, and `/walk`; Work Order for `/toolbox-talk`, `/receipt`, and `/as-built`; Dispatch Board for `/walk`, `/phantoms`, `/change-order`, and `/control-rods`; Ticket System for `/receipt`, `/walk`, `/phantoms`, and `/change-order`; unsupported combinations fail closed to raw canonical render.
- Later / not yet shipped: additional Wave 5 work outside the current shipped set, including later skins beyond tranche 2, onboarding/package work, and later proof/integration work, remains pending.
- Not claimed / not verified: no installable plugin package, runtime hook path, or compatibility layer is implemented yet.
- `docs/indexes/` contains navigation support for governed maintenance.
- `docs/schemas/` is not present because no shared runtime schema has been established yet.
- `docs/learning-notes/` is not present because no exploration lane is needed for the current repo state.
