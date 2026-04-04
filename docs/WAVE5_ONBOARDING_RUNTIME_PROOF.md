# WAVE5_ONBOARDING_RUNTIME_PROOF.md
**Status:** Canonical onboarding/runtime-proof surface for current shipped runtime and plugin-conversion posture
**Date:** 2026-04-02
**Audience:** Architect, operators, maintainers

## Purpose

This artifact is the onboarding and runtime-proof truth surface for the current shipped posture.

It describes:

- the preserved standalone repo startup path
- the additive plugin startup path
- what is shipped versus still not claimed
- which proof commands are real in this environment

## Current Startup Paths

### Standalone Repo Mode

1. Start a session in this repository root (`Blue Collar Governance Plugin`).
2. `SessionStart` runs the command hook configured in `.claude/settings.json`.
3. The hook entrypoint (`.claude/hooks/run-governance-hook.js`) reads event input from stdin and calls `runHookEvent` in `src/HookRuntime.js`.
4. `src/HookRuntime.js` resolves hook posture from project settings and applies deterministic command-hook governance over `Bash`, `Write`, and `Edit`.
5. `SessionStart` injects bounded governance context only (profile, bounded counts, latest stop/walk posture) with no transcript replay.
6. `PreCompact` writes bounded preservation state under `.claude/runtime/_compaction-preserved.json`; later `SessionStart` with `compact` (and `resume` when needed) rehydrates from that state via `src/HookRuntimeSlice2.js`.
7. `Stop` remains gated through existing `ForemansWalk` findings and blocks closeout on unresolved blocking posture.

### Plugin Mode

1. Start Claude Code from a neutral host project or test directory.
2. Load this repo as a plugin with `claude --plugin-dir "C:\dev\Blue Collar Governance Plugin"`.
3. Claude reads `.claude-plugin/plugin.json`, discovers `skills/<name>/SKILL.md`, and registers hooks from `hooks/hooks.json`.
4. The plugin hook wrapper (`hooks/run-governance-hook.js`) delegates to the shipped hook runtime entrypoint, which still runs through `src/HookRuntime.js` and `src/HookRuntimeSlice2.js`.
5. If the host project provides `.claude/settings.json`, the runtime reads that file for project-level deny rules and hook runtime posture; otherwise the runtime falls back to the shipped default profile behavior.

## Mode Boundary

Plugin mode and standalone mode are both real.

They should currently be treated as alternate modes, not as one merged setup in the same host-project session, because plugin hooks and project hooks can both register if they are loaded together.

## Shipped Vs Pending

| Area | Current Truth |
|---|---|
| Hook runtime enforcement | Shipped through Wave 6B: 11 lifecycle events (`SessionStart`, `PreCompact`, `PreToolUse`, `PermissionRequest`, `Stop`, `PostToolUse`, `PostToolUseFailure`, `ConfigChange`, `CwdChanged`, `FileChanged`, `InstructionsLoaded`) |
| Compaction survival | Shipped (`PreCompact` preservation + bounded `SessionStart` re-injection for `startup`, `compact`, `resume`) |
| Command-hook posture | Shipped as local deterministic fail-closed logic only |
| Plugin artifact structure | Shipped locally (`.claude-plugin/plugin.json`, `hooks/hooks.json`, `skills/<name>/SKILL.md`) |
| Deny-rule delivery | Still project-level host-project configuration |
| Agent/HTTP/LLM hook decisions | Not shipped |
| Marketplace/install command surface | Not shipped / not claimed |

## Package/Install Posture (Explicit)

- `package.json` is absent in this repo.
- There is no canonical `npm install` or package-publish path claimed for this repo.
- The honest plugin install story today is directory-based local loading with `--plugin-dir`.
- Marketplace install and public distribution remain separate future work.

## Reproducible Runtime Proof Snapshot

| Command | Result (2026-04-02) |
|---|---|
| `node --test tests/golden/HookRuntime.golden.test.js` | PASS (`10` passed, `0` failed) |
| `node --test tests/live/wave5.hook-runtime.live.test.js` | PASS (`3` passed, `0` failed) |
| `claude --version` | PASS (`2.0.76`) |
| `claude plugin --help` | PASS |
| `if (Test-Path 'package.json') { 'PACKAGE_JSON_PRESENT' } else { 'PACKAGE_JSON_ABSENT' }` | `PACKAGE_JSON_ABSENT` |

## Validation Notes

- `claude plugin validate .` is available in this environment, but Claude Code on Windows still reported `Claude Code was unable to find CLAUDE_CODE_GIT_BASH_PATH path "C:\Program Files\Git\bin\bash.exe"` even after that environment variable was set.
- See `docs/PLUGIN_CONVERSION_PROOF.md` for the exact validator output, preflight note, and smoke commands.

## Runtime Truth Surfaces

- `.claude-plugin/plugin.json`
- `hooks/hooks.json`
- `hooks/run-governance-hook.js`
- `.claude/settings.json`
- `.claude/hooks/run-governance-hook.js`
- `src/HookRuntime.js`
- `src/HookRuntimeSlice2.js`
- `tests/golden/HookRuntime.golden.test.js`
- `tests/live/wave5.hook-runtime.live.test.js`
- `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md`
- `docs/PLUGIN_CONVERSION_PROOF.md`
