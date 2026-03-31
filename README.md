# Blue Collar Governance Plugin

**Status:** Wave 1 runtime implemented and verified; Wave 2 Block A + Block B1 + Block C1 + Block D1 baselines implemented; Wave 3 Block A1 + Block B1 + Block C1 baselines implemented; Wave 3 Block D integration proof and closeout shipped; Wave 4 live oversight shipped (Control Rod v2 + Change Order v1 + Buddy v1 + Toolbox Talk enrichment); Wave 5A Block 0 docs shipped (truth-sync + substrate-gate + naming scrub); Wave 5A Block A baselines implemented (Operator Trust Ledger v1 + Journeyman Trust Engine v1)
**Repo type:** Private runtime/control layer  
**Implementation state:** All six Wave 1 systems now have runtime implementations (`HoldEngine`, `ConstraintsRegistry`, `SafetyInterlocks`, `ScopeGuard`, `SessionBrief`, `SessionReceipt`)

## What This Repo Is

This repository is the private runtime trust layer for Blue Collar Governance Plugin. It is aimed at non-technical AI operators and builders who need explicit boundaries, dangerous-action control, unauthorized-change detection, and a durable session record without having to review source code directly.

Governed Workflow is the methodology spine behind the work. This repository is not the methodology repo. Its job is to hold the runtime trust kernel and the repo truth needed to build that kernel in a governed way.

## Current Truth

- Wave 0 bootstrap is committed.
- All six Wave 1 systems now exist as promoted contract/spec objects under `docs/specs/`.
- Wave 1 runtime now includes all six systems (`HoldEngine`, `ConstraintsRegistry`, `SafetyInterlocks`, `ScopeGuard`, `SessionBrief`, `SessionReceipt`).
- Golden proof exists for each Wave 1 system under `tests/golden/`.
- Live proof exists at `tests/live/wave1.operator-flow.live.test.js`.
- Full Wave 1 verification passed (40 tests passed, 0 failed).
- Wave 2 Block A baseline is implemented: Continuity Ledger v0 (`docs/specs/WAVE2_CONTINUITY_LAYER.md`, `docs/specs/CONTINUITY_LEDGER.md`, `src/ContinuityLedger.js`, `tests/golden/ContinuityLedger.golden.test.js`).
- Wave 2 Block B1 baseline is implemented: Standing Risk Engine v1 derived baseline (`docs/specs/STANDING_RISK_ENGINE.md`, `src/StandingRiskEngine.js`, `tests/golden/StandingRiskEngine.golden.test.js`).
- Standing Risk remains derived from Continuity Ledger truth with explicit `continuationSignals`; no second standing-risk persistence substrate is implemented.
- Wave 2 Block C1 baseline is implemented: Omission & Coverage Engine v1 bounded baseline (`docs/specs/OMISSION_COVERAGE_ENGINE.md`, `src/OmissionCoverageEngine.js`, `tests/golden/OmissionCoverageEngine.golden.test.js`).
- Block C1 requires explicit `profilePack` selection and is bounded to exactly three first-proof packs: `pricing_quote_change`, `form_customer_data_flow`, and `protected_destructive_operation`.
- Block C1 findings are deterministic, use a fixed `missingItemCode` vocabulary, and remain evaluation-scoped.
- Block C1 does not persist omission findings and does not implement continuity-promotion workflow runtime yet.
- Wave 2 Block D1 baseline is implemented: Open Items Board v1 projection baseline (`docs/specs/OPEN_ITEMS_BOARD.md`, `src/OpenItemsBoard.js`, `tests/golden/OpenItemsBoard.golden.test.js`).
- Block D1 is one board only with exactly four fixed groups: `Missing now`, `Still unresolved`, `Aging into risk`, `Resolved this session`.
- Block D1 is projection-only over existing A/B/C truth, uses explicit current-session resolved-outcomes input, and enforces precedence+dedupe.
- Block D1 does not persist a board store and does not implement continuity-promotion runtime.
- No score/confidence/rank/priority/anomaly/prediction logic is shipped in Block D1.
- Wave 2 closeout evidence map exists at `docs/WAVE2_CLOSEOUT.md`; Architect final signoff is pending.
- Wave 3 Block A1 baseline is implemented: Forensic Chain v1 evidence substrate (`docs/specs/FORENSIC_CHAIN.md`, `src/ForensicChain.js`, `tests/golden/ForensicChain.golden.test.js`).
- Forensic Chain is append-only evidence linkage and does not introduce a second continuity or standing-risk operational substrate.
- Forensic Chain linkage remains string-reference based and does not widen Continuity, Open Items Board, SessionBrief, or SessionReceipt contracts beyond approved Block 0 truth.
- Wave 4 Block A1 baseline is implemented: Control Rod Mode v2 (`docs/specs/CONTROL_ROD_MODE.md`, `src/ControlRodMode.js`, `tests/golden/ControlRodMode.golden.test.js`).
- Block B1 ships exactly three built-in starter profiles: `conservative`, `balanced`, `velocity`.
- SessionBrief now stores `controlRodProfile` as a normalized snapshot object (`src/SessionBrief.js`, `tests/golden/SessionBrief.golden.test.js`) with no second authorization field.
- SessionBrief supports one optional `toolboxTalk` enrichment object for next-session startup context summaries (no duplicated full payloads).
- Control Rod Mode v2 preserves the same three autonomy levels (`FULL_AUTO`, `SUPERVISED`, `HARD_STOP`) and upgrades HARD_STOP behavior with deterministic LOTO + Permit semantics.
- Permit gating applies only to HARD_STOP domains.
- No adaptive learning and no rod suggestions are shipped.
- Wave 4 Block B1 baseline is implemented: Change Order Engine v1 (`docs/specs/CHANGE_ORDER_ENGINE.md`, `src/ChangeOrderEngine.js`, `tests/golden/ChangeOrderEngine.golden.test.js`).
- Change Orders are formal drift-governance documents with deterministic `APPROVED`, `REJECTED`, and `DEFERRED` outcomes.
- Wave 4 Block C1 baseline is implemented: Buddy System v1 live watcher (docs/specs/BUDDY_SYSTEM.md, src/BuddySystem.js, tests/golden/BuddySystem.golden.test.js).
- Buddy is watcher-only live oversight and writes callout events directly to existing Forensic Chain.
- Buddy does not build, fix, revert, or suggest fixes.
- Wave 3 Block C1 baseline is implemented: Foreman's Walk Engine v1 post-session verification (docs/specs/FOREMANS_WALK_ENGINE.md, src/ForemansWalk.js, tests/golden/ForemansWalk.golden.test.js).
- Foreman's Walk v1 evaluates scope compliance, constraint posture, completeness, truthfulness, and evidence integrity.
- Foreman's Walk v1 produces deterministic findings and an As-Built accountability delta-of-record while SessionReceipt remains session-of-record.
- Foreman's Walk v1 is post-session only and does not implement buddy behavior or live intervention.
- Wave 3 Block D1 live integration proof is implemented at `tests/live/wave3.active-governance.live.test.js`.
- Wave 3 Block D2 closeout and truth sync are implemented at `docs/WAVE3_CLOSEOUT.md`.
- Wave 3 is shipped.
- Wave 4 is shipped: Blocks A1 + B1 + C1 + D1 + D2 are complete.
- Wave 4 Block D1 live integration proof is implemented at `tests/live/wave4.live-oversight.live.test.js`.
- Wave 4 Block D2 closeout and truth sync are implemented at `docs/WAVE4_CLOSEOUT.md`.
- Wave 5 is one narrative wave executed as 5A / 5B.
- Wave 5 Block 0 truth surfaces are implemented at `docs/specs/WAVE5_OPERATOR_PRODUCT.md` and `docs/WAVE5_BLOCK0_SUBSTRATE_GATE.md`.
- Wave 5 Block 0 locks 28 skills across 7 groups and keeps skills as read/query/render layers only.
- SessionBrief no-widening remains locked for Wave 5; `journeymanLevel` is not introduced.
- Operator Trust Ledger is approved on merit and implemented as the Wave 5A Block A substrate baseline.
- Warranty remains derived-first in Wave 5 Block 0.
- HoldEngine Scarcity Signal is approved as additive enrichment direction only.
- Wave 5B runtime behavior is not implemented yet.
- No installable plugin package, runtime hook path, or compatibility layer is implemented yet.
- No skins, marketplace packaging, or public-product polish work is in scope for Wave 1.

## Wave 1 Focus

Wave 1 is limited to six systems:

- `HoldEngine`
- `ConstraintsRegistry`
- `SafetyInterlocks`
- `ScopeGuard`
- `SessionBrief`
- `SessionReceipt`

The authoritative Wave 1 scope, naming freeze, non-goals, build order, and acceptance criteria live in `docs/specs/WAVE1_TRUST_KERNEL.md`.

Promoted Wave 1 contract baselines:

- `docs/specs/HOLD_ENGINE.md`
- `docs/specs/CONSTRAINTS_REGISTRY.md`
- `docs/specs/SAFETY_INTERLOCKS.md`
- `docs/specs/SCOPE_GUARD.md`
- `docs/specs/SESSION_BRIEF.md`
- `docs/specs/SESSION_RECEIPT.md`

## Start Here

Read these in order:

1. `CLAUDE.md`
2. `TEAM_CHARTER.md`
3. `AI_EXECUTION_DOCTRINE.md`
4. `docs/specs/WAVE1_TRUST_KERNEL.md`
5. `docs/INDEX.md`
6. `REPO_INDEX.md`

## Repository Structure

```text
.
├── src/                           # Runtime implementation area (Wave 1 systems implemented)
├── tests/
│   ├── golden/                    # Golden cases for trust-kernel behavior
│   └── live/                      # Live or integration verification
├── docs/
│   ├── specs/                     # Canonical product and runtime specs
│   ├── indexes/                   # Navigation aids for maintenance and edits
│   └── INDEX.md                   # Docs front door
├── raw/
│   ├── governed-workflow/         # Reference inputs only, not canon
│   └── starters/                  # Starter/template source material, not canon
├── scripts/                       # Utility scripts when needed
├── README.md
├── CLAUDE.md
├── REPO_INDEX.md
├── TEAM_CHARTER.md
├── AI_EXECUTION_DOCTRINE.md
├── CONTRIBUTING.md
└── MIGRATIONS.md
```

## Canon Vs Reference

- Canon surfaces are the root governance files and promoted specs under `docs/specs/`.
- `raw/governed-workflow/` contains imported methodology references only.
- `raw/starters/` contains starter/template inputs only.
- Reference material does not become repo truth until it is explicitly promoted into canon.

## Working In This Repo

There is no end-to-end runtime setup sequence yet. Runtime code exists for all six Wave 1 systems, live integration proof exists at `tests/live/wave1.operator-flow.live.test.js`, and closeout evidence is captured in `docs/WAVE1_CLOSEOUT.md`. Wave 2 Block A continuity runtime exists at `src/ContinuityLedger.js` with golden proof at `tests/golden/ContinuityLedger.golden.test.js`, Wave 2 Block B1 derived standing-risk runtime exists at `src/StandingRiskEngine.js` with golden proof at `tests/golden/StandingRiskEngine.golden.test.js`, Wave 2 Block C1 bounded omission runtime exists at `src/OmissionCoverageEngine.js` with golden proof at `tests/golden/OmissionCoverageEngine.golden.test.js`, Wave 2 Block D1 projection board runtime exists at `src/OpenItemsBoard.js` with golden proof at `tests/golden/OpenItemsBoard.golden.test.js`, Wave 3 Block A1 forensic evidence runtime exists at `src/ForensicChain.js` with golden proof at `tests/golden/ForensicChain.golden.test.js`, Wave 4 Block A1 control-rod v2 runtime exists at `src/ControlRodMode.js` with golden proof at `tests/golden/ControlRodMode.golden.test.js`, Wave 4 Block B1 change-order runtime exists at `src/ChangeOrderEngine.js` with golden proof at `tests/golden/ChangeOrderEngine.golden.test.js`, Wave 4 Block C1 buddy runtime exists at `src/BuddySystem.js` with golden proof at `tests/golden/BuddySystem.golden.test.js`, Wave 3 Block C1 foreman's-walk runtime exists at `src/ForemansWalk.js` with golden proof at `tests/golden/ForemansWalk.golden.test.js`, Wave 3 Block D live integration proof exists at `tests/live/wave3.active-governance.live.test.js` with closeout evidence in `docs/WAVE3_CLOSEOUT.md`, and Wave 4 Block D live integration proof exists at `tests/live/wave4.live-oversight.live.test.js` with closeout evidence in `docs/WAVE4_CLOSEOUT.md`; continuity-promotion runtime and compatibility surfaces are not implemented. Wave 5 Block 0 docs are locked at `docs/specs/WAVE5_OPERATOR_PRODUCT.md` and `docs/WAVE5_BLOCK0_SUBSTRATE_GATE.md`; Wave 5A Block A runtime baselines now exist at `src/OperatorTrustLedger.js` and `src/JourneymanTrustEngine.js` with golden proof at `tests/golden/OperatorTrustLedger.golden.test.js` and `tests/golden/JourneymanTrustEngine.golden.test.js`; Wave 5B runtime behavior is not implemented.

## Contributing

Use `CONTRIBUTING.md` for contribution rules and `MIGRATIONS.md` for contract-change logging.
