# PLUGIN_CONVERSION_PROOF.md
**Status:** Canonical plugin conversion proof and local smoke runbook
**Date:** 2026-04-02
**Audience:** Architect, operators, maintainers

## Purpose

This artifact records what the plugin conversion sprint actually shipped, what was validated in this environment, and what still depends on local host-project setup.

## Shipped Plugin Surfaces

- `.claude-plugin/plugin.json`
- `hooks/hooks.json`
- `hooks/run-governance-hook.js`
- `skills/<name>/SKILL.md` for all 26 shipped skills

The existing standalone path remains present at:

- `.claude/settings.json`
- `.claude/hooks/run-governance-hook.js`

## Mode Truth

Two truthful modes now exist:

1. Standalone repo mode through `.claude/settings.json`
2. Plugin mode through `--plugin-dir` or future plugin installation

These should currently be treated as alternate modes.

Reason:

- plugin hooks merge with project hooks when both are active
- this repo still preserves standalone hook registration under `.claude/settings.json`
- duplicate hook execution risk exists if both registration paths are loaded in the same host-project session

## Deny-Rule Truth

The plugin artifact ships hooks and skills.

The repo's current deny-first posture still depends on host-project `.claude/settings.json`:

- `permissions.deny` remains project-level
- plugin root `settings.json` was not added because current Claude plugin defaults only support agent settings

The honest current install story is:

- plugin behavior surfaces: shipped
- deny-rule delivery: explicit post-install host-project configuration step

## Validation Executed In This Environment

| Command | Result |
|---|---|
| `claude --version` | PASS (`2.0.76`) |
| `claude plugin --help` | PASS |
| `claude plugin validate .` | FAIL in this environment; Claude Code still reported it could not find `CLAUDE_CODE_GIT_BASH_PATH` even when set to `C:\Program Files\Git\bin\bash.exe` |

## Windows Validation Preflight

If Claude Code is installed on Windows but `claude plugin validate` fails with the git-bash error, first try:

```powershell
$env:CLAUDE_CODE_GIT_BASH_PATH = 'C:\Program Files\Git\bin\bash.exe'
```

Then rerun:

```powershell
claude plugin validate .
```

Current environment note: that exact preflight still returned `Claude Code was unable to find CLAUDE_CODE_GIT_BASH_PATH path "C:\Program Files\Git\bin\bash.exe"`, so validator proof remains blocked here.

## Local Smoke Runbook

Use a neutral host project or test directory when possible so the repoâ€™s standalone project hooks are not loaded alongside plugin hooks by accident.

### Minimal plugin smoke path

```powershell
claude --plugin-dir "C:\dev\Blue Collar Governance Plugin"
```

Inside Claude Code:

1. `/reload-plugins`
2. `/blue-collar-governance-plugin:toolbox-talk`
3. `/hooks`

Expected truth:

- the namespaced skill resolves
- plugin hooks appear in `/hooks`
- plugin hook registration points at `hooks/run-governance-hook.js`

### Host-project deny layer

If you want the same deny-first posture as the preserved standalone repo path, add the deny rules from this repoâ€™s `.claude/settings.json` to the host projectâ€™s `.claude/settings.json`.

## Narrow HOLD Boundary

If local live smoke is not run to completion, the remaining HOLD is narrow:

- plugin structure is shipped
- plugin validation can still be run locally
- host-project deny rules remain an explicit documented step
- only live Claude-session smoke remains to be confirmed


