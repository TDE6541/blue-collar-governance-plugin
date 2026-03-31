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

- Status: private runtime trust layer with Wave 1 implemented, Wave 2 Block A + Block B1 + Block C1 + Block D1 baselines implemented, Wave 3 Block A1 + Block B1 + Block C1 baselines implemented, Wave 3 Block D integration proof + closeout shipped, Wave 4 live oversight shipped, Wave 5A Block 0 docs shipped (truth-sync + substrate-gate + naming scrub), Wave 5A Block A baselines implemented (Operator Trust Ledger v1 + Journeyman Trust Engine v1), Wave 5A Block B baseline implemented (Warranty Monitor v1 derived-only), Wave 5A Block C baseline implemented (HoldEngine Scarcity Signal v1 derived-only), Wave 5B Block A baseline implemented (Session Lifecycle skills tranche read/query/render-only), and Wave 5B Block B baseline implemented (Compressed Intelligence skills micro-slice read/query/render-only), and Wave 5B Block C baseline implemented (Compressed History & Trust skills micro-slice read/query/render-only), and Wave 5B Block D baseline implemented (Compressed Safety posture micro-slice read/query/render-only)
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
- Wave 2 Block D1 open-items-board baseline: implemented as one-board projection logic (`docs/specs/OPEN_ITEMS_BOARD.md`, `src/OpenItemsBoard.js`, `tests/golden/OpenItemsBoard.golden.test.js`)
- Block D1 has exactly four fixed groups: `Missing now`, `Still unresolved`, `Aging into risk`, `Resolved this session`.
- Block D1 is projection-only, uses explicit current-session resolved-outcomes input for `Resolved this session`, and enforces precedence+dedupe.
- Block D1 does not persist a board store and does not implement continuity-promotion runtime.
- No score/confidence/rank/priority/anomaly/prediction logic is implemented in Block D1.
- Wave 3 Block A1 Forensic Chain baseline: implemented as append-only evidence substrate (`docs/specs/FORENSIC_CHAIN.md`, `src/ForensicChain.js`, `tests/golden/ForensicChain.golden.test.js`).
- Forensic Chain linkage remains string-reference based, does not introduce a second continuity or standing-risk substrate, and does not widen continuity/board/session contracts beyond approved Block 0 truth.
- Wave 4 Block A1 Control Rod Mode baseline: implemented as v2 deterministic posture + HARD_STOP gate contract (`docs/specs/CONTROL_ROD_MODE.md`, `src/ControlRodMode.js`, `tests/golden/ControlRodMode.golden.test.js`).
- Block B1 starter profiles are `conservative`, `balanced`, and `velocity`.
- SessionBrief stores `controlRodProfile` as a normalized snapshot object in Block B1 (`src/SessionBrief.js`, `tests/golden/SessionBrief.golden.test.js`) with no second authorization field.
- SessionBrief now also supports one optional `toolboxTalk` enrichment object for startup summaries (no duplicated full payloads).
- Control Rod Mode v2 preserves the same three autonomy levels (`FULL_AUTO`, `SUPERVISED`, `HARD_STOP`) and upgrades HARD_STOP behavior with deterministic LOTO + Permit semantics.
- Permit gating applies only to HARD_STOP domains.
- No adaptive learning and no rod suggestions are implemented.
- Wave 4 Block B1 Change Order Engine baseline: implemented as formal live drift governance (`docs/specs/CHANGE_ORDER_ENGINE.md`, `src/ChangeOrderEngine.js`, `tests/golden/ChangeOrderEngine.golden.test.js`).
- Change Orders support deterministic `APPROVED`, `REJECTED`, and `DEFERRED` outcomes with deferred promotion through existing continuity paths.
- Wave 4 Block C1 Buddy System baseline: implemented as watcher-only live oversight (`docs/specs/BUDDY_SYSTEM.md`, `src/BuddySystem.js`, `tests/golden/BuddySystem.golden.test.js`).
- Buddy writes live callout events to existing Forensic Chain and does not build/fix/revert/suggest.
- Wave 3 Block C1 Foreman's Walk baseline: implemented as post-session verification runtime (docs/specs/FOREMANS_WALK_ENGINE.md, src/ForemansWalk.js, tests/golden/ForemansWalk.golden.test.js).
- Foreman's Walk v1 evaluates scope, constraint posture, completeness, truthfulness, and evidence integrity, then outputs findings plus As-Built accountability delta while SessionReceipt remains the session-of-record.
- Foreman's Walk v1 is post-session only and does not implement buddy behavior or live intervention.
- Wave 3 Block D1 integration proof is implemented (`tests/live/wave3.active-governance.live.test.js`) and validates clean bounded, governed intervention, and truthfulness/evidence-integrity paths.
- Wave 3 Block D2 closeout and front-door/index truth sync are implemented (`docs/WAVE3_CLOSEOUT.md`, `README.md`, `CLAUDE.md`, `REPO_INDEX.md`, `docs/INDEX.md`, `docs/indexes/WHERE_TO_CHANGE_X.md`).
- Wave 3 is shipped.
- Wave 4 is shipped: Blocks A1 + B1 + C1 + D1 + D2 are complete.
- Wave 4 Block D1 live integration proof is implemented (`tests/live/wave4.live-oversight.live.test.js`) and validates cross-system live oversight behavior.
- Wave 4 Block D2 closeout and front-door/index truth sync are implemented (`docs/WAVE4_CLOSEOUT.md`, `README.md`, `CLAUDE.md`, `REPO_INDEX.md`, `docs/INDEX.md`, `docs/indexes/WHERE_TO_CHANGE_X.md`).
- Wave 5 is one narrative wave executed as 5A / 5B.
- Wave 5A Block 0 docs-only truth/gate artifacts are implemented (`docs/specs/WAVE5_OPERATOR_PRODUCT.md`, `docs/WAVE5_BLOCK0_SUBSTRATE_GATE.md`).
- Wave 5A Block A baselines are implemented (`docs/specs/OPERATOR_TRUST_LEDGER.md`, `docs/specs/JOURNEYMAN_TRUST_ENGINE.md`, `src/OperatorTrustLedger.js`, `src/JourneymanTrustEngine.js`, `tests/golden/OperatorTrustLedger.golden.test.js`, `tests/golden/JourneymanTrustEngine.golden.test.js`).
- Operator Trust Ledger is approved on engineering merit and implemented as the Wave 5A Block A substrate baseline.
- Wave 5A Block B baseline is implemented (`docs/specs/WARRANTY_MONITOR.md`, `src/WarrantyMonitor.js`, `tests/golden/WarrantyMonitor.golden.test.js`).
- Warranty remains derived-first in Wave 5 and is implemented as derived-only monitoring in Block B.
- Wave 5A Block C baseline is implemented (`docs/specs/HOLD_ENGINE_SCARCITY_SIGNAL.md`, `src/HoldEngineScarcitySignal.js`, `tests/golden/HoldEngineScarcitySignal.golden.test.js`).
- HoldEngine Scarcity Signal remains additive direction and is implemented as derived-only enrichment in Block C.
- Wave 5B Block A baseline is implemented (`docs/specs/SESSION_LIFECYCLE_SKILLS.md`, `skills/toolbox-talk-SKILL.md`, `skills/receipt-SKILL.md`, `skills/as-built-SKILL.md`, `skills/walk-SKILL.md`, `src/SessionLifecycleSkills.js`, `tests/golden/SessionLifecycleSkills.golden.test.js`).
- Session Lifecycle skills are read/query/render-only surfaces over existing SessionBrief, SessionReceipt, and Foreman's Walk outputs.
- Wave 5B Block B baseline is implemented (`docs/specs/COMPRESSED_INTELLIGENCE_SKILLS.md`, `skills/phantoms-SKILL.md`, `skills/ufo-SKILL.md`, `skills/gaps-SKILL.md`, `src/CompressedIntelligenceSkills.js`, `tests/golden/CompressedIntelligenceSkills.golden.test.js`).
- Compressed Intelligence skills are read/query/render-only surfaces over existing Foreman's Walk truthfulness findings, Standing Risk unresolved/aging views, and Omission expected-signal-missing findings.
- Wave 5B Block C baseline is implemented (`docs/specs/COMPRESSED_HISTORY_TRUST_SKILLS.md`, `skills/chain-SKILL.md`, `skills/warranty-SKILL.md`, `skills/journeyman-SKILL.md`, `src/CompressedHistoryTrustSkills.js`, `tests/golden/CompressedHistoryTrustSkills.golden.test.js`).
- Wave 5B Block D baseline is implemented (`docs/specs/COMPRESSED_SAFETY_POSTURE_SKILLS.md`, `skills/constraints-SKILL.md`, `skills/silence-map-SKILL.md`, `src/CompressedSafetyPostureSkills.js`, `tests/golden/CompressedSafetyPostureSkills.golden.test.js`).
- Compressed Safety posture skills are read/query/render-only surfaces over existing ConstraintsRegistry truth, SafetyInterlocks truth, and ControlRodMode posture/status views; no standalone `/control-rods` skill is shipped.
- Compressed History & Trust skills are read/query/render-only surfaces over existing Forensic Chain history views, Warranty Monitor derived posture views, and persisted trust posture read paths.
- Wave 5 skill topology is locked at 28 skills across 7 groups.
- SessionBrief no-widening remains hard-locked; `journeymanLevel` is not introduced.
- Remaining Wave 5B runtime behavior outside Blocks A, B, C, and D is not implemented.
- Skills outside Session Lifecycle, Compressed Intelligence, Compressed History & Trust, and Compressed Safety posture, plus skins, onboarding, and package surfaces are not implemented yet.
- Wave 2 closeout evidence map exists at `docs/WAVE2_CLOSEOUT.md`; Architect final signoff is pending.
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
  - `docs/specs/OPEN_ITEMS_BOARD.md`
  - `docs/specs/FORENSIC_CHAIN.md`
  - `docs/specs/CONTROL_ROD_MODE.md`
  - `docs/specs/FOREMANS_WALK_ENGINE.md`
  - `docs/specs/WAVE5_OPERATOR_PRODUCT.md`
  - `docs/specs/OPERATOR_TRUST_LEDGER.md`
  - `docs/specs/JOURNEYMAN_TRUST_ENGINE.md`
  - `docs/specs/WARRANTY_MONITOR.md`
  - `docs/specs/HOLD_ENGINE_SCARCITY_SIGNAL.md`
  - `docs/specs/SESSION_LIFECYCLE_SKILLS.md`
  - `docs/specs/COMPRESSED_INTELLIGENCE_SKILLS.md`
  - `docs/specs/COMPRESSED_HISTORY_TRUST_SKILLS.md`
  - `docs/specs/COMPRESSED_SAFETY_POSTURE_SKILLS.md`
- Wave 5 Block 0 substrate-gate memo: `docs/WAVE5_BLOCK0_SUBSTRATE_GATE.md`

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
