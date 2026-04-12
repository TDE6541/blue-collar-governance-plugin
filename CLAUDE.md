# CLAUDE.md

## Repo Identity

This repository is the Blue Collar Governance Plugin runtime trust layer. It is a runtime control surface for non-technical AI operators and builders. Governed Workflow is the methodology spine behind the work, but this repository is not the governed-workflow repo.

## Session Posture

- Treat every substantive change as governed work.
- Plan before execution unless the Architect explicitly narrows the task to a trivial correction.
- Keep work within the approved wave scope and currently locked systems.
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

- Status: runtime trust layer; Waves 1-4 are shipped; Wave 5 is shipped through the current `/lockout` surface chain plus tranche 4 skins rendering for supported routes; hook/runtime Slice 2 compaction-survival + startup-reinjection spine is shipped; additive plugin artifact structure is now shipped locally; canonical onboarding/runtime-proof, plugin conversion proof, and Wave 5 closeout artifacts are shipped; Wave 5 closeout and MIGRATIONS.md entries are signed off (2026-04-03); Wave 6A Blocks 0, A, B, C, and D are shipped; Wave 6B Blocks 0, A, B, and C are shipped; Block F deny-pattern refinement and CC-native render wrapper are shipped; Block G governed-workflow portability proof is shipped; Block H FieldPoint external enforcement proof v2 is shipped; Wave 7A C1/C2/C3 seam closures are shipped; Wave 7B Work Order intake, scaffold, and posture surfaces are shipped as the only intake pilot; Wave 7 closeout and thesis rider are shipped; the hook runtime handles 24 lifecycle events (Phase 1, Phase 2, and Phase 3 Blocks A/B lifecycle expansion shipped; `WorktreeCreate` and `WorktreeRemove` remain pending), populates the forensic chain, and consults operator-authored permits for scoped HARD_STOP passage; `Elicitation` and `ElicitationResult` are observe-only MCP lifecycle surfaces with no accept/decline/cancel or response override behavior; the intake chain stops at reviewed artifacts only; `Setup` remains unclaimed; marketplace/package/install claims remain unverified
- Confidence Packet 4 temporal signals are shipped additively on `/confidence` through `MarkerTemporalSignalsEngine` with explicit timeline-only input and bounded temporal vocabulary.
- Confidence Packet 5 `/walk` confidence sidecar composition is shipped additively in `SessionLifecycleSkills.renderWalk(walkEvaluation, { confidenceSidecarView })`; sidecar v1 supports only `observedMarkers`, `requiredCoverage`, and `markerContinuity`; composition is informational-only; Foreman's Walk, persistence shapes, and hook-runtime behavior are unchanged; Packet 5 remains independent from Packet 4 temporal sidecar input; unsupported skin plus sidecar remains raw canonical `/walk` fallback; and the shipped wrapper/runtime path remains persisted-walk-only (no auto-supplied sidecar input).
- Confidence Packet 6 transition evidence is shipped additively through dedicated `/confidence-transitions` preview/explicit-append behavior backed by `ConfidenceTransitionGenerator` and `ConfidenceTransitionsSkill`; generated entries stay neutral `FINDING` evidence only, `/confidence` remains read/query/render-only, and no resolution semantics or `ForensicChain` contract widening ship.
- Confidence Packet 7A advisory presence awareness is shipped additively through `ConfidenceAdvisor` and `PreToolUse` SUPERVISED-only message composition on the existing `permissionDecisionReason` string; advisory reads one current on-disk file only, fires only for slash-family `HOLD` / `KILL`, remains silent on deny / `FULL_AUTO` / permitted `HARD_STOP` / unclassified paths, and introduces no `/confidence`, chain, or host-schema widening.
- Git: initialized on `main`, Wave 0 bootstrap committed, `origin` remote configured
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
- Wave 5B Block A baseline is implemented (`docs/specs/SESSION_LIFECYCLE_SKILLS.md`, `skills/toolbox-talk/SKILL.md`, `skills/receipt/SKILL.md`, `skills/as-built/SKILL.md`, `skills/walk/SKILL.md`, `src/SessionLifecycleSkills.js`, `tests/golden/SessionLifecycleSkills.golden.test.js`).
- Session Lifecycle skills are read/query/render-only surfaces over existing SessionBrief, SessionReceipt, and Foreman's Walk outputs.
- Wave 5B Block B baseline is implemented (`docs/specs/COMPRESSED_INTELLIGENCE_SKILLS.md`, `skills/phantoms/SKILL.md`, `skills/ufo/SKILL.md`, `skills/gaps/SKILL.md`, `src/CompressedIntelligenceSkills.js`, `tests/golden/CompressedIntelligenceSkills.golden.test.js`).
- Compressed Intelligence skills are read/query/render-only surfaces over existing Foreman's Walk truthfulness findings, Standing Risk unresolved/aging views, and Omission expected-signal-missing findings.
- Wave 5B Block C baseline is implemented (`docs/specs/COMPRESSED_HISTORY_TRUST_SKILLS.md`, `skills/chain/SKILL.md`, `skills/warranty/SKILL.md`, `skills/journeyman/SKILL.md`, `src/CompressedHistoryTrustSkills.js`, `tests/golden/CompressedHistoryTrustSkills.golden.test.js`).
- Wave 5B Block D baseline is implemented (`docs/specs/COMPRESSED_SAFETY_POSTURE_SKILLS.md`, `skills/constraints/SKILL.md`, `skills/silence-map/SKILL.md`, `src/CompressedSafetyPostureSkills.js`, `tests/golden/CompressedSafetyPostureSkills.golden.test.js`).
- Compressed Safety posture skills are read/query/render-only surfaces over existing ConstraintsRegistry truth, SafetyInterlocks truth, and ControlRodMode posture/status views; no standalone `/control-rods` skill is shipped in Block D.
- Wave 5B Block E1 baseline is implemented (`docs/specs/COMPRESSED_GOVERNANCE_HEALTH_SKILLS.md`, `skills/prevention-record/SKILL.md`, `skills/rights/SKILL.md`, `src/CompressedGovernanceHealthSkills.js`, `tests/golden/CompressedGovernanceHealthSkills.golden.test.js`).
- A Wave 5B read-only `/control-rods` posture slice is implemented (`docs/specs/CONTROL_ROD_POSTURE_SKILL.md`, `skills/control-rods/SKILL.md`, `src/ControlRodPostureSkill.js`, `tests/golden/ControlRodPostureSkill.golden.test.js`).
- A Wave 5B read-only `/fire-break` audit slice is implemented (`docs/specs/FIRE_BREAK_SKILL.md`, `skills/fire-break/SKILL.md`, `src/FireBreakSkill.js`, `tests/golden/FireBreakSkill.golden.test.js`).
- A Wave 5B read-only `/census` repo snapshot slice is implemented (`docs/specs/CENSUS_SKILL.md`, `skills/census/SKILL.md`, `src/CensusSkill.js`, `tests/golden/CensusSkill.golden.test.js`).
- A Wave 5B read-only `/diagnose` evidence-view slice is implemented (`docs/specs/DIAGNOSE_SKILL.md`, `skills/diagnose/SKILL.md`, `src/DiagnoseSkill.js`, `tests/golden/DiagnoseSkill.golden.test.js`).
- A Wave 5B read-only `/keystone` decision-support slice is implemented (`docs/specs/KEYSTONE_SKILL.md`, `skills/keystone/SKILL.md`, `src/KeystoneSkill.js`, `tests/golden/KeystoneSkill.golden.test.js`).
- A Wave 5B read-only `/eliminate` hold-options slice is implemented (`docs/specs/ELIMINATE_SKILL.md`, `skills/eliminate/SKILL.md`, `src/EliminateSkill.js`, `tests/golden/EliminateSkill.golden.test.js`).
- A Wave 5B read-only `/buddy-status` watcher-state slice is implemented (`docs/specs/BUDDY_STATUS_SKILL.md`, `skills/buddy-status/SKILL.md`, `src/BuddyStatusSkill.js`, `tests/golden/BuddyStatusSkill.golden.test.js`).
- A Wave 5B read-only `/change-order` status slice is implemented (`docs/specs/CHANGE_ORDER_SKILL.md`, `skills/change-order/SKILL.md`, `src/ChangeOrderSkill.js`, `tests/golden/ChangeOrderSkill.golden.test.js`).
- A Wave 5B read-only `/callout` callout-detail slice is implemented (`docs/specs/CALLOUT_SKILL.md`, `skills/callout/SKILL.md`, `src/CalloutSkill.js`, `tests/golden/CalloutSkill.golden.test.js`).
- A Wave 5B `/red-tag` interlock decision surface is implemented (`docs/specs/RED_TAG_SKILL.md`, `skills/red-tag/SKILL.md`, `src/RedTagSkill.js`, `tests/golden/RedTagSkill.golden.test.js`).
- A Wave 5B `/permit` gate decision surface is implemented (`docs/specs/PERMIT_SKILL.md`, `skills/permit/SKILL.md`, `src/PermitSkill.js`, `tests/golden/PermitSkill.golden.test.js`).
- A Wave 5B `/lockout` LOTO validation surface is implemented (`docs/specs/LOCKOUT_SKILL.md`, `skills/lockout/SKILL.md`, `src/LockoutSkill.js`, `tests/golden/LockoutSkill.golden.test.js`).
- Wave 5 skins tranche 4 is implemented (`docs/specs/SKIN_FRAMEWORK.md`, `src/SkinFramework.js`, `tests/golden/SkinFramework.golden.test.js`).
- Whiteboard and Punch List support `/toolbox-talk`, `/receipt`, `/as-built`, and `/walk`; Inspection Report supports `/receipt`, `/as-built`, and `/walk`; Work Order supports `/toolbox-talk`, `/receipt`, and `/as-built`; Dispatch Board supports `/walk`, `/phantoms`, `/change-order`, and `/control-rods`; Ticket System supports `/receipt`, `/walk`, `/phantoms`, and `/change-order`; Daily Log supports `/toolbox-talk`, `/receipt`, `/as-built`, and `/walk`; Repair Order supports `/receipt` and `/as-built`; Kitchen Ticket supports `/walk`, `/phantoms`, and `/change-order`; Farm Ledger supports `/toolbox-talk`, `/receipt`, `/as-built`, `/walk`, and `/change-order`; Safety / LOTO Log supports `/permit` and `/lockout`; unsupported combinations fail closed to raw canonical render.
- Wave 5 hook/runtime Slice 2 enforcement spine is implemented at `.claude/settings.json`, `.claude/hooks/run-governance-hook.js`, `src/HookRuntime.js`, `src/HookRuntimeSlice2.js`, `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md`, `tests/golden/HookRuntime.golden.test.js`, and `tests/live/wave5.hook-runtime.live.test.js`.
- Slice 2 keeps fail-closed command hooks over `Bash`, `Write`, and `Edit`, and adds bounded `SessionStart` re-injection plus `PreCompact` preservation for compaction survival while retaining the session-local `Stop`/`ForemansWalk` gate.
- Packet 7A keeps that hook/runtime spine bounded: advisory awareness is presence-only, on-disk-only, `PreToolUse`-only, `SUPERVISED`-only, and uses the existing `permissionDecisionReason` path only.
- Additive plugin conversion structure is implemented at `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/run-governance-hook.js`, and `skills/<name>/SKILL.md`.
- Project `.claude/settings.json` remains the standalone compatibility path and the current `permissions.deny` delivery surface.
- Standalone and plugin hook registration should be treated as alternate modes until simultaneous loading is explicitly proven.
- Compressed Governance Health skills are read/query/render-only surfaces where `/prevention-record` renders explicit captured governance signals and `/rights` renders a static manual declaration.
- Compressed History & Trust skills are read/query/render-only surfaces over existing Forensic Chain history views, Warranty Monitor derived posture views, and persisted trust posture read paths.
- Skill topology is now 35 skills (26 from Wave 5 + `/loto-clearance`, `/issue-permit`, `/work-order-intake`, `/work-order-scaffold`, `/work-order-posture`, `/resolve`, `/restoration`, `/confidence`, and `/confidence-transitions`).
- SessionBrief no-widening remains hard-locked; `journeymanLevel` is not introduced.
- Shipped now: the current Wave 5 operator/action surface chain runs through `/lockout`, and shipped skill tranches remain deterministic route adapters over existing engine truth.
- Later / not yet shipped: additional Wave 5 work outside the current shipped set, including later skins beyond tranche 4 and later proof/integration work, remains pending. Hook/runtime slices through Wave 6A (Slice 3 + Blocks B/C/D) and Wave 6B (Block A InstructionsLoaded) are now shipped.
- Wave 7 umbrella truth is implemented at `docs/specs/WAVE7_TRUTH_LOCK.md`.
- C1 `/walk` persistence seam is closed: hook runtime persists `persistedBrief`, `persistedReceipt`, and `lastWalk`, and `/walk` now renders from persisted state alone.
- C2 `/fire-break` persistence seam is closed through persisted `lastFireBreak`, a hook-derived governance-health snapshot that is route-compatible for `/fire-break`; canonical Open Items Board engine inputs remain outside current hook-runtime scope.
- C3 plugin-native foreign-repo deny delivery is closed: foreign repos can now receive plugin-governed deny posture through a plugin-owned, operator-invoked apply path that is deterministic and reviewable, not runtime auto-injection, and not a universal compatibility claim.
- Work Order is the only intake pilot for Wave 7. The existing Work Order skin/render surface still exists unchanged, the Work Order intake pilot surface is shipped at `docs/specs/WORK_ORDER_INTAKE.md`, `src/WorkOrderIntakeEngine.js`, and `skills/work-order-intake/SKILL.md`, the Work Order scaffold generation surface is shipped at `docs/specs/WORK_ORDER_SCAFFOLD.md`, `src/WorkOrderScaffoldEngine.js`, and `skills/work-order-scaffold/SKILL.md`, and the Work Order posture surface is shipped at `docs/specs/WORK_ORDER_POSTURE.md`, `src/WorkOrderPostureEngine.js`, and `skills/work-order-posture/SKILL.md`.
- Blocks D, E, F, and G are shipped. The chain stops at reviewed artifacts only: intake object, scaffold object, and posture map. No protection-default bridge, SessionBrief bridge, hook-runtime integration, or execution path from intake/scaffold/posture is shipped.
- Parked/out of scope in Wave 7: package/install, marketplace, Agent governance, multi-agent governance, trust-transfer/certificate work, second intake skin, and future-gated Anthropic work.
- B' Phase 1 restoration lane is shipped: `RestorationEngine`, `RestorationProjectionAdapter`, `/resolve`, and `/restoration` are implemented (`docs/specs/B_PRIME_RESTORATION_PHASE1_TRUTH_LOCK.md`, `docs/specs/RESTORATION_ENGINE.md`, `docs/specs/RESOLVE_SKILL.md`, `docs/specs/RESTORATION_SKILL.md`).
- Restoration verification states are exactly `UNVERIFIED` and `VERIFIED`; `PARTIAL` is deferred. Board projection is continuity-linked and verified-only, and manual-only/walk-only restored items stay visible on `/restoration` without entering Board projection unless continuity-linked and verified.
- B' Phase 1 remained bounded: no shared-contract widening, no `MIGRATIONS.md` change, no new lifecycle handlers, no new hook enforcement patterns, no Walk Pass 6, no OWASP edits, and no package/install/marketplace claim widening.
- B' finish-lane closeout artifact: `docs/B_PRIME_RESTORATION_PHASE1_CLOSEOUT.md`.
- Confidence Gradient Phase 1 is shipped: `ConfidenceGradientEngine` and `/confidence` are implemented (`docs/specs/CONFIDENCE_GRADIENT_ENGINE.md`, `docs/specs/CONFIDENCE_SKILL.md`, `skills/confidence/SKILL.md`).
- Confidence Gradient Phase 1 is bounded: slash-family markers only (`///`, `////`, `/////`, `//////`), semicolon-family remains reserved, scanner is deterministic/stateless over explicit file snapshots, and `/confidence` is read/query/render-only.
- Confidence Packet 3 marker continuity is shipped as an additive lane: explicit snapshot capture via `ConfidenceGradientEngine.buildSnapshot(files)`, deterministic file-local comparison via `MarkerContinuityEngine.compare(previousSnapshot, currentSnapshot)`, and optional `/confidence` composition via `markerContinuityView`.
- Confidence Packet 3 remains bounded: ambiguity is preserved (`AMBIGUOUS`), `scan(files)` meaning is unchanged, and no rename-aware or cross-file continuity is shipped.
- Confidence Packet 4 temporal signals are shipped as an additive lane: explicit dated timeline evaluation via `MarkerTemporalSignalsEngine.evaluateTimeline(timelineEntries, options)` and optional `/confidence` composition via `markerTemporalSignalsView`.
- Confidence Packet 4 remains bounded: temporal interpretation depends on explicit dated timeline input only (no git/filesystem/session/branch-derived time inference), ships only `STALE_HOLD` and `UNRESOLVED_KILL` plus deterministic timeline/lineage errors, preserves ambiguity (`TEMPORAL_LINEAGE_AMBIGUOUS`), and keeps slash-only confidence-local posture.
- Confidence Packet 4 does not age Packet 2 required coverage, does not widen `StandingRiskEngine`/`ForensicChain`/`ForemansWalk`/hook-lifecycle behavior, does not claim rename-aware or cross-file temporal continuity, and does not ship resolution/standing-risk/score/priority/health semantics.
- Confidence Required Coverage (Packet 2) is shipped as an explicit opt-in additive layer (`docs/specs/CONFIDENCE_REQUIRED_COVERAGE.md`) with repo-root policy file `confidence-required-coverage.json` and file-first exact-path targets.
- Confidence Required Coverage remains bounded: no hook/lifecycle/omission/temporal integration, no reviewed-clean semantics, and no package/install/marketplace claim widening.
- Confidence Packet 3 does not depend on Packet 2 required-coverage policy to function.
- Confidence Phase 1 scan fence is exactly `src/`, `hooks/`, `scripts/`, `.claude/`, `*.js`; current repo scan posture is zero line-leading slash markers, so the real repo scan returns an empty report in current state.
- Confidence finish-lane closeout artifact: `docs/CONFIDENCE_GRADIENT_PHASE1_CLOSEOUT.md`.
- Confidence Packet 3 closeout artifact: `docs/PACKET3_MARKER_CONTINUITY_CLOSEOUT.md`.
- Confidence Packet 4 closeout artifact: `docs/PACKET4_TEMPORAL_SIGNALS_CLOSEOUT.md`.
- Confidence Packet 5 closeout artifact: `docs/PACKET5_WALK_COMPOSITION_CLOSEOUT.md`.
- Confidence Packet 6 transition evidence is shipped as a dedicated authoring lane: `ConfidenceTransitionGenerator.generateConfidenceTransitionEntries(input)` maps explicit Packet 3 compare truth into append-ready neutral `FINDING` entries, and `ConfidenceTransitionsSkill.renderConfidenceTransitions(input)` provides `/confidence-transitions` preview or explicit append through existing `ForensicChain.appendEntry(...)`.
- Confidence Packet 6 remains bounded: transition classes are limited to `NEWLY_OBSERVED`, `NO_LONGER_OBSERVED`, and `RETIERED`; `/confidence` remains read/query/render-only; no resolution/restoration semantics, no new `ForensicChain` entry types, no linked history traversal, and no shared-contract widening ship.
- Confidence Packet 6 closeout artifact: `docs/PACKET6_TRANSITION_EVIDENCE_CLOSEOUT.md`.
- Confidence Packet 7A advisory presence awareness is shipped as a bounded hook-runtime lane: `ConfidenceAdvisor.buildConfidenceAdvisory(filePath)` reads one existing on-disk file, and `src/HookRuntime.js` may append advisory text only on `PreToolUse` SUPERVISED `Write` / `Edit` asks through the existing `permissionDecisionReason` string.
- Confidence Packet 7A remains bounded: only slash-family `HOLD` / `KILL` markers trigger advisory; missing/unreadable/out-of-fence files and `WATCH` / `GAP` remain silent; deny / `FULL_AUTO` / permitted `HARD_STOP` / unclassified paths remain silent; advisory failure is locally swallowed; and no shared-contract widening ships.
- Confidence Packet 7A closeout artifact: `docs/PACKET7A_ADVISORY_PRESENCE_CLOSEOUT.md`.
- Wave 2 closeout evidence map exists at `docs/WAVE2_CLOSEOUT.md`; Architect signed off 2026-04-03.
- `package.json` is absent; local plugin artifact structure is shipped, but package metadata, marketplace installation, and publishing surfaces are not implemented.
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
  - `docs/specs/WAVE7_TRUTH_LOCK.md`
  - `docs/specs/WORK_ORDER_INTAKE.md`
  - `docs/specs/WORK_ORDER_SCAFFOLD.md`
  - `docs/specs/WORK_ORDER_POSTURE.md`
  - `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md`
  - `docs/specs/PACKET7A_ADVISORY_PRESENCE_TRUTH_LOCK.md`
  - `docs/specs/HOOK_CONFIDENCE_ADVISOR.md`
  - `docs/specs/SKIN_FRAMEWORK.md`
  - `docs/specs/OPERATOR_TRUST_LEDGER.md`
  - `docs/specs/JOURNEYMAN_TRUST_ENGINE.md`
  - `docs/specs/WARRANTY_MONITOR.md`
  - `docs/specs/HOLD_ENGINE_SCARCITY_SIGNAL.md`
  - `docs/specs/SESSION_LIFECYCLE_SKILLS.md`
  - `docs/specs/COMPRESSED_INTELLIGENCE_SKILLS.md`
  - `docs/specs/COMPRESSED_HISTORY_TRUST_SKILLS.md`
  - `docs/specs/COMPRESSED_SAFETY_POSTURE_SKILLS.md`
  - `docs/specs/COMPRESSED_GOVERNANCE_HEALTH_SKILLS.md`
  - `docs/specs/CONTROL_ROD_POSTURE_SKILL.md`
  - `docs/specs/FIRE_BREAK_SKILL.md`
  - `docs/specs/CENSUS_SKILL.md`
  - `docs/specs/DIAGNOSE_SKILL.md`
  - `docs/specs/KEYSTONE_SKILL.md`
  - `docs/specs/ELIMINATE_SKILL.md`
  - `docs/specs/BUDDY_STATUS_SKILL.md`
  - `docs/specs/CHANGE_ORDER_SKILL.md`
  - `docs/specs/CALLOUT_SKILL.md`
  - `docs/specs/RED_TAG_SKILL.md`
  - `docs/specs/PERMIT_SKILL.md`
  - `docs/specs/LOCKOUT_SKILL.md`
  - `docs/specs/LOTO_CLEARANCE_SKILL.md`
  - `docs/specs/PERMIT_ISSUANCE_SKILL.md`
- Wave 5 Block 0 substrate-gate memo: `docs/WAVE5_BLOCK0_SUBSTRATE_GATE.md`
- Wave 5 onboarding/runtime-proof artifact: `docs/WAVE5_ONBOARDING_RUNTIME_PROOF.md`
- Phase 3 lifecycle expansion closeout: `docs/PHASE3_LIFECYCLE_EXPANSION_CLOSEOUT.md`
- Phase 3 structural seams closeout (historical lane record): `docs/PHASE3_REMAINING_LIFECYCLE_SEAMS_CLOSEOUT.md`
- Phase 2 lifecycle expansion closeout (historical): `docs/PHASE2_LIFECYCLE_EXPANSION_CLOSEOUT.md`
- Phase 1 lifecycle expansion closeout (historical): `docs/PHASE1_LIFECYCLE_EXPANSION_CLOSEOUT.md`
- Plugin conversion proof artifact: `docs/PLUGIN_CONVERSION_PROOF.md`
- Wave 5 closeout evidence map: `docs/WAVE5_CLOSEOUT.md`
- Wave 6 closeout evidence map: `docs/WAVE6_CLOSEOUT.md`
- Wave 6 proof pack: `docs/WAVE6_PROOF_PACK.md`
- Wave 7 closeout evidence map: `docs/WAVE7_CLOSEOUT.md`
- Blue Collar Coding thesis rider: `docs/BLUE_COLLAR_CODING_THESIS.md`
- CC-native render wrapper: `scripts/render-skill.js`
- Wave 6A Block A fail-closed hook hardening is governed by the additive Slice 3 section in `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md`.
- Wave 6A Block B enforcement matrix is governed by the additive Block B section in `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md`.
- Block B adds ConfigChange, CwdChanged, and FileChanged handlers as observational (non-blocking) event handlers with fail-closed advisory behavior.
- Wave 6A Block C live chain population is governed by the additive Block C section in `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md`.
- Block C adds PostToolUse and PostToolUseFailure handlers and wires chain writes into blocked actions, ConfigChange, and FileChanged paths.
- Chain entries use persisted monotonic counter IDs and survive compaction. Chain entries persist independently from Walk evaluation (self-standing evidence, not claim-linked).
- TaskCreated and TaskCompleted are consciously deferred from chain writes as a noise-reduction decision.
- Wave 6A Block D permit/lockout runtime closure is governed by the additive Block D section in `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md`.
- Block D wires ControlRodMode.evaluateHardStopGate into PreToolUse and PermissionRequest HARD_STOP paths. Operator-authored permits stored in session state allow scoped passage. Permitted actions write OPERATOR_ACTION chain entries.
- Runtime consumption of permit/authorization state is shipped. Operator-facing authoring surfaces are shipped: `/loto-clearance` (create + revoke LOTO clearance) and `/issue-permit` (create + revoke permits). Internal paths use `LotoClearance` and `PermitIssuance` to avoid `*auth*` deny-pattern collision.
- Deny-pattern refinement (narrowing `*auth*` to exclude governance infrastructure) is deferred as a future HOLD.
- `/permit` and `/lockout` skills remain read/query/render-only evaluation and validation surfaces.
- Config-mutation detection via ConfigChange is shipped.
- Instruction-load observability via InstructionsLoaded is shipped (Wave 6B Block A). Records which instruction files were loaded, when, and by what trigger. Does not hash or compare file contents — content-level integrity detection is not shipped.
- Wave 6A does not introduce new skills, skins, engines, or contract widening.
- Conservative control-rod profile posture is 5 HARD_STOP / 4 SUPERVISED / 1 FULL_AUTO (10 baseline domains).

## Canon And Reference Boundary

- Canon surfaces are the root governance files and promoted docs under `docs/specs/`.
- `raw/governed-workflow/` contains governed-workflow source docs and skills as reference inputs only.
- `raw/starters/` contains starter/template source material only.
- Reference inputs do not override canon and do not create runtime claims by themselves.
- `docs/OWASP_AGENTIC_MAPPING.md` is a public reviewer-facing OWASP positioning/proof artifact; it is not a runtime contract baseline and does not widen package/install/marketplace claims.

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
