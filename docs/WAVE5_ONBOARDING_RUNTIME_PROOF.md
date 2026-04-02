# WAVE5_ONBOARDING_RUNTIME_PROOF.md
**Status:** Canonical onboarding/runtime-proof surface for shipped Wave 5 state
**Date:** 2026-04-02
**Audience:** Architect, operators, maintainers

## Purpose

This artifact is the onboarding and runtime-proof truth surface for the current shipped Wave 5 posture.

It describes how startup governance works today, what is shipped vs pending, and which commands prove the current runtime behavior without inventing install/package claims.

## Current Operator Startup Path

1. Start a session in this repository root (`Blue Collar Governance Plugin`).
2. `SessionStart` runs the command hook configured in `.claude/settings.json`.
3. The hook entrypoint (`.claude/hooks/run-governance-hook.js`) reads event input from stdin and calls `runHookEvent` in `src/HookRuntime.js`.
4. `src/HookRuntime.js` resolves hook posture from local settings and applies deterministic command-hook governance over `Bash`, `Write`, and `Edit`.
5. `SessionStart` injects bounded governance context only (profile, bounded counts, latest stop/walk posture) with no transcript replay.
6. `PreCompact` writes bounded preservation state under `.claude/runtime/_compaction-preserved.json`; later `SessionStart` with `compact` (and `resume` when needed) rehydrates from that state via `src/HookRuntimeSlice2.js`.
7. `Stop` remains gated through existing `ForemansWalk` findings and blocks closeout on unresolved blocking posture.

## Shipped Vs Pending

| Area | Current Truth |
|---|---|
| Hook runtime enforcement | Shipped through Slice 2 (`SessionStart`, `PreCompact`, `PreToolUse`, `PermissionRequest`, `Stop`) |
| Compaction survival | Shipped (`PreCompact` preservation + bounded `SessionStart` re-injection for `startup`, `compact`, `resume`) |
| Command-hook posture | Shipped as local deterministic fail-closed logic only |
| Agent/HTTP/LLM hook decisions | Not shipped |
| Plugin install/package lifecycle | Not shipped / not claimed |
| Marketplace/install command surface | Not shipped / not claimed |

## Package/Install Posture (Explicit)

- `package.json` is absent in this repo.
- There is no canonical `npm install`/package-publish path claimed for Wave 5 signoff.
- Runtime proof is command-hook and test evidence, not package-install evidence.

## Reproducible Runtime Proof Snapshot

| Command | Result (2026-04-02) |
|---|---|
| `node --test tests/golden/HookRuntime.golden.test.js` | PASS (`10` passed, `0` failed) |
| `node --test tests/live/wave5.hook-runtime.live.test.js` | PASS (`3` passed, `0` failed) |
| `if (Test-Path 'package.json') { 'PACKAGE_JSON_PRESENT' } else { 'PACKAGE_JSON_ABSENT' }` | `PACKAGE_JSON_ABSENT` |

## Runtime Truth Surfaces

- `.claude/settings.json`
- `.claude/hooks/run-governance-hook.js`
- `src/HookRuntime.js`
- `src/HookRuntimeSlice2.js`
- `tests/golden/HookRuntime.golden.test.js`
- `tests/live/wave5.hook-runtime.live.test.js`
- `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md`
