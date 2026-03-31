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
- Warranty remains derived-first in Wave 5 Block 0.
- HoldEngine Scarcity Signal is approved as additive enrichment direction only.
- Wave 5 skill topology is locked at 28 skills across 7 groups.
- SessionBrief no-widening remains hard-locked for Wave 5; `journeymanLevel` is not introduced.
- Wave 5B runtime behavior is not implemented.
- No installable plugin package, runtime hook path, or compatibility layer is implemented yet.
- No multi-agent control room behavior is implemented.
- No remote is configured yet.
- The repo remains governed/spec-led; live integration proof exists at `tests/live/wave1.operator-flow.live.test.js`, and final Wave 1 evidence is captured in `docs/WAVE1_CLOSEOUT.md`.
