# Blue Collar Governance Plugin

Blue Collar Governance Plugin is a real Claude Code plugin artifact built from the signed-off Wave 5 repo without changing the underlying governance engines.

**Status:** Plugin structure is shipped locally: `.claude-plugin/plugin.json`, `hooks/hooks.json`, plugin-discoverable `skills/<name>/SKILL.md`, and a plugin-root hook entrypoint now exist. The existing standalone repo path under `.claude/` is still preserved. Wave 6A fail-closed hook hardening is in progress. `package.json`, npm/package publish flow, marketplace install flow, and end-to-end compatibility claims are still not shipped.

## What This Is

This repository now ships two honest things at once:

- a governed runtime/control layer with deterministic local hook enforcement
- a Claude Code plugin artifact that exposes the shipped hook and skill surfaces in plugin format

It is still the same governed repo. This sprint converted the structure so the repo can be loaded as a plugin without inventing new engine behavior.

## Why Prompt-Only Governance Is Not Enough

Prompt text alone does not reliably enforce dangerous-action posture at the moment a tool runs, survive compaction, or gate closeout against unresolved blocking findings.

This repo exists to ship those load-bearing seams as deterministic local behavior:

- fail-closed command hooks over `Bash`, `Write`, and `Edit`
- bounded `SessionStart` re-injection and `PreCompact` preservation
- `Stop` closeout gating through existing `ForemansWalk` truth
- namespaced skills over existing runtime truth instead of hidden behavior inside prompts

## What Ships Today

- Claude plugin manifest at `.claude-plugin/plugin.json`
- Plugin hook registry at `hooks/hooks.json`
- Plugin hook wrapper at `hooks/run-governance-hook.js`
- 26 skills in plugin format under `skills/<name>/SKILL.md`
- Existing standalone compatibility path at `.claude/settings.json` and `.claude/hooks/run-governance-hook.js`
- Existing runtime modules under `src/`
- Existing hook/runtime proof at `tests/golden/HookRuntime.golden.test.js` and `tests/live/wave5.hook-runtime.live.test.js`

## Use It Today

### Plugin Mode

Load the repo directly as a local plugin artifact:

```powershell
claude --plugin-dir "C:\dev\Blue Collar Governance Plugin"
```

Then run:

1. `/reload-plugins`
2. `/blue-collar-governance-plugin:toolbox-talk`
3. `/hooks`

That path proves plugin discovery, namespaced skill loading, and hook registration visibility.

### Standalone Repo Mode

The existing standalone path still works through:

- `.claude/settings.json`
- `.claude/hooks/run-governance-hook.js`

This remains the repo’s original project-local runtime path.

### Important Mode Boundary

Do not treat plugin mode and standalone mode as one merged setup in the same host-project session unless that combination is explicitly proven.

Today’s honest posture is:

- standalone mode is preserved
- plugin mode is added
- if both hook registration paths are active together, duplicate hook execution risk exists

## Deny-Rule Truth

The plugin ships hooks and skills.

The repo’s current deny-first posture does **not** fully move into plugin-shipped defaults. Project-level `permissions.deny` remains a host-project configuration step when you want the same hard-stop deny layer the standalone repo currently uses.

That means the honest install story today is:

- plugin artifact: shipped
- hook and skill structure: shipped
- deny-rule layer: still an explicit project-settings step

## What Is Not Claimed

- No `package.json`
- No npm install or package publish flow
- No marketplace-ready claim
- No `claude plugin install <name>` claim for this repo
- No HTTP hooks, LLM hook decisions, or Agent hook governance beyond the current shipped Slice 2 scope

## Proof And Runbook

- `docs/PLUGIN_CONVERSION_PROOF.md` - plugin conversion proof, validation notes, and local smoke runbook
- `docs/WAVE5_ONBOARDING_RUNTIME_PROOF.md` - current runtime startup and proof posture
- `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md` - authoritative hook/runtime contract baseline
- `docs/WAVE5_CLOSEOUT.md` - Wave 5 runtime closeout evidence map

## Repository Layout

```text
.
├── .claude-plugin/                # Claude plugin manifest
├── hooks/                         # Plugin hook registry + plugin-root hook wrapper
├── .claude/                       # Standalone compatibility path, project settings, deny rules, runtime state
├── skills/                        # Plugin-discoverable skills/<name>/SKILL.md
├── src/                           # Runtime implementation
├── tests/                         # Golden + live verification
├── docs/                          # Canon specs, proof, and maintenance indexes
└── raw/                           # Reference-only inputs, not canon
```

## Start Here

1. `CLAUDE.md`
2. `TEAM_CHARTER.md`
3. `AI_EXECUTION_DOCTRINE.md`
4. `docs/PLUGIN_CONVERSION_PROOF.md`
5. `docs/WAVE5_ONBOARDING_RUNTIME_PROOF.md`
6. `REPO_INDEX.md`
