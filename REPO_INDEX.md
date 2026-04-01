# REPO_INDEX.md

## Purpose

This index is the quick map for the Blue Collar Governance Plugin repository. It describes what is canonical, what is reference-only, and where each kind of change belongs.

## Canonical Root Files

- `README.md` — front-door truth for the repo
- `CLAUDE.md` — AI operating posture and sync blockers
- `REPO_INDEX.md` — this repo map
- `TEAM_CHARTER.md` — governing team doctrine
- `AI_EXECUTION_DOCTRINE.md` — execution field manual
- `CONTRIBUTING.md` — contribution rules
- `MIGRATIONS.md` — shared contract change log

## Canonical Directories

- `docs/specs/` — promoted product and runtime specs
- `docs/indexes/` — maintenance and navigation indexes
- `skills/` — operator-facing skill artifacts
- `src/` — runtime implementation area
- `tests/golden/` — golden test cases
- `tests/live/` — live or integration verification
- `scripts/` — utility scripts when needed

## Reference-Only Directories

- `raw/governed-workflow/` — imported governed-workflow materials for reference only
- `raw/starters/` — starter/template materials used as source inputs only

## Current Primary Sources

- `docs/specs/WAVE1_TRUST_KERNEL.md` — Wave 1 scope, naming freeze, non-goals, build order, and acceptance criteria
- `docs/specs/HOLD_ENGINE.md` — Hold object contract, lifecycle, and status rules
- `docs/specs/CONSTRAINTS_REGISTRY.md` — never-do rule contract, enforcement classes, and registry invariants
- `docs/specs/SAFETY_INTERLOCKS.md` — dangerous-action taxonomy, stop outcomes, and authorization gates
- `docs/specs/SCOPE_GUARD.md` — asked-vs-done comparison contract and unauthorized-change routing
- `docs/specs/SESSION_BRIEF.md` — startup session-surface contract for scope, hazards, and constraints
- `docs/specs/SESSION_RECEIPT.md` — end-of-session as-built contract for planned vs actual work
- `docs/specs/WAVE2_CONTINUITY_LAYER.md` — Wave 2 continuity-first umbrella baseline for Block A
- `docs/specs/CONTINUITY_LEDGER.md` — Continuity Ledger v0 contract baseline for qualifying carry-forward persistence
- `docs/specs/STANDING_RISK_ENGINE.md` — Standing Risk Engine v1 derived escalation contract baseline
- `docs/specs/OMISSION_COVERAGE_ENGINE.md` — Omission & Coverage Engine v1 bounded omission-evaluation contract baseline
- `docs/specs/OPEN_ITEMS_BOARD.md` — Open Items Board v1 one-board projection contract baseline
- `docs/specs/FORENSIC_CHAIN.md` — Forensic Chain v1 append-only evidence-substrate contract baseline
- `docs/specs/CONTROL_ROD_MODE.md` — Control Rod Mode v2 deterministic HARD_STOP LOTO + Permit contract baseline
- `docs/specs/FOREMANS_WALK_ENGINE.md` — Foreman's Walk Engine v1 post-session verification contract baseline
- `docs/specs/CHANGE_ORDER_ENGINE.md` — Change Order Engine v1 formal live drift-governance contract baseline
- `docs/specs/BUDDY_SYSTEM.md` — Buddy System v1 watcher-only live oversight contract baseline
- `docs/WAVE2_CLOSEOUT.md` — durable Wave 2 closeout evidence map
- `docs/WAVE3_CLOSEOUT.md` — durable Wave 3 closeout evidence map
- `docs/specs/WAVE4_LIVE_OVERSIGHT.md` — Wave 4 umbrella contract and load-bearing decisions
- `docs/WAVE4_CLOSEOUT.md` — durable Wave 4 closeout evidence map
- `docs/specs/WAVE5_OPERATOR_PRODUCT.md` — Wave 5 umbrella truth (one narrative wave executed as 5A / 5B)
- `docs/WAVE5_BLOCK0_SUBSTRATE_GATE.md` — Wave 5A Block 0 substrate merit-gate decisions
- `docs/specs/OPERATOR_TRUST_LEDGER.md` — Wave 5A Block A Operator Trust Ledger v1 contract baseline
- `docs/specs/JOURNEYMAN_TRUST_ENGINE.md` — Wave 5A Block A Journeyman Trust Engine v1 contract baseline
- `docs/specs/WARRANTY_MONITOR.md` — Wave 5A Block B Warranty Monitor v1 derived-only contract baseline
- `docs/specs/HOLD_ENGINE_SCARCITY_SIGNAL.md` — Wave 5A Block C HoldEngine Scarcity Signal v1 derived-only contract baseline
- `docs/specs/SESSION_LIFECYCLE_SKILLS.md` — Wave 5B Block A Session Lifecycle skill tranche read/query/render-only contract baseline
- `docs/specs/COMPRESSED_INTELLIGENCE_SKILLS.md` — Wave 5B Block B Compressed Intelligence skill micro-slice read/query/render-only contract baseline
- `docs/specs/COMPRESSED_HISTORY_TRUST_SKILLS.md` — Wave 5B Block C Compressed History & Trust skill micro-slice read/query/render-only contract baseline
- `docs/specs/COMPRESSED_SAFETY_POSTURE_SKILLS.md` — Wave 5B Block D Compressed Safety posture skill micro-slice read/query/render-only contract baseline
- `docs/specs/COMPRESSED_GOVERNANCE_HEALTH_SKILLS.md` — Wave 5B Block E1 Compressed Governance Health skill micro-slice read/query/render-only contract baseline
- `docs/specs/CONTROL_ROD_POSTURE_SKILL.md` — Wave 5B post-E1 read-only `/control-rods` posture skill slice contract baseline
- `docs/specs/FIRE_BREAK_SKILL.md` — Wave 5B post-control-rods read-only `/fire-break` audit skill slice contract baseline
- `docs/specs/CENSUS_SKILL.md` — Wave 5B post-fire-break read-only `/census` repo snapshot skill slice contract baseline
- `docs/specs/DIAGNOSE_SKILL.md` — Wave 5B post-census read-only `/diagnose` evidence-view skill slice contract baseline
- `docs/specs/KEYSTONE_SKILL.md` — Wave 5B post-diagnose read-only `/keystone` decision-support skill slice contract baseline
- `docs/specs/ELIMINATE_SKILL.md` — Wave 5B post-keystone read-only `/eliminate` hold-options skill slice contract baseline
- `docs/specs/BUDDY_STATUS_SKILL.md` — Wave 5B post-eliminate read-only `/buddy-status` watcher-state skill slice contract baseline
- `docs/specs/CHANGE_ORDER_SKILL.md` — Wave 5B post-buddy-status read-only `/change-order` status skill slice contract baseline
- `skills/toolbox-talk-SKILL.md` — Wave 5B Block A `/toolbox-talk` skill artifact
- `skills/receipt-SKILL.md` — Wave 5B Block A `/receipt` skill artifact
- `skills/as-built-SKILL.md` — Wave 5B Block A `/as-built` skill artifact
- `skills/walk-SKILL.md` — Wave 5B Block A `/walk` skill artifact
- `skills/phantoms-SKILL.md` — Wave 5B Block B `/phantoms` skill artifact
- `skills/ufo-SKILL.md` — Wave 5B Block B `/ufo` skill artifact
- `skills/gaps-SKILL.md` — Wave 5B Block B `/gaps` skill artifact
- `skills/chain-SKILL.md` — Wave 5B Block C `/chain` skill artifact
- `skills/warranty-SKILL.md` — Wave 5B Block C `/warranty` skill artifact
- `skills/journeyman-SKILL.md` — Wave 5B Block C `/journeyman` skill artifact
- `skills/constraints-SKILL.md` — Wave 5B Block D `/constraints` skill artifact
- `skills/silence-map-SKILL.md` — Wave 5B Block D `/silence-map` skill artifact
- `skills/prevention-record-SKILL.md` — Wave 5B Block E1 `/prevention-record` skill artifact
- `skills/rights-SKILL.md` — Wave 5B Block E1 `/rights` skill artifact
- `skills/control-rods-SKILL.md` — Wave 5B read-only `/control-rods` posture skill artifact
- `skills/fire-break-SKILL.md` — Wave 5B read-only `/fire-break` audit skill artifact
- `skills/census-SKILL.md` — Wave 5B read-only `/census` repo snapshot skill artifact
- `skills/diagnose-SKILL.md` — Wave 5B read-only `/diagnose` evidence-view skill artifact
- `skills/keystone-SKILL.md` — Wave 5B read-only `/keystone` decision-support skill artifact
- `skills/eliminate-SKILL.md` — Wave 5B read-only `/eliminate` hold-options skill artifact
- `skills/buddy-status-SKILL.md` — Wave 5B read-only `/buddy-status` watcher-state skill artifact
- `skills/change-order-SKILL.md` — Wave 5B read-only `/change-order` status skill artifact
- `CLAUDE.md` — current session posture and closeout expectations
- `README.md` — repo identity and current implementation truth

## Current State

- The repo is in bootstrap state with Wave 0 committed.
- Git is initialized on `main`.
- All six Wave 1 systems have promoted contract specs.
- Runtime systems are implemented for all six Wave 1 systems: `HoldEngine`, `ConstraintsRegistry`, `SafetyInterlocks`, `ScopeGuard`, `SessionBrief`, and `SessionReceipt`.
- Wave 2 Block A runtime baseline is implemented for `ContinuityLedger` at `src/ContinuityLedger.js` with golden proof at `tests/golden/ContinuityLedger.golden.test.js`.
- Wave 2 Block B1 derived standing-risk baseline is implemented for `StandingRiskEngine` at `src/StandingRiskEngine.js` with golden proof at `tests/golden/StandingRiskEngine.golden.test.js`.
- Standing Risk remains derived from continuity with explicit `continuationSignals`; no second standing-risk persistence layer is implemented.
- Wave 2 Block C1 bounded omission baseline is implemented for `OmissionCoverageEngine` at `src/OmissionCoverageEngine.js` with golden proof at `tests/golden/OmissionCoverageEngine.golden.test.js`.
- Block C1 requires explicit `profilePack` selection, is bounded to exactly three first-proof packs (`pricing_quote_change`, `form_customer_data_flow`, `protected_destructive_operation`), and emits deterministic findings with fixed `missingItemCode` vocabulary.
- Block C1 remains evaluation-scoped only, with no omission-finding persistence/write behavior and no continuity-promotion workflow runtime yet.
- Wave 2 Block D1 open-items-board baseline is implemented for `OpenItemsBoard` at `src/OpenItemsBoard.js` with golden proof at `tests/golden/OpenItemsBoard.golden.test.js`.
- Block D1 is one board only with exactly four fixed groups (`Missing now`, `Still unresolved`, `Aging into risk`, `Resolved this session`).
- Block D1 is projection-only over existing A/B/C truth, uses explicit current-session resolved-outcomes input, and enforces precedence+dedupe.
- Block D1 has no persisted board store and no continuity-promotion runtime behavior.
- No score/confidence/rank/priority/anomaly/prediction logic is implemented in Block D1.
- Wave 2 closeout evidence map exists at `docs/WAVE2_CLOSEOUT.md`; Architect final signoff is pending.
- Wave 3 Block A1 Forensic Chain baseline is implemented at `src/ForensicChain.js` with golden proof at `tests/golden/ForensicChain.golden.test.js` and canon spec at `docs/specs/FORENSIC_CHAIN.md`.
- Forensic Chain is evidence-substrate only and does not create a second continuity or standing-risk operational substrate.
- Wave 4 Block A1 Control Rod Mode baseline is implemented at `src/ControlRodMode.js` with golden proof at `tests/golden/ControlRodMode.golden.test.js` and canon spec at `docs/specs/CONTROL_ROD_MODE.md`.
- Block B1 starter profiles are `conservative`, `balanced`, and `velocity`; SessionBrief stores `controlRodProfile` as a normalized snapshot object with no second authorization field.
- Control Rod Mode v2 preserves the same three autonomy levels (`FULL_AUTO`, `SUPERVISED`, `HARD_STOP`) and upgrades HARD_STOP behavior with deterministic LOTO + Permit semantics.
- Permit gating applies only to HARD_STOP domains.
- No adaptive learning and no rod suggestions are implemented.
- Wave 4 Block B1 Change Order Engine baseline is implemented at `src/ChangeOrderEngine.js` with golden proof at `tests/golden/ChangeOrderEngine.golden.test.js` and canon spec at `docs/specs/CHANGE_ORDER_ENGINE.md`.
- Change Orders support deterministic `APPROVED`, `REJECTED`, and `DEFERRED` outcomes with deferred promotion through existing continuity paths.
- Wave 4 Block C1 Buddy System baseline is implemented at `src/BuddySystem.js` with golden proof at `tests/golden/BuddySystem.golden.test.js` and canon spec at `docs/specs/BUDDY_SYSTEM.md`.
- Buddy is watcher-only live oversight, writes callouts to existing Forensic Chain, and does not build/fix/revert.
- SessionBrief supports one optional `toolboxTalk` enrichment object for startup summaries; no duplicated full payload fields are introduced.
- Wave 3 Block C1 Foreman's Walk baseline is implemented at `src/ForemansWalk.js` with golden proof at `tests/golden/ForemansWalk.golden.test.js` and canon spec at `docs/specs/FOREMANS_WALK_ENGINE.md`.
- Foreman's Walk is post-session verification only; it emits deterministic findings plus As-Built accountability delta while SessionReceipt remains session-of-record.
- Foreman's Walk does not implement live intervention, watcher/buddy behavior, or adaptive intelligence.
- Wave 3 Block D1 live integration proof is implemented at `tests/live/wave3.active-governance.live.test.js`.
- Wave 3 Block D2 closeout and front-door/index truth sync are implemented at `docs/WAVE3_CLOSEOUT.md`.
- Wave 3 is shipped.
- Wave 4 is shipped: Blocks A1 + B1 + C1 + D1 + D2 are complete.
- Wave 4 Block D1 live integration proof is implemented at `tests/live/wave4.live-oversight.live.test.js`.
- Wave 4 Block D2 closeout and front-door/index truth sync are implemented at `docs/WAVE4_CLOSEOUT.md`.
- Wave 5 is one narrative wave executed as 5A / 5B.
- Wave 5A Block 0 docs-only truth-sync/substrate-gate/naming-scrub is implemented at `docs/specs/WAVE5_OPERATOR_PRODUCT.md` and `docs/WAVE5_BLOCK0_SUBSTRATE_GATE.md`.
- Wave 5A Block A baselines are implemented at `docs/specs/OPERATOR_TRUST_LEDGER.md`, `docs/specs/JOURNEYMAN_TRUST_ENGINE.md`, `src/OperatorTrustLedger.js`, `src/JourneymanTrustEngine.js`, `tests/golden/OperatorTrustLedger.golden.test.js`, and `tests/golden/JourneymanTrustEngine.golden.test.js`.
- Operator Trust Ledger is approved on engineering merit and implemented as the Wave 5A Block A substrate baseline.
- Wave 5A Block B baseline is implemented at `docs/specs/WARRANTY_MONITOR.md`, `src/WarrantyMonitor.js`, and `tests/golden/WarrantyMonitor.golden.test.js`.
- Warranty remains derived-first in Wave 5 and is implemented as derived-only monitoring in Block B.
- Wave 5A Block C baseline is implemented at `docs/specs/HOLD_ENGINE_SCARCITY_SIGNAL.md`, `src/HoldEngineScarcitySignal.js`, and `tests/golden/HoldEngineScarcitySignal.golden.test.js`.
- HoldEngine Scarcity Signal remains additive direction and is implemented as derived-only enrichment in Block C.
- Wave 5B Block A baseline is implemented at `docs/specs/SESSION_LIFECYCLE_SKILLS.md`, `skills/toolbox-talk-SKILL.md`, `skills/receipt-SKILL.md`, `skills/as-built-SKILL.md`, `skills/walk-SKILL.md`, `src/SessionLifecycleSkills.js`, and `tests/golden/SessionLifecycleSkills.golden.test.js`.
- Wave 5B Block B baseline is implemented at `docs/specs/COMPRESSED_INTELLIGENCE_SKILLS.md`, `skills/phantoms-SKILL.md`, `skills/ufo-SKILL.md`, `skills/gaps-SKILL.md`, `src/CompressedIntelligenceSkills.js`, and `tests/golden/CompressedIntelligenceSkills.golden.test.js`.
- Wave 5B Block C baseline is implemented at `docs/specs/COMPRESSED_HISTORY_TRUST_SKILLS.md`, `skills/chain-SKILL.md`, `skills/warranty-SKILL.md`, `skills/journeyman-SKILL.md`, `src/CompressedHistoryTrustSkills.js`, and `tests/golden/CompressedHistoryTrustSkills.golden.test.js`.
- Wave 5B Block D baseline is implemented at `docs/specs/COMPRESSED_SAFETY_POSTURE_SKILLS.md`, `skills/constraints-SKILL.md`, `skills/silence-map-SKILL.md`, `src/CompressedSafetyPostureSkills.js`, and `tests/golden/CompressedSafetyPostureSkills.golden.test.js`.
- Compressed Safety posture skills are read/query/render-only surfaces over existing ConstraintsRegistry truth, SafetyInterlocks truth, and ControlRodMode posture/status views; no standalone `/control-rods` skill is shipped in Block D.
- Wave 5B Block E1 baseline is implemented at `docs/specs/COMPRESSED_GOVERNANCE_HEALTH_SKILLS.md`, `skills/prevention-record-SKILL.md`, `skills/rights-SKILL.md`, `src/CompressedGovernanceHealthSkills.js`, and `tests/golden/CompressedGovernanceHealthSkills.golden.test.js`.
- A Wave 5B read-only `/control-rods` posture slice is implemented at `docs/specs/CONTROL_ROD_POSTURE_SKILL.md`, `skills/control-rods-SKILL.md`, `src/ControlRodPostureSkill.js`, and `tests/golden/ControlRodPostureSkill.golden.test.js`.
- A Wave 5B read-only `/fire-break` audit slice is implemented at `docs/specs/FIRE_BREAK_SKILL.md`, `skills/fire-break-SKILL.md`, `src/FireBreakSkill.js`, and `tests/golden/FireBreakSkill.golden.test.js`.
- A Wave 5B read-only `/census` repo snapshot slice is implemented at `docs/specs/CENSUS_SKILL.md`, `skills/census-SKILL.md`, `src/CensusSkill.js`, and `tests/golden/CensusSkill.golden.test.js`.
- A Wave 5B read-only `/diagnose` evidence-view slice is implemented at `docs/specs/DIAGNOSE_SKILL.md`, `skills/diagnose-SKILL.md`, `src/DiagnoseSkill.js`, and `tests/golden/DiagnoseSkill.golden.test.js`.
- A Wave 5B read-only `/keystone` decision-support slice is implemented at `docs/specs/KEYSTONE_SKILL.md`, `skills/keystone-SKILL.md`, `src/KeystoneSkill.js`, and `tests/golden/KeystoneSkill.golden.test.js`.
- A Wave 5B read-only `/eliminate` hold-options slice is implemented at `docs/specs/ELIMINATE_SKILL.md`, `skills/eliminate-SKILL.md`, `src/EliminateSkill.js`, and `tests/golden/EliminateSkill.golden.test.js`.
- A Wave 5B read-only `/buddy-status` watcher-state slice is implemented at `docs/specs/BUDDY_STATUS_SKILL.md`, `skills/buddy-status-SKILL.md`, `src/BuddyStatusSkill.js`, and `tests/golden/BuddyStatusSkill.golden.test.js`.
- A Wave 5B read-only `/change-order` status slice is implemented at `docs/specs/CHANGE_ORDER_SKILL.md`, `skills/change-order-SKILL.md`, `src/ChangeOrderSkill.js`, and `tests/golden/ChangeOrderSkill.golden.test.js`.
- Compressed Governance Health skills are read/query/render-only surfaces where `/prevention-record` renders explicit captured governance signals and `/rights` renders a static manual declaration.
- Session Lifecycle skills are read/query/render-only surfaces over existing SessionBrief, SessionReceipt, and Foreman's Walk outputs.
- Compressed Intelligence skills are read/query/render-only surfaces over existing Foreman's Walk truthfulness findings, Standing Risk unresolved/aging views, and Omission expected-signal-missing findings.
- Compressed History & Trust skills are read/query/render-only surfaces over existing Forensic Chain history views, Warranty Monitor derived posture views, and persisted trust posture read paths.
- Wave 5 skill topology is now 35 skills across 10 groups.
- SessionBrief no-widening remains hard-locked for Wave 5; `journeymanLevel` is not introduced.
- Remaining Wave 5B runtime behavior outside Blocks A, B, C, D, E1, the read-only `/control-rods` posture slice, the read-only `/fire-break` audit slice, the read-only `/census` repo snapshot slice, the read-only `/diagnose` evidence-view slice, the read-only `/keystone` decision-support slice, the read-only `/eliminate` hold-options slice, the read-only `/buddy-status` watcher-state slice, and the read-only `/change-order` status slice is not implemented.

- Skills outside Session Lifecycle, Compressed Intelligence, Compressed History & Trust, Compressed Safety posture, Compressed Governance Health, Control Rod Posture, Fire Break Audit, Census Snapshot, Diagnose View, Keystone View, Eliminate View, Buddy Status View, and Change Order View, plus skins, onboarding, and package surfaces are not implemented yet.
- No installable plugin package, runtime hook path, or compatibility layer is implemented yet.
- No multi-agent control room behavior is implemented.
- `origin` remote is configured.
- The repo remains governed/spec-led; live integration proof exists at `tests/live/wave1.operator-flow.live.test.js`, and final Wave 1 evidence is captured in `docs/WAVE1_CLOSEOUT.md`.
