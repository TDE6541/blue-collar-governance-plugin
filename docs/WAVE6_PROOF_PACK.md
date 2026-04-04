# WAVE6_PROOF_PACK.md
**Status:** Wave 6 proof pack
**Date:** 2026-04-04

## What Wave 6 Proved

Wave 6 turned the plugin from a live governance cockpit into a fail-closed, event-driven runtime trust layer that governs real work across repos and leaves behind non-empty forensic proof. Specifically: the hook layer now fails closed instead of failing open, the plugin governs more than one action type across 11 lifecycle events, runtime events write their own evidence trail, permit and lockout are operational, and the plugin has carried real governed work across three repos with non-empty governance records.

## 1. Fail-Closed Hook Hardening

Wave 6A Slice 3 wrapped all blocking enforcement paths (`PreToolUse`, `PermissionRequest`, `Stop`) in try-catch so that internal errors produce deny/block decisions instead of propagating exceptions. An unknown-event guard in `runHookEvent` rejects unrecognized hook event names. The `KNOWN_HOOK_EVENTS` set is exported for verification.

**Evidence:**
- Golden test coverage for error-path fail-closed behavior
- Live enforcement: corrupted state files, unknown events, and internal errors all produce deny/block — never silent pass-through

## 2. Enforcement Breadth

The hook runtime handles 11 Claude Code lifecycle events across 10 classified domains under 3 starter profiles:

| Event | Behavior |
|-------|----------|
| SessionStart | Injects governance context; rehydrates after compaction |
| PreCompact | Preserves governance state before context compaction |
| PreToolUse | Classifies tool actions; denies HARD_STOP; asks on SUPERVISED |
| PermissionRequest | Resolves permission dialogs against active control rod profile |
| Stop | Evaluates Foreman's Walk; blocks closeout on unresolved findings |
| PostToolUse | Records completed actions to forensic chain |
| PostToolUseFailure | Records failed actions to forensic chain |
| ConfigChange | Detects governance config mutation; records to chain |
| CwdChanged | Records working-directory changes |
| FileChanged | Detects external changes to governance-relevant files |
| InstructionsLoaded | Records instruction-file load events for presence observability |

Conservative profile: 5 HARD_STOP / 4 SUPERVISED / 1 FULL_AUTO domains.

**Evidence:**
- 345 golden tests, 0 failures
- Live blocked actions across Block F, G, and H sessions

## 3. Live Evidence Accumulation

The forensic chain is populated automatically from real runtime events. Chain entries are append-only, persisted, and survive compaction.

| Chain source | Entry type | What it records |
|-------------|-----------|----------------|
| hook:PostToolUse | EVIDENCE | Completed tool actions on classified domains |
| hook:PreToolUse | OPERATOR_ACTION | Blocked actions (HARD_STOP denials) |
| hook:ConfigChange | OPERATOR_ACTION | Governance config mutations |
| hook:InstructionsLoaded | OPERATOR_ACTION | Instruction-file load events |

Block F dogfood session produced 78 chain entries from 4 distinct hook sources during real governed work (deny-pattern refinement task). `/prevention-record` rendered 78 captured forensic signals from those entries through the deterministic `CompressedGovernanceHealthSkills.renderPreventionRecord` engine.

**Evidence:**
- Block F: 78 chain entries, 8 blocked-action entries, 1 ConfigChange entry
- Block G: non-empty chain entries from governed-workflow session
- Block H: non-empty chain entries from FieldPoint session including HARD_STOP and SUPERVISED evidence

## 4. Permit and Lockout Runtime Closure

Wave 6A Block D wired `ControlRodMode.evaluateHardStopGate` into `PreToolUse` and `PermissionRequest` HARD_STOP paths. Operator-authored permits stored in session state allow scoped passage through HARD_STOP domains. Permitted actions write OPERATOR_ACTION chain entries.

Wave 6B Block B shipped operator-facing authoring surfaces: `/loto-clearance` (create + revoke LOTO clearances) and `/issue-permit` (create + revoke permits).

**Evidence:**
- Wave 6B live integration test: denied -> authorized -> permitted -> allowed -> revoked -> denied -> compaction survival
- Golden test coverage for permit/lockout gate evaluation

## 5. Deny-Pattern Refinement

The `*auth*` deny glob was too broad — it matched governance infrastructure filenames containing "auth" as a substring (e.g., `PERMIT_AUTHORING_SKILL.md`). Block F replaced the single broad pattern with 10 targeted patterns covering realistic naming conventions.

**False positives eliminated:** `PERMIT_AUTHORING_SKILL.md`, `author-bio.md`, `authored-changelog.md`
**True positives preserved:** `auth.js`, `authentication.js`, `authorization.js`, `oauth2.js`, `authz.js`, `user-auth.js`, `security-rules.js`

The refinement was applied across three surfaces: `.claude/settings.json`, `src/HookRuntime.js` (`PROJECT_HARD_STOP_DENY_RULES`), and `src/ControlRodMode.js` (`auth_security_surfaces` filePatterns).

**Evidence:**
- 345 golden tests, 0 regressions after pattern change
- Pattern-by-pattern false-positive and true-positive verification

## 6. CC-Native Render Wrapper

`scripts/render-skill.js` is a thin read-only CLI wrapper that reads the most recent session state from `.claude/runtime/` and dispatches to existing engine render functions. It supports `/chain`, `/walk`, `/fire-break`, and `/prevention-record`.

When required inputs are absent (e.g., Walk needs sessionBrief/sessionReceipt not persisted by the hook runtime), the wrapper emits deterministic HOLD payloads with explicit `availableInputs` and `missingInputs` metadata — no fake data.

**Evidence:**
- 8 golden tests covering all 4 routes in populated and empty states
- Live renders: `/chain` produced 78-entry deterministic output, `/prevention-record` produced 78 forensic signals

## 7. Cross-Repo Governance

### Block F — Plugin Repo Dogfood

One real bounded coding task (deny-pattern refinement) performed under active plugin governance in the plugin's own repo. Session produced 78 chain entries from 4 hook sources, 8 blocked-action chain entries, 1 ConfigChange entry, and multiple conversation-observed Bash HARD_STOPs.

### Block G — Governed-Workflow Portability

Plugin loaded against the governed-workflow repo via `--plugin-dir`. Dual-hook safety confirmed: governed-workflow's observational hooks and the plugin's governance hooks coexist without conflicts. Plugin hooks created `.claude/runtime/` under governed-workflow and populated session state with chain entries. `/chain` and `/prevention-record` rendered non-empty from the foreign-repo session. A real HARD_STOP blocked action was produced under the conservative profile. One real bounded index-reconciliation patch committed under governance.

### Block H — FieldPoint External Enforcement v2

Plugin loaded against FieldPoint (a real farming operations SaaS repo) via `--plugin-dir`. A `Write` to `api/pricing_test_canary.txt` was classified into `pricing_quote_logic`, resolved to HARD_STOP, and denied before execution — the file was never created. An `Edit` to the existing `test_note.txt` was classified as `existing_file_modification` (SUPERVISED) and completed after user review. Session produced non-empty chain entries and non-empty prevention-record signals. Walk evaluation ran through the Stop lifecycle gate.

This is the second enforcement proof on FieldPoint. The first (pre-Wave-6) proved one blocked `Write`. This proof is stronger: the runtime now populates evidence automatically (chain entries from 4 hook sources), the enforcement matrix covers 11 events, and both HARD_STOP and SUPERVISED classifications are demonstrated.

## 8. Known Boundaries

- `/walk` via render-skill wrapper returns HOLD — Walk requires `sessionBrief` and `sessionReceipt` objects that are conversation-scope, not persisted by the hook runtime. Walk DOES run through the Stop lifecycle gate and populates `lastWalk` in session state.
- `/fire-break` via render-skill wrapper returns HOLD — requires `OpenItemsBoard` projection from cross-session continuity/risk/omission inputs not in hook state.
- Static deny rules (`permissions.deny`) are project-level, not plugin-level. Foreign repos must add deny rules to their own `.claude/settings.json` for the static deny layer.
- Bash HARD_STOP matchers can block commit messages or commands that contain protected-domain words. This is working-as-designed but creates UX friction for governance maintenance.
- Foreign-repo governance requires the session to be started from the foreign repo with `--plugin-dir`. The plugin's domain classifier resolves paths relative to the session's project directory.
- No `package.json`. Load the plugin with `--plugin-dir` only.
- No Agent tool governance. Hooks cover `Bash`, `Write`, and `Edit` only.
- No multi-agent governance. Single-session, single-operator enforcement.

## Reproducible Proof Commands

```bash
# Golden tests (345 expected)
node --test tests/golden/*.golden.test.js

# Live integration tests
node --test tests/live/*.live.test.js

# Render chain from session state
node scripts/render-skill.js chain

# Render prevention-record from session state
node scripts/render-skill.js prevention-record

# Render walk (expected: HOLD — structural)
node scripts/render-skill.js walk

# Render fire-break (expected: HOLD — structural)
node scripts/render-skill.js fire-break
```
