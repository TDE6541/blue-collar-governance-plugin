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

## Block B: Enforcement Matrix v1 (Wave 6A)

Block B extends the hook runtime from 5 handled events to 8 by adding three observational event handlers.

### New Events

| Event | Can block? | Behavior |
|-------|-----------|----------|
| `ConfigChange` | No (observation only) | Records governance-config mutation as an observed action under `auth_security_surfaces`. Returns advisory context describing the change source and active profile. Does not block config edits. |
| `CwdChanged` | No (observation only) | Records working-directory change in session state (`lastCwdChange`). Returns advisory context. Notes explicitly if new directory is outside the project root. |
| `FileChanged` | No (observation only) | Fires on changes to governance-relevant files (`.claude/settings.json`). Records external file change as an observed action under `auth_security_surfaces`. Returns advisory context. |

### Hook Registration

Both `.claude/settings.json` and `hooks/hooks.json` register these three events. `FileChanged` uses a narrow matcher scoped to `.claude/settings.json` only.

### Fail-Closed Behavior

All three handlers follow the Slice 3 fail-closed pattern: internal errors produce advisory context with a `FAIL_CLOSED` prefix rather than crashing the process. Since none of these events return blocking decisions on the normal path, fail-closed means advisory degradation, not deny/block.

### Session State

Block B adds one optional field to session state: `lastCwdChange` (`{ from, to, changedAt } | null`). Missing field defaults to null. Existing state files remain compatible.

### Contract Boundaries

Block B does not widen:

- `ControlRodMode`
- `ForemansWalk`
- `SessionBrief`
- `SessionReceipt`
- `ConstraintsRegistry`
- `ForensicChain`

Block B does not write to the forensic chain (that is Block C scope). Block B does not implement permit/lockout closure (that is Block D scope). Block B does not handle `InstructionsLoaded`, `PostToolUse`, `TaskCreated`, `TaskCompleted`, or any other events beyond the three listed above.

## Block C: Live Chain Population v1 (Wave 6A)

Block C extends the hook runtime from 8 handled events to 10 and populates the forensic chain from real runtime events.

### New Events

| Event | Behavior |
|-------|----------|
| `PostToolUse` | Classifies the completed tool action. If the action matches a governed domain, writes an `EVIDENCE` chain entry. Unclassified actions produce no chain write. |
| `PostToolUseFailure` | Classifies the failed tool action. If the action matches a governed domain, writes an `EVIDENCE` chain entry with a bounded error summary. |

### Chain Writes from Existing Events

| Event | Chain entry type | Trigger |
|-------|-----------------|---------|
| PreToolUse (HARD_STOP blocked) | `OPERATOR_ACTION` | Every denied action |
| ConfigChange | `OPERATOR_ACTION` | Every config mutation detection |
| FileChanged | `OPERATOR_ACTION` | Every external governance-file change |

### Chain Entry ID Strategy

Entry IDs use the pattern `hook_{eventType}_{sessionId}_{counter}` where `counter` is a persisted monotonic integer (`nextChainCounter`) stored in session state. The counter increments atomically with each append, survives compaction via `PreCompact` persistence and `SessionStart` rehydration, and is never reset within a session lineage.

### Duplicate-Entry Policy

- Duplication across session state (observedActions/blockedAttempts) and chain is acceptable — they serve different purposes.
- Duplication inside the chain is prevented: before appending, the helper checks if an entry with the generated `entryId` already exists in `chainEntries`. If so, the write is skipped. Since the counter is monotonic, this guard handles the edge case of an unexpected re-fire producing the same counter value.
- Replayed or retried events that produce different counter values represent genuinely distinct invocations and write separate entries.

### Events Consciously Deferred

`TaskCreated` and `TaskCompleted` are not wired to chain writes in Block C. These are task-management lifecycle events with low governance-evidence value. Writing them would create chain noise without meaningful enforcement or accountability signal. This is a conscious noise-reduction decision.

`InstructionsLoaded` is not handled. Instruction-integrity detection remains a separate HOLD.

### Session State Additions

- `chainEntries: []` — bounded array of chain entry objects (MAX_CHAIN_ENTRIES = 128)
- `nextChainCounter: 1` — persisted monotonic counter for entry ID generation

Both fields are persisted through compaction and rehydrated on recovery. Missing fields default to empty array and 1 respectively.

### Walk Integration

`buildWalkEvaluationFromState` continues to pass `forensicEntries: []` to the Foreman's Walk evaluation. Hook-generated chain entries are self-standing runtime evidence with no claim linkage, and feeding them into the Walk's truthfulness check would produce false GHOST findings (evidence without linked claims). Chain entries persist in session state and are visible through `/chain` independently from the Walk's evaluation.

### Contract Boundaries

Block C does not widen the ForensicChain contract. All entries use existing entry types (`EVIDENCE`, `OPERATOR_ACTION`). No new entry types are introduced. The ForensicChain class itself (`src/ForensicChain.js`) is not modified.

Block C does not implement permit/lockout closure (Block D scope).

## Block D: Permit / Lockout Runtime Closure (Wave 6A)

Block D wires the existing `ControlRodMode.evaluateHardStopGate()` API into the hook runtime so that operator-authored permits allow scoped passage through HARD_STOP domains.

### Runtime Behavior Change

Before Block D, all HARD_STOP domain actions were flatly denied at PreToolUse and PermissionRequest time. After Block D, the HARD_STOP path consults session state for matching authorization and permit objects:

1. Classification identifies HARD_STOP domain
2. Look up `activeAuthorizations` for matching domain + valid scope (SESSION or non-expired EXPIRY)
3. If no authorization: deny (same as pre-Block D behavior)
4. Look up `activePermits` for matching domain + session
5. If no permit: deny (same as pre-Block D behavior)
6. Call `ControlRodMode.evaluateHardStopGate()` with matched authorization + permit
7. If `mayProceed: true` (GRANTED or CONDITIONAL): allow action, record as `permitted_hard_stop`, write `OPERATOR_ACTION` chain entry
8. If `mayProceed: false` (DENIED or AUTH_EXPIRED): deny with gate statusCode

### Permit-Authoring Boundary

The hook runtime **consumes** operator-authored permit/authorization state. It does not **create** permits. Permits and authorizations enter session state through operator action (pre-seeded state, direct state authoring, or future operator-facing creation paths). The `/permit` and `/lockout` skills remain read/query/render-only evaluation and validation surfaces.

### Session State Additions

- `activePermits: []` — array of operator-authored permit objects
- `activeAuthorizations: []` — array of operator-authored LOTO authorization objects

Both survive compaction and are rehydrated on recovery. Missing fields default to `[]`.

### Chain Visibility

Permitted HARD_STOP actions write `OPERATOR_ACTION` chain entries with `action: "permitted"`, the gate statusCode, permitRef, authorizationRef, constrained flag, and conditions.

### Contract Boundaries

Block D does not widen the ControlRodMode contract. The `evaluateHardStopGate` API is unchanged. Block D does not modify `src/ControlRodMode.js`. No new skills or engines are introduced.

## Block A: Instruction-Load Observability v1 (Wave 6B)

Block A extends the hook runtime from 10 handled events to 11 by adding an `InstructionsLoaded` handler that records when instruction files (CLAUDE.md, rules files) are loaded by Claude Code.

### What This Does

Records instruction-load events as observable governance-layer presence signals. Each load event is stored in session state and written to the forensic chain as an `OPERATOR_ACTION` entry.

### What This Does Not Do

- Does not hash or compare file contents — content-level integrity detection is out of scope
- Does not block instruction loading — the `InstructionsLoaded` event cannot block per Claude Code API
- Does not prove content-level integrity — it proves load-event presence only

### Event Details

| Field | Source |
|-------|--------|
| `file_path` | Absolute path to the instruction file |
| `memory_type` | Scope: User, Project, Local, or Managed |
| `load_reason` | Why loaded: session_start, nested_traversal, path_glob_match, include, compact |

### Session State

`loadedInstructions: []` — bounded array of instruction-load records (MAX_LOADED_INSTRUCTIONS = 64). Survives compaction. Missing field defaults to `[]`.

### Fail-Closed Behavior

On internal error, returns advisory context with `FAIL_CLOSED` prefix. Non-blocking (observation-only event).

### Contract Boundaries

Block A does not widen any shared contracts. `InstructionsLoaded` is observation-only. No new skills or engines.
