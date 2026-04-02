# HOOK_RUNTIME_ENFORCEMENT_SPINE.md
**Status:** Wave 5 hook/runtime Slice 1 contract baseline
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the smallest shipped hook/runtime enforcement spine for the Blue Collar Governance Plugin repo.

Slice 1 turns runtime-hook planning into real deterministic project behavior by wiring Claude Code command hooks to existing `ControlRodMode` and `ForemansWalk` truth.

## Scope

Slice 1 includes exactly:

- project hook registration at `.claude/settings.json`
- fail-closed command-hook runtime entrypoint at `.claude/hooks/run-governance-hook.js`
- deterministic local hook adapter at `src/HookRuntime.js`
- `PreToolUse` HARD_STOP enforcement over the current matched tool set
- `PermissionRequest` rod-aligned resolution for `FULL_AUTO` and `SUPERVISED`
- `Stop` hook closeout gate through existing `ForemansWalk`
- narrow persistent deny-rule alignment through project settings

Slice 1 excludes:

- `SessionStart`
- `PreCompact`
- `PostCompact`
- `PostToolUse`
- `PostToolUseFailure`
- `TaskCreated`
- `TaskCompleted`
- `SessionEnd`
- `Agent` tool governance
- compaction survival or startup re-injection
- HTTP hooks
- LLM-based hook decisions

## Hook Coverage

Slice 1 matches only:

- `Bash`
- `Write`
- `Edit`

`Agent` is not part of Slice 1 because current repo truth does not yet define a deterministic tool-to-domain mapping for agent spawn semantics.

## Fail-Closed Rule

Every enforcement hook in this slice must fail closed on runtime error.

Required behavior:

- unexpected hook error exits with code `2`
- exit `1` is not used for enforcement failure
- all decisions are made locally with deterministic code
- no external calls are allowed in the hook runtime path

## Control Rod Integration

Slice 1 resolves the project hook posture from `.claude/settings.json` and uses the shipped `conservative` starter profile for current project runtime enforcement.

`PreToolUse` behavior:

- classify matched `Bash`, `Write`, and `Edit` calls against current `ControlRodMode` file-pattern and operation truth
- deny `HARD_STOP` actions before execution
- ask for confirmation on `SUPERVISED` actions
- record `FULL_AUTO` observations for current-session stop verification

`PermissionRequest` behavior:

- auto-allow `FULL_AUTO` actions when a dialog would otherwise appear
- preserve the normal user approval experience for `SUPERVISED` actions
- deny `HARD_STOP` only as a safety backstop when a request reaches this hook unexpectedly

## Persistent Deny Layer

Slice 1 adds a narrow project `permissions.deny` layer in `.claude/settings.json`.

That deny layer is intentionally limited to current `HARD_STOP` posture that can be expressed safely as project rules:

- destructive `Bash` command signatures
- pricing / quote edit patterns
- customer / PII edit patterns
- schema / migrations edit patterns
- auth / security edit patterns

This is a deny-first alignment layer, not a generic settings-management subsystem.

## Stop / Walk Gate

Slice 1 stores a session-local governed action ledger under `.claude/runtime/`.

The `Stop` hook:

- builds a bounded `ForemansWalk` evaluation from the current-session hook ledger and current control-rod profile
- blocks closeout when `ForemansWalk` emits blocking findings at `CRITICAL` or `HIGH`
- uses `stop_hook_active` plus the previous blocked finding signature to avoid infinite re-fire loops

Current boundary:

- the Slice 1 ledger is session-local only
- it is not compaction-safe
- it is not startup-reinjected
- later survival/re-injection work belongs to the next slice

## Contract Boundaries

Slice 1 does not widen:

- `ControlRodMode`
- `ForemansWalk`
- `SessionBrief`
- `SessionReceipt`
- `ConstraintsRegistry`

Hook runtime behavior is an adapter over existing truth, not a replacement for those contracts.

## Current Implementation Truth

- Hook registration exists at `.claude/settings.json`.
- Hook command entrypoint exists at `.claude/hooks/run-governance-hook.js`.
- Deterministic hook runtime adapter exists at `src/HookRuntime.js`.
- Golden proof exists at `tests/golden/HookRuntime.golden.test.js`.
- Live proof exists at `tests/live/wave5.hook-runtime.live.test.js`.

