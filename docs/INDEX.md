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
- Wave 5A Block 0 docs-only truth-sync/substrate-gate/naming-scrub is shipped at `docs/specs/WAVE5_OPERATOR_PRODUCT.md` and `docs/WAVE5_BLOCK0_SUBSTRATE_GATE.md`.
- Wave 5A Block A baselines are shipped at `docs/specs/OPERATOR_TRUST_LEDGER.md`, `docs/specs/JOURNEYMAN_TRUST_ENGINE.md`, `src/OperatorTrustLedger.js`, `src/JourneymanTrustEngine.js`, `tests/golden/OperatorTrustLedger.golden.test.js`, and `tests/golden/JourneymanTrustEngine.golden.test.js`.
- Wave 5 now includes 32 skills across 10 groups and keeps SessionBrief no-widening (`journeymanLevel` is not introduced).
- Operator Trust Ledger is approved on engineering merit and implemented as the Wave 5A Block A substrate baseline.
- Wave 5A Block B baseline is shipped at `docs/specs/WARRANTY_MONITOR.md`, `src/WarrantyMonitor.js`, and `tests/golden/WarrantyMonitor.golden.test.js`.
- Warranty remains derived-first in Wave 5 and is implemented as derived-only monitoring in Block B.
- Wave 5A Block C baseline is shipped at `docs/specs/HOLD_ENGINE_SCARCITY_SIGNAL.md`, `src/HoldEngineScarcitySignal.js`, and `tests/golden/HoldEngineScarcitySignal.golden.test.js`.
- HoldEngine Scarcity Signal remains additive direction and is implemented as derived-only enrichment in Block C.
- Wave 5B Block A baseline is shipped at `docs/specs/SESSION_LIFECYCLE_SKILLS.md`, `skills/toolbox-talk-SKILL.md`, `skills/receipt-SKILL.md`, `skills/as-built-SKILL.md`, `skills/walk-SKILL.md`, `src/SessionLifecycleSkills.js`, and `tests/golden/SessionLifecycleSkills.golden.test.js`.
- Wave 5B Block B baseline is shipped at `docs/specs/COMPRESSED_INTELLIGENCE_SKILLS.md`, `skills/phantoms-SKILL.md`, `skills/ufo-SKILL.md`, `skills/gaps-SKILL.md`, `src/CompressedIntelligenceSkills.js`, and `tests/golden/CompressedIntelligenceSkills.golden.test.js`.
- Wave 5B Block C baseline is shipped at `docs/specs/COMPRESSED_HISTORY_TRUST_SKILLS.md`, `skills/chain-SKILL.md`, `skills/warranty-SKILL.md`, `skills/journeyman-SKILL.md`, `src/CompressedHistoryTrustSkills.js`, and `tests/golden/CompressedHistoryTrustSkills.golden.test.js`.
- Wave 5B Block D baseline is shipped at `docs/specs/COMPRESSED_SAFETY_POSTURE_SKILLS.md`, `skills/constraints-SKILL.md`, `skills/silence-map-SKILL.md`, `src/CompressedSafetyPostureSkills.js`, and `tests/golden/CompressedSafetyPostureSkills.golden.test.js`.
- Compressed Safety posture skills are read/query/render-only surfaces over existing ConstraintsRegistry truth, SafetyInterlocks truth, and ControlRodMode posture/status views; no standalone `/control-rods` skill is shipped in Block D.
- Wave 5B Block E1 baseline is shipped at `docs/specs/COMPRESSED_GOVERNANCE_HEALTH_SKILLS.md`, `skills/prevention-record-SKILL.md`, `skills/rights-SKILL.md`, `src/CompressedGovernanceHealthSkills.js`, and `tests/golden/CompressedGovernanceHealthSkills.golden.test.js`.
- A Wave 5B read-only `/control-rods` posture slice is shipped at `docs/specs/CONTROL_ROD_POSTURE_SKILL.md`, `skills/control-rods-SKILL.md`, `src/ControlRodPostureSkill.js`, and `tests/golden/ControlRodPostureSkill.golden.test.js`.
- A Wave 5B read-only `/fire-break` audit slice is shipped at `docs/specs/FIRE_BREAK_SKILL.md`, `skills/fire-break-SKILL.md`, `src/FireBreakSkill.js`, and `tests/golden/FireBreakSkill.golden.test.js`.
- A Wave 5B read-only `/census` repo snapshot slice is shipped at `docs/specs/CENSUS_SKILL.md`, `skills/census-SKILL.md`, `src/CensusSkill.js`, and `tests/golden/CensusSkill.golden.test.js`.
- Compressed Governance Health skills are read/query/render-only surfaces where `/prevention-record` renders explicit captured governance signals and `/rights` renders a static manual declaration.
- Session Lifecycle skills are read/query/render-only surfaces over existing SessionBrief, SessionReceipt, and Foreman's Walk outputs.
- Compressed Intelligence skills are read/query/render-only surfaces over existing Foreman's Walk truthfulness findings, Standing Risk unresolved/aging views, and Omission expected-signal-missing findings.
- Compressed History & Trust skills are read/query/render-only surfaces over existing Forensic Chain history views, Warranty Monitor derived posture views, and persisted trust posture read paths.
- Remaining Wave 5B runtime behavior outside Blocks A, B, C, D, E1, the read-only `/control-rods` posture slice, the read-only `/fire-break` audit slice, and the read-only `/census` repo snapshot slice is not shipped in current docs/runtime truth.
- Skills outside Session Lifecycle, Compressed Intelligence, Compressed History & Trust, Compressed Safety posture, Compressed Governance Health, Control Rod Posture, Fire Break Audit, and Census Snapshot, plus skins, onboarding, and package surfaces are not implemented yet.
- No installable plugin package, runtime hook path, or compatibility layer is implemented yet.
- `docs/indexes/` contains navigation support for governed maintenance.
- `docs/schemas/` is not present because no shared runtime schema has been established yet.
- `docs/learning-notes/` is not present because no exploration lane is needed for the current repo state.
