# HOOK_RUNTIME_ENFORCEMENT_SPINE.md
**Status:** Wave 5 hook/runtime Slice 2 contract baseline (compaction survival + startup re-injection)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the shipped command-hook enforcement spine for the Blue Collar Governance Plugin repo.

Slice 1 established deterministic fail-closed command enforcement over existing `ControlRodMode` and `ForemansWalk` truth.

Slice 2 preserves that behavior and adds compaction-safe continuity through bounded startup re-injection.

## Scope

Slice 2 includes exactly:

- project hook registration at `.claude/settings.json`
- fail-closed command-hook runtime entrypoint at `.claude/hooks/run-governance-hook.js`
- deterministic local hook adapter at `src/HookRuntime.js`
- Slice 2 helper runtime at `src/HookRuntimeSlice2.js`
- `SessionStart` bounded governance context injection for `startup`, `compact`, and `resume`
- `PreCompact` preservation of governed runtime state for compact survival
- `PreToolUse` HARD_STOP enforcement over the current matched tool set
- `PermissionRequest` rod-aligned resolution for `FULL_AUTO` and `SUPERVISED`
- `Stop` hook closeout gate through existing `ForemansWalk`
- narrow persistent deny-rule alignment through project settings

Slice 2 excludes:

- `PostCompact` behavior (not required in this slice)
- `PostToolUse`
- `PostToolUseFailure`
- `TaskCreated`
- `TaskCompleted`
- `SessionEnd`
- `Agent` tool governance
- HTTP hooks
- LLM-based hook decisions

## Hook Coverage

Command enforcement coverage remains:

- `Bash`
- `Write`
- `Edit`

`Agent` is still out of scope until deterministic tool-to-domain mapping exists for agent spawn semantics.

## Fail-Closed Rule

Every enforcement hook in this spine must fail closed on runtime error.

Required behavior:

- unexpected hook error exits with code `2`
- exit `1` is not used for enforcement failure
- all decisions are made locally with deterministic code
- no external calls are allowed in the hook runtime path

## Startup Re-Injection

`SessionStart` now injects bounded governance context only:

- startup source (`startup`, `compact`, `resume`, or `clear`)
- active control-rod profile id
- bounded observed/block counts
- latest relevant stop/walk posture summary

The injected context does not replay transcript content and does not carry unbounded payloads.

## Compaction Survival

`PreCompact` now writes a bounded preservation snapshot under `.claude/runtime/_compaction-preserved.json` containing only runtime-governance continuity data:

- observed action ledger (bounded)
- blocked attempt ledger (bounded)
- stop-gate signature/timestamp
- latest walk snapshot
- compact trigger + save timestamp metadata

On `SessionStart` with source `compact` (and `resume` when state is not already present), Slice 2 rehydrates from that snapshot.

## Missing/Malformed Recovery Guard

If compact/re-entry startup requires preserved state and snapshot data is missing or malformed:

- startup context explicitly reports recovery HOLD status
- runtime injects a deterministic HARD_STOP recovery hold action
- `Stop` closeout remains blocked through existing Walk gate behavior

This prevents silent fail-open on compaction recovery loss.

## Control Rod Integration

Current enforcement posture still resolves from `.claude/settings.json` and uses `conservative` by default.

`PreToolUse` behavior remains:

- classify matched `Bash`, `Write`, and `Edit` calls against `ControlRodMode` domain/operation truth
- deny `HARD_STOP` actions before execution
- ask on `SUPERVISED` actions
- record `FULL_AUTO` observations for stop verification

`PermissionRequest` behavior remains:

- auto-allow `FULL_AUTO` actions when dialog would otherwise appear
- preserve normal user approval on `SUPERVISED` actions
- deny `HARD_STOP` as safety backstop if request reaches this hook unexpectedly

## Persistent Deny Layer

Project `permissions.deny` remains intentionally narrow and aligned to current HARD_STOP posture:

- destructive `Bash` signatures
- pricing / quote edit patterns
- customer / PII edit patterns
- schema / migrations edit patterns
- auth / security edit patterns

This remains deny-first posture alignment, not a generic settings-management subsystem.

## Contract Boundaries

Slice 2 does not widen:

- `ControlRodMode`
- `ForemansWalk`
- `SessionBrief`
- `SessionReceipt`
- `ConstraintsRegistry`

Hook runtime behavior remains an adapter over existing truth.

## Current Implementation Truth

- Hook registration exists at `.claude/settings.json`.
- Hook command entrypoint exists at `.claude/hooks/run-governance-hook.js`.
- Deterministic runtime adapter exists at `src/HookRuntime.js` with Slice 2 helper logic at `src/HookRuntimeSlice2.js`.
- Golden proof exists at `tests/golden/HookRuntime.golden.test.js`.
- Live proof exists at `tests/live/wave5.hook-runtime.live.test.js`.
- Canonical onboarding/runtime-proof artifact exists at `docs/WAVE5_ONBOARDING_RUNTIME_PROOF.md`.
- Wave 5 closeout evidence map exists at `docs/WAVE5_CLOSEOUT.md`.

## Plugin Conversion Addendum

- Plugin hook registration now exists at `hooks/hooks.json`.
- The plugin-root hook wrapper lives at `hooks/run-governance-hook.js` and reuses the existing shipped runtime rather than duplicating hook logic.
- Project `.claude/settings.json` remains the current `permissions.deny` delivery surface and the standalone compatibility path.
- Plugin conversion does not widen `ControlRodMode`, `ForemansWalk`, `SessionBrief`, `SessionReceipt`, or `ConstraintsRegistry`.
- Plugin and standalone hook registration should currently be treated as alternate modes until simultaneous loading is explicitly proven.

## Slice 3: Fail-Closed Hook Hardening (Wave 6A Block A)

Slice 3 hardens the existing Slice 2 hook runtime so that blocking enforcement paths fail closed on internal error rather than propagating exceptions to the hook wrapper.

### Scope

Slice 3 adds exactly:

- `PreToolUse` internal try-catch: on unexpected error during classification, state load, or state save, returns a deny decision with `FAIL_CLOSED` reason instead of propagating the exception
- `PermissionRequest` internal try-catch: on unexpected error, returns a deny decision with `FAIL_CLOSED` reason instead of propagating the exception
- `Stop` internal try-catch: on unexpected error during Walk evaluation, state load, or state save, returns a block decision with `FAIL_CLOSED` reason instead of crashing the process
- Unknown hook event guard: `runHookEvent` now throws on unrecognized event names instead of returning `{}`, ensuring new Claude Code lifecycle events do not silently pass through

### Why

Prior to Slice 3, blocking hook paths relied on the outermost hook wrapper catching exceptions and exiting with code 2. This is fail-closed at the process level, but exit code 2 means the hook crashed — which may trigger Claude Code retry behavior or surface an error to the user. Slice 3 makes each handler produce a correct governance decision even on internal error, keeping the session governable.

The unknown-event guard prevents silent fail-open if Claude Code introduces new lifecycle events that the governance runtime does not yet handle. The thrown error propagates to the hook wrapper, which exits with code 2.

### Behavior Table

| Handler | Internal Error Before Slice 3 | Internal Error After Slice 3 |
|---------|-------------------------------|------------------------------|
| `PreToolUse` | Exception → wrapper exit 2 | Deny decision with FAIL_CLOSED reason |
| `PermissionRequest` | Exception → wrapper exit 2 | Deny decision with FAIL_CLOSED reason |
| `Stop` | Exception → wrapper exit 2 | Block decision with FAIL_CLOSED reason |
| Unknown event | Return `{}` (silent pass) | Exception → wrapper exit 2 |

### Contract Boundaries

Slice 3 does not widen:

- `ControlRodMode`
- `ForemansWalk`
- `SessionBrief`
- `SessionReceipt`
- `ConstraintsRegistry`

Slice 3 does not add new hook event handlers, does not change classification logic, and does not change the normal-path behavior of any existing handler. Only error paths are affected.
