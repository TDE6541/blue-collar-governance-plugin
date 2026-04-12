# Blue Collar Governance Plugin

A Claude Code plugin that enforces governance rules through deterministic local hooks — not just prompt instructions.

> [!WARNING]
> 🚧 Active Construction: This repository is currently being worked on.

## What This Does

This plugin adds a runtime governance layer to Claude Code sessions:

- **Fail-closed command hooks** over `Bash`, `Write`, and `Edit` — dangerous actions are blocked before execution, not after
- **Control rod profiles** that classify every tool action against configurable domain rules (pricing, customer data, auth, destructive ops, and more)
- **Session closeout gating** — the session cannot close cleanly if unresolved blocking findings exist
- **Governance state preservation** — enforcement state survives context compaction and session restarts
- **Operator-facing skills** for inspecting governance posture, forensic history, safety interlocks, session health, and the Work Order intake pilot chain during a live session

## Why This Exists

Prompt-based instructions alone do not reliably prevent dangerous actions at the moment a tool runs. They can be compacted away, ignored under pressure, or simply not loaded.

This plugin exists to make the load-bearing governance seams deterministic and local:

- A hook that runs real code before every `Bash`, `Write`, or `Edit` call
- Classification logic that maps tool actions to protected domains
- Deny decisions that fire before the tool executes, not after
- State that persists through compaction so enforcement doesn't silently disappear mid-session

## How It Works

The plugin registers hooks for twenty-four Claude Code lifecycle events:

| Event | What happens |
|-------|-------------|
| **SessionStart** | Injects governance context; rehydrates state after compaction |
| **UserPromptSubmit** | Blocks prompts containing exact disallowed governance-bypass phrases |
| **PreCompact** | Preserves governance state before context compaction |
| **PostCompact** | Verifies governance state survived compaction; advisory only, no gating |
| **PreToolUse** | Classifies the tool action; denies HARD_STOP domains; asks on SUPERVISED; appends on-disk HOLD/KILL advisory only on the existing SUPERVISED message path |
| **PermissionRequest** | Resolves permission dialogs against the active control rod profile |
| **PermissionDenied** | Records denied tool actions for governed domains to the forensic chain |
| **PostToolUse** | Records completed tool actions on classified domains to the forensic chain |
| **PostToolUseFailure** | Records failed tool actions on classified domains to the forensic chain |
| **Notification** | Records notification events for governance observability |
| **SubagentStart** | Records subagent start; maintains bounded active-subagent state |
| **SubagentStop** | Bounded Mini-Walk gate; blocks if unresolved governance findings exist |
| **TaskCreated** | Tracks a bounded session-local task registry keyed by `task_id` |
| **TaskCompleted** | Observes completion against that registry; writes bounded additive evidence for matched, mismatch, or orphan completion |
| **Stop** | Evaluates a Foreman's Walk; blocks closeout if blocking findings exist |
| **StopFailure** | Records stop-failure error type and details to the forensic chain |
| **TeammateIdle** | Observe-only idle signal; writes additive evidence only when related open tasks remain |
| **SessionEnd** | Records session-end reason; clears active-subagent state |
| **Elicitation** | Records bounded observe-only MCP input requests; no response control or raw payload dump |
| **ElicitationResult** | Records bounded observe-only MCP input results; no response override or behavioral mutation |
| **ConfigChange** | Blocks governed config sources; observes policy_settings and unknown sources |
| **CwdChanged** | Records working-directory changes; notes when outside project root |
| **FileChanged** | Detects external changes to governance-relevant files; records to forensic chain |
| **InstructionsLoaded** | Records instruction-file load events for governance-layer presence observability |

Every hook path fails closed on internal error — a crash produces a deny/block decision, never a silent pass-through.

### Control Rod Profiles

The plugin ships three starter profiles that define autonomy levels per domain:

| Profile | HARD_STOP domains | SUPERVISED domains | FULL_AUTO domains |
|---------|-------------------|--------------------|-------------------|
| **conservative** | 5 (pricing, customer data, schema, auth, destructive ops) | 4 (existing files, new files, UI/styling, tests) | 1 (documentation) |
| **balanced** | 4 | 2 | 4 |
| **velocity** | 2 | 3 | 5 |

Custom profiles are supported through the same domain-rule structure.

## How to Use It

### Plugin Mode

Load the repo as a local Claude Code plugin:

```bash
claude --plugin-dir /path/to/blue-collar-governance-plugin
```

This registers the hooks and makes the shipped skills available as `/blue-collar-governance-plugin:<skill-name>`.

### Standalone Repo Mode

The plugin also works as a standalone project-local governance layer through:

- `.claude/settings.json` — hook registration and deny rules
- `.claude/hooks/run-governance-hook.js` — hook entrypoint

### Mode Boundary

Plugin mode and standalone mode are alternate loading paths. Do not run both simultaneously in the same session unless you have explicitly verified that combination — duplicate hook execution is possible.

### Configuration

The active profile and matched tools are configured in `.claude/settings.json`:

```json
{
  "blueCollarGovernance": {
    "hookRuntime": {
      "profileId": "conservative",
      "matchedTools": ["Bash", "Write", "Edit"],
      "stateDirectory": ".claude/runtime",
      "blockingSeverities": ["CRITICAL", "HIGH"]
    }
  }
}
```

## What Ships Today

- Claude plugin manifest at `.claude-plugin/plugin.json`
- Plugin hook registry at `hooks/hooks.json`
- Fail-closed hook runtime at `src/HookRuntime.js` and `src/HookRuntimeSlice2.js`
- 35 operator-facing skills under `skills/<name>/SKILL.md`
- Work Order pilot chain surfaces at `/work-order-intake`, `/work-order-scaffold`, and `/work-order-posture`
- B' Phase 1 restoration surfaces at `/resolve` and `/restoration`, backed by `RestorationEngine` and `RestorationProjectionAdapter`
- Confidence Gradient Packet 4 surfaces at `/confidence`, backed by `ConfidenceGradientEngine`, `MarkerContinuityEngine`, `MarkerTemporalSignalsEngine`, and `ConfidenceSkill`
- Confidence Transition Evidence at `/confidence-transitions`, backed by `ConfidenceTransitionGenerator` and `ConfidenceTransitionsSkill`
- Packet 7A advisory presence awareness in `PreToolUse` SUPERVISED asks only, backed by `ConfidenceAdvisor`
- Standalone compatibility path at `.claude/settings.json`
- Runtime governance modules under `src/`, including engines, skill surfaces, and hook adapters
- Golden and live verification under `tests/`
- CC-native render wrapper at `scripts/render-skill.js`

## Work Order Pilot Chain

- Governance remains the engine underneath the pilot chain. Wave 7 closes C1 `/walk`, C2 `/fire-break`, and C3 foreign-repo deny delivery without changing the repo's governance-first identity.
- Work Order is the only intake pilot shipped in this repo. The existing Work Order skin/render surface still exists unchanged.
- `/work-order-intake`, `/work-order-scaffold`, and `/work-order-posture` are shipped.
- The chain stops at reviewed artifacts only: intake object, scaffold object, and posture map.
- No SessionBrief bridge, hook-runtime integration, or execution path from intake/scaffold/posture is shipped.

## B' Restoration Phase 1

- B' Phase 1 ships `RestorationEngine`, `RestorationProjectionAdapter`, `/resolve`, and `/restoration`.
- Verification states are exactly `UNVERIFIED` and `VERIFIED`; `PARTIAL` remains deferred.
- Board projection is continuity-linked and verified-only.
- Manual-only and walk-only restored items stay visible on `/restoration` and do not enter Board projection unless continuity-linked and verified.
- No shared contract widening ships in Phase 1; `MIGRATIONS.md` remains unchanged.

## Confidence Gradient Phase 1 + Packets 2/3/4

- Confidence Gradient Phase 1 ships `ConfidenceGradientEngine` and `/confidence`.
- Confidence Required Coverage (Packet 2) is explicit opt-in and additive over observed marker truth.
- Packet 3 ships additive snapshot capture via `ConfidenceGradientEngine.buildSnapshot(files)` and deterministic file-local comparison via `MarkerContinuityEngine.compare(previousSnapshot, currentSnapshot)`.
- Packet 4 ships additive temporal interpretation via `MarkerTemporalSignalsEngine.evaluateTimeline(timelineEntries, options)` and optional `/confidence` composition via `markerTemporalSignalsView`.
- `/confidence` single-scan behavior remains unchanged when optional Packet 2/3/4 inputs are not supplied.
- `/confidence` Packet 3 comparison behavior remains unchanged when only comparison input is supplied.
- Packet 3 preserves explicit ambiguity by emitting `AMBIGUOUS` when candidate sets remain non-unique.
- Packet 4 preserves explicit temporal ambiguity by emitting `TEMPORAL_LINEAGE_AMBIGUOUS` instead of forcing stronger claims.
- Shipped marker family is slash only; semicolon family is reserved and not executable in Phase 1.
- Tier ladder is fixed to `WATCH (///)`, `GAP (////)`, `HOLD (/////)`, and `KILL (//////)`.
- Scanning is deterministic and stateless over explicit file snapshots only.
- Scan fence is bounded to `src/`, `hooks/`, `scripts/`, `.claude/`, and `*.js`.
- Parsing is line-leading only with structural delimiter rules.
- `/confidence` is read/query/render-only with no mutation path.
- Packet 3 remains file-local and slash-only; no rename-aware or cross-file continuity claim is shipped.
- Packet 4 temporal interpretation uses explicit dated timeline input only and does not infer time from git, filesystem metadata, branch age, session date, or closeout date.
- Packet 4 ships only bounded temporal findings `STALE_HOLD` and `UNRESOLVED_KILL` plus deterministic timeline/lineage errors.
- Packet 3 and Packet 4 do not widen `ContinuityLedger`, `StandingRiskEngine`, `ForensicChain`, `ForemansWalk`, or hook/lifecycle behavior.
- Packet 4 does not age Packet 2 required-coverage misses.
- Packet 4 does not ship resolution semantics, standing-risk semantics, scores, priorities, or health math.
- Required coverage policy file is repo-root `confidence-required-coverage.json`.
- Required coverage policy targets are file-first exact-path entries only.
- `/confidence` may compose required coverage findings additively while keeping observed marker truth separate.
- Packet 3 does not depend on Packet 2 required coverage policy to function.
- Packet 2 introduces no reviewed-clean semantics.
- No shared contract widening ships in Phase 1; `MIGRATIONS.md` remains unchanged.
- Hook/lifecycle/omission/chain/board integration and semicolon-family execution remain outside Phase 1.
- Packet 2 introduces no package/install/marketplace claims.
- The current repo has zero line-leading slash markers in the Phase 1 scan fence, so the real repo scan currently returns an empty report.

## Packet 5 `/walk` Confidence Sidecar Composition

- `/walk` may compose one optional precomputed `confidenceSidecarView` at render time.
- Packet 5 sidecar v1 supports only `observedMarkers`, `requiredCoverage`, and `markerContinuity`.
- The sidecar is informational only and does not change walk findings, severity, blocking posture, clean-closeout posture, `sessionOfRecordRef`, or `asBuiltStatusCounts`.
- Foreman's Walk remains unchanged and no Walk Pass 6 is shipped.
- Packet 5 sidecar composition remains independent from Packet 4 temporal signals.
- The shipped `scripts/render-skill.js walk` wrapper/runtime path remains persisted-walk-only in Packet 5 and does not discover or compute sidecar input.
- No persistence widening, hook-runtime widening, chain/board/standing-risk integration, or skin translation wave is introduced by Packet 5.
- Unsupported skin + sidecar requests remain on raw canonical `/walk` fallback behavior.

## Packet 6 Confidence Transition Evidence

- Packet 6 ships `ConfidenceTransitionGenerator.generateConfidenceTransitionEntries(input)` and dedicated `/confidence-transitions` rendering via `ConfidenceTransitionsSkill.renderConfidenceTransitions(input)`.
- `skills/confidence-transitions/SKILL.md` is the operator-facing skill, and golden proof lives at `tests/golden/ConfidenceTransitionGenerator.golden.test.js` and `tests/golden/ConfidenceTransitionsSkill.golden.test.js`.
- Packet 6 maps explicit Packet 3 compare truth into neutral append-ready `FINDING` entries for only `NEWLY_OBSERVED`, `NO_LONGER_OBSERVED`, and `RETIERED`.
- `/confidence-transitions` previews by default and appends only when the operator explicitly requests append through existing `ForensicChain.appendEntry(...)`.
- `/confidence` remains read/query/render-only; Packet 6 adds no `/confidence` append behavior.
- Packet 6 introduces no resolution semantics, no `RESOLVED`, no restoration crossover, no new `ForensicChain` entry types, and no linked history traversal.
- Packet 6 truth lock lives at `docs/specs/PACKET6_TRANSITION_EVIDENCE_TRUTH_LOCK.md`, the skill spec lives at `docs/specs/CONFIDENCE_TRANSITIONS_SKILL.md`, and the closeout lives at `docs/PACKET6_TRANSITION_EVIDENCE_CLOSEOUT.md`.
- No shared contract widening ships in Packet 6; `MIGRATIONS.md` remains unchanged.

## Packet 7A Advisory Presence Awareness

- Packet 7A ships `ConfidenceAdvisor.buildConfidenceAdvisory(filePath)` and `PreToolUse` SUPERVISED-only advisory composition through the existing `permissionDecisionReason` string.
- Advisory reads only the current on-disk contents of one candidate file and reuses the existing slash-family confidence scan fence.
- Advisory fires only for existing on-disk `HOLD` and `KILL` markers and only on `Write` / `Edit` actions that already resolved to `SUPERVISED`.
- Missing, unreadable, and out-of-fence files remain silent; `WATCH` and `GAP` remain silent.
- Deny paths, `FULL_AUTO` allow, permitted `HARD_STOP` allow, unclassified allow, `/confidence`, `PostToolUse`, chain writes, and host-facing hook response shape remain unchanged.
- Packet 7A truth lock lives at `docs/specs/PACKET7A_ADVISORY_PRESENCE_TRUTH_LOCK.md`, the helper spec lives at `docs/specs/HOOK_CONFIDENCE_ADVISOR.md`, and the closeout lives at `docs/PACKET7A_ADVISORY_PRESENCE_CLOSEOUT.md`.
- No shared contract widening ships in Packet 7A; `MIGRATIONS.md` remains unchanged.

## What This Does Not Do

- **No npm package or marketplace install.** There is no `package.json`. Load the repo directly with `--plugin-dir`.
- **No intake-chain execution bridge.** The Work Order pilot does not create SessionBrief, mutate Control Rod settings, or start execution on its own.
- **No second intake skin.** Work Order is the only intake pilot currently shipped.
- **No Agent tool governance.** Hooks cover `Bash`, `Write`, and `Edit` only. `Agent` spawn semantics are not classified.
- **No HTTP hooks or LLM-based decisions.** All hook logic is deterministic local code. No network calls, no model queries.
- **No universal project compatibility claim.** The plugin has been proven on its own repo, on governed-workflow, and on one foreign production repo (FieldPoint). Broader compatibility is not yet validated.
- **No multi-agent governance.** This is single-session, single-operator enforcement.
- **No trust-transfer or certificate claims.** That work remains parked.
- **No `PARTIAL` restoration verification state in Phase 1.** Verification states are locked to `UNVERIFIED` and `VERIFIED`.
- **No removal-awareness or payload inspection in Packet 7A.** Advisory presence awareness reads current on-disk file truth only and does not inspect intended edits.

## Proof

- **Golden verification:** the current repo state passes 569 tests in full golden regression.
- **Live enforcement proof:** A real `Write` to a pricing file on a foreign repo was classified into `pricing_quote_logic`, resolved to `HARD_STOP`, denied by `PreToolUse`, and never executed.
- **Compaction survival proof:** Governance state is preserved through `PreCompact` and rehydrated on `SessionStart` with source `compact`.
- **Fail-closed proof:** Corrupted state files, unknown hook events, and internal errors all produce deny/block decisions — never silent pass-through.
- **Lifecycle expansion proof boundary:** 24 handled official lifecycle events are shipped; `TaskCreated`, `TaskCompleted`, and `TeammateIdle` now have bounded proof; `WorktreeCreate` and `WorktreeRemove` remain pending, and `Setup` remains unclaimed.
- **Confidence Packet 4 boundary proof:** `/confidence` remains slash-only, deterministic, and read/query/render-only; Packet 3 comparison behavior remains additive/file-local with explicit ambiguity handling; Packet 4 temporal interpretation is explicit-timeline-only and bounded to `STALE_HOLD`/`UNRESOLVED_KILL`; semicolon-family execution, rename-aware/cross-file continuity, and hook/lifecycle integration remain deferred.
- **Confidence Packet 6 boundary proof:** `/confidence-transitions` remains a dedicated preview-first surface; generated entries stay on existing `FINDING` only with `NEWLY_OBSERVED`, `NO_LONGER_OBSERVED`, and `RETIERED`; `/confidence` gained no append path; and no resolution semantics or `ForensicChain` contract widening shipped.
- **Confidence Packet 7A boundary proof:** `ConfidenceAdvisor` reads one current on-disk file only, advisory appears only on SUPERVISED `Write` / `Edit` asks through existing `permissionDecisionReason`, `HOLD` / `KILL` are the only advisory tiers, `FULL_AUTO` / permitted `HARD_STOP` / deny paths remain silent, and advisor failure stays locally swallowed without changing governance decisions or exit behavior.

Detailed proof documentation:

- `docs/WAVE7_CLOSEOUT.md` — Wave 7 closeout evidence map
- `docs/B_PRIME_RESTORATION_PHASE1_CLOSEOUT.md` — B' Phase 1 finish-lane closeout, acceptance status, and bounded HOLDs
- `docs/CONFIDENCE_GRADIENT_PHASE1_CLOSEOUT.md` — Confidence Gradient Phase 1 finish-lane closeout, acceptance status, and bounded HOLDs
- `docs/PACKET3_MARKER_CONTINUITY_CLOSEOUT.md` — Packet 3 marker continuity closeout, mandatory proof posture, and front-door sync status
- `docs/PACKET4_TEMPORAL_SIGNALS_CLOSEOUT.md` — Packet 4 temporal signals closeout, mandatory proof posture, and front-door sync status
- `docs/PACKET5_WALK_COMPOSITION_CLOSEOUT.md` — Packet 5 `/walk` confidence sidecar composition closeout, mandatory proof posture, and front-door sync status
- `docs/PACKET6_TRANSITION_EVIDENCE_CLOSEOUT.md` — Packet 6 confidence transition evidence closeout, bounded lane split, and targeted recheck status
- `docs/PACKET7A_ADVISORY_PRESENCE_CLOSEOUT.md` — Packet 7A advisory presence awareness closeout, bounded hook-runtime lane, and proof recheck status
- `docs/PHASE3_LIFECYCLE_EXPANSION_CLOSEOUT.md` — Phase 3 finish-lane closeout, current 24-event posture, and public/history sync status
- `docs/PHASE3_REMAINING_LIFECYCLE_SEAMS_CLOSEOUT.md` — Phase 3 structural closeout (Blocks A/B shipped, Block C held)
- `docs/PHASE2_LIFECYCLE_EXPANSION_CLOSEOUT.md` — historical Phase 2 lifecycle expansion closeout and 21-event waypoint
- `docs/PHASE1_LIFECYCLE_EXPANSION_CLOSEOUT.md` — historical Phase 1 lifecycle expansion closeout and 11-to-19 count note
- `docs/BLUE_COLLAR_CODING_THESIS.md` — bounded thesis rider for the first front door
- `docs/OWASP_AGENTIC_MAPPING.md` — public reviewer-facing OWASP agentic security mapping and positioning/proof artifact
- `docs/WAVE6_PROOF_PACK.md` — Wave 6 proof pack (fail-closed, enforcement breadth, cross-repo governance)
- `docs/PLUGIN_CONVERSION_PROOF.md` — plugin validation and local smoke runbook
- `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md` — hook runtime contract baseline

## Repository Layout

```text
.
├── .claude-plugin/        # Claude plugin manifest
├── hooks/                 # Plugin hook registry and wrapper
├── .claude/               # Standalone path, project settings, deny rules
├── skills/                # Operator-facing skills
├── src/                   # Runtime governance modules: engines, skill surfaces, and hook runtime
├── scripts/               # Render wrapper and utility scripts
├── tests/                 # Golden and live verification
├── docs/                  # Specs, proof artifacts, and indexes
│   └── specs/             # Canonical contract baselines
└── raw/                   # Reference-only methodology inputs (not canon)
```

## License

[MIT](LICENSE)

## Start Here

1. `CLAUDE.md` — AI operating posture and repo truth
2. `docs/WAVE7_CLOSEOUT.md` — Wave 7 shipped scope and remaining HOLDs
3. `docs/BLUE_COLLAR_CODING_THESIS.md` — bounded thesis rider for the front-door shift
4. `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md` — hook runtime contract
5. `REPO_INDEX.md` — full repo navigation map
