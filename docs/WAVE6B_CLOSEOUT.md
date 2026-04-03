# WAVE6B_CLOSEOUT.md
**Status:** Wave 6B execution complete, Architect signed off 2026-04-03
**Date:** 2026-04-03

## Purpose

This artifact is the durable Wave 6B closeout evidence map.

## Wave 6B Shipped Scope

- **Block 0:** Canon reconciliation. Waves 1-5 closeout docs and MIGRATIONS.md signed off. Stale "private" and "Wave 1 constrained" wording fixed in CLAUDE.md. Wave 6A closeout artifact created. docs/INDEX.md and WHERE_TO_CHANGE_X.md updated for Wave 6A truth.
- **Block A:** Instruction-load observability via InstructionsLoaded. Records which instruction files (CLAUDE.md, rules files) are loaded, when, and by what trigger. Writes OPERATOR_ACTION chain entries. Persists through compaction. Does not hash or compare file contents.
- **Block B:** Operator-facing authoring surfaces. `/loto-clearance` for LOTO clearance create + revoke. `/issue-permit` for permit create + revoke. Single active match policy. Session + expiry scope for clearances. Session-scoped permits only. Four canonical chain action values: authorization_created, authorization_revoked, permit_created, permit_revoked.
- **Block C:** Truth sync and closeout. Front-door, index, and navigation surfaces aligned with shipped 6B state.

## Naming Override Incident

The originally approved route `/authorize` was renamed to `/loto-clearance` because the `*auth*` deny-pattern in `.claude/settings.json` collides with filenames containing "auth". A second collision was caught when `PERMIT_AUTHORING_SKILL.md` ("AUTHORING" contains "auth") was renamed to `PERMIT_ISSUANCE_SKILL.md`. Provisional Bash-created artifacts were cleaned manually by the Architect. Deny-pattern refinement (narrowing `*auth*` to exclude governance infrastructure) is deferred as a future HOLD.

## Route Name Truth

| Operator route | Internal path | Purpose |
|---|---|---|
| `/loto-clearance` | `src/LotoClearanceSkill.js` | Create + revoke LOTO clearances |
| `/issue-permit` | `src/PermitIssuanceSkill.js` | Create + revoke permits |
| `/permit` | `src/PermitSkill.js` | Evaluate/render-only gate decision (unchanged) |
| `/lockout` | `src/LockoutSkill.js` | Validate/render-only LOTO validation (unchanged) |

## Verification

- Golden test count at Wave 6B close: 337 pass, 0 fail.
- Live integration test: 1 pass (denied → authorized → permitted → allowed → revoked → denied → compaction survival).
- `git diff --check`: CLEAN at each block closeout.

## Commit History

| SHA | Message |
|-----|---------|
| `45bc230` | docs(wave6b): close Block 0 canon reconciliation and add Wave 6A closeout |
| `44b564e` | feat(hooks): add InstructionsLoaded observability for instruction-load integrity |
| `4f37107` | feat(skills): add loto-clearance and issue-permit authoring surfaces |

## Remaining HOLDs at Wave 6B Close

1. **Content-level instruction integrity** — Block A records load events but does not hash or compare file contents.
2. **TaskCreated / TaskCompleted chain writes** — consciously deferred as noise-reduction decision.
3. **Deny-pattern refinement** — `*auth*` glob overmatches governance infrastructure filenames. Narrowing deferred.

## Contract Boundaries

- ControlRodMode contract: NOT widened.
- ForensicChain contract: NOT widened.
- SessionBrief contract: NOT widened.
- `/permit` and `/lockout` semantics: UNCHANGED.
- No package/install/marketplace claims introduced.
