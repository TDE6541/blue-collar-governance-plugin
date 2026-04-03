# WAVE6A_CLOSEOUT.md
**Status:** Wave 6A execution complete, Architect signed off 2026-04-03
**Date:** 2026-04-03

## Purpose

This artifact is the durable Wave 6A closeout evidence map.

## Wave 6A Shipped Scope

- **Block 0:** Truth sync and seam kill. Skill count reconciliation (26 skills). Front-door surface sync. Legacy deny-syntax audit (no change needed).
- **Block A:** Fail-closed hook hardening (Slice 3). try-catch in PreToolUse, PermissionRequest, Stop. Unknown-event guard in runHookEvent. KNOWN_HOOK_EVENTS exported.
- **Block B:** Enforcement matrix widened from 5 to 8 hook events. ConfigChange (config mutation detection), CwdChanged (directory change observation), FileChanged (external governance-file change observation). All observational, non-blocking, fail-closed on error.
- **Block C:** Live chain population from hook runtime events. PostToolUse and PostToolUseFailure handlers. Chain writes from blocked actions, ConfigChange, and FileChanged. Persisted monotonic counter for entry IDs. Chain entries survive compaction. Walk evaluation receives empty forensicEntries (chain entries are self-standing, not claim-linked).
- **Block D:** Permit/lockout runtime closure. HARD_STOP PreToolUse and PermissionRequest paths consult operator-authored permits via ControlRodMode.evaluateHardStopGate. Permitted actions write OPERATOR_ACTION chain entries. Permit/authorization state survives compaction.
- **PSW:** Public Surface Wave. README rewrite for public audience. MIT LICENSE. CONTRIBUTING and TEAM_CHARTER "private" language cleaned.

## Verification

- Golden test count at Wave 6A close: 315 pass, 0 fail.
- `git diff --check`: CLEAN at each block closeout.
- No regressions across any block.

## Commit History

| SHA | Message |
|-----|---------|
| `15fd015` | feat(wave6a): fail-closed harden hook runtime and sync opening truth |
| `66b61b6` | docs: rewrite public front door and add MIT license |
| `946eaed` | feat(wave6a): widen enforcement matrix to 8 hook events |
| `a7fe950` | feat(wave6a): populate live chain from hook runtime events |
| `5703ff8` | feat(wave6a): wire permit gate into hook runtime enforcement |

## Remaining HOLDs at Wave 6A Close

1. **Instruction-integrity detection** — InstructionsLoaded event not implemented. Config-mutation detection via ConfigChange is shipped.
2. **Operator-facing permit creation UX** — Runtime consumption of permit/authorization state is shipped. No supported operator-facing creation path exists. Permits enter session state through direct authoring only.
3. **TaskCreated / TaskCompleted chain writes** — Consciously deferred as a noise-reduction decision. These are task-management events, not governance evidence.

## Contract Boundaries

- ControlRodMode contract: NOT widened. evaluateHardStopGate API was already shipped in Wave 4.
- ForensicChain contract: NOT widened. All chain entries use existing entry types (EVIDENCE, OPERATOR_ACTION).
- SessionBrief contract: NOT widened.
- No new skills, skins, or engines introduced in Wave 6A.
- No package/install/marketplace claims introduced.
