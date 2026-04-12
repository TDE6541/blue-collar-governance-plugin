# PACKET7A_ADVISORY_PRESENCE_TRUTH_LOCK.md
**Status:** Packet 7A structural truth lock (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document hard-locks Packet 7A scope for advisory presence awareness.

Packet name is fixed:

- `Advisory Presence Awareness`

This lane ships only a bounded hook-runtime advisory:

- presence-only awareness
- existing on-disk file truth only
- existing `PreToolUse` human-readable message path only where repo truth already proves that path is safe

## Locked Scope

Packet 7A ships only additive advisory awareness for existing slash-family confidence markers already present on disk.

Marker trigger scope is fixed to exactly:

- `HOLD`
- `KILL`

Marker family posture is fixed to exactly:

- slash-family only

Confidence scan fence posture is fixed to exactly the existing Confidence Gradient fence only:

- `src/`
- `hooks/`
- `scripts/`
- `.claude/`
- `*.js`

Advisory source posture is fixed to exactly:

- current on-disk file contents only

## Hook Landing Lock

`src/HookRuntime.js` is the only allowed hook owner file in this lane.

Advisory composition is allowed only on:

- `PreToolUse`
- `SUPERVISED`
- existing `permissionDecisionReason` string

The following paths remain advisory-silent in this lane:

- deny paths
- `FULL_AUTO` allow paths
- permitted `HARD_STOP` allow paths
- unclassified allow paths
- fail-closed paths

## ConfidenceAdvisor Lock

Packet 7A introduces one pure helper module:

- `src/ConfidenceAdvisor.js`

The helper is locked to:

- deterministic behavior
- stateless behavior
- input = file path only
- current on-disk file reads only
- no payload inspection
- no future intended-content inference
- no decision-making
- no chain writes
- no network
- no hook state mutation

Missing file, unreadable file, and out-of-fence file all collapse to:

- empty advisory

`WATCH` and `GAP` remain silent and do not produce advisory output.

## No-Ship Boundary

Packet 7A does not ship:

- removal-awareness
- before/after diffing
- `PostToolUse` changes
- tool-payload inspection
- future-content inference
- `/confidence` changes
- `docs/specs/CONFIDENCE_SKILL.md` changes
- `src/ConfidenceSkill.js` changes
- `src/ConfidenceGradientEngine.js` changes
- semicolon-family support
- chain writes
- new operator-facing skill surfaces
- migration work
- host-facing schema widening
- changes to `src/HookRuntimeSlice2.js`
- changes to `src/ForensicChain.js`
- changes to `src/ContinuityLedger.js`
- changes to `src/StandingRiskEngine.js`
- changes to `src/ForemansWalk.js`

## Advisory Failure Isolation Lock

Advisory failure must be swallowed locally inside `handlePreToolUse`.

If the advisory helper throws:

- advisory collapses to empty
- permission decision remains unchanged
- return shape remains unchanged
- exit behavior remains unchanged

The advisory helper must not bubble into the outer fail-closed governance path.

## File Fence

Packet 7A execution is limited to:

- `docs/specs/PACKET7A_ADVISORY_PRESENCE_TRUTH_LOCK.md`
- `docs/specs/HOOK_CONFIDENCE_ADVISOR.md`
- `src/ConfidenceAdvisor.js`
- `tests/golden/ConfidenceAdvisor.golden.test.js`
- `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md`
- `src/HookRuntime.js`
- `tests/golden/HookRuntime.golden.test.js`
- `docs/PACKET7A_ADVISORY_PRESENCE_CLOSEOUT.md`
- `README.md`
- `CLAUDE.md`
- `REPO_INDEX.md`
- `docs/INDEX.md`
- `docs/indexes/WHERE_TO_CHANGE_X.md`

## Stop Conditions

Emit `HOLD` and stop if any of the following become necessary:

- removal-awareness
- `PostToolUse` changes
- payload inspection
- host-facing response-field addition or widening
- advisory on `FULL_AUTO` allow
- advisory on permitted `HARD_STOP` allow
- advisory on deny paths
- scan-fence widening
- marker-family widening
- touching `src/HookRuntimeSlice2.js`
- touching `src/ForensicChain.js`
- touching `src/ContinuityLedger.js`
- touching `src/StandingRiskEngine.js`
- touching `src/ForemansWalk.js`
- touching `MIGRATIONS.md`
- touching any file outside the approved Packet 7A fence

## Migration Guard

Packet 7A is additive advisory work only.

Approved posture is:

- no shared-contract widening
- no `MIGRATIONS.md` change
- no new host-facing schema fields
