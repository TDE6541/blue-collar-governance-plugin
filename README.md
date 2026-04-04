# Blue Collar Governance Plugin

A Claude Code plugin that enforces governance rules through deterministic local hooks — not just prompt instructions.

## What This Does

This plugin adds a runtime governance layer to Claude Code sessions:

- **Fail-closed command hooks** over `Bash`, `Write`, and `Edit` — dangerous actions are blocked before execution, not after
- **Control rod profiles** that classify every tool action against configurable domain rules (pricing, customer data, auth, destructive ops, and more)
- **Session closeout gating** — the session cannot close cleanly if unresolved blocking findings exist
- **Governance state preservation** — enforcement state survives context compaction and session restarts
- **28 operator-facing skills** for inspecting governance posture, forensic history, safety interlocks, and session health during a live session

## Why This Exists

Prompt-based instructions alone do not reliably prevent dangerous actions at the moment a tool runs. They can be compacted away, ignored under pressure, or simply not loaded.

This plugin exists to make the load-bearing governance seams deterministic and local:

- A hook that runs real code before every `Bash`, `Write`, or `Edit` call
- Classification logic that maps tool actions to protected domains
- Deny decisions that fire before the tool executes, not after
- State that persists through compaction so enforcement doesn't silently disappear mid-session

## How It Works

The plugin registers hooks for eleven Claude Code lifecycle events:

| Event | What happens |
|-------|-------------|
| **SessionStart** | Injects governance context; rehydrates state after compaction |
| **PreCompact** | Preserves governance state before context compaction |
| **PreToolUse** | Classifies the tool action; denies HARD_STOP domains; asks on SUPERVISED |
| **PermissionRequest** | Resolves permission dialogs against the active control rod profile |
| **Stop** | Evaluates a Foreman's Walk; blocks closeout if blocking findings exist |
| **PostToolUse** | Records completed tool actions on classified domains to the forensic chain |
| **PostToolUseFailure** | Records failed tool actions on classified domains to the forensic chain |
| **ConfigChange** | Detects governance config mutation; records to forensic chain |
| **CwdChanged** | Records working-directory changes; notes when outside project root |
| **FileChanged** | Detects external changes to governance-relevant files; records to forensic chain |
| **InstructionsLoaded** | Records instruction-file load events for governance-layer presence observability |

Every hook path fails closed on internal error — a crash produces a deny/block decision, never a silent pass-through.

### Control Rod Profiles

The plugin ships three starter profiles that define autonomy levels per domain:

| Profile | HARD_STOP domains | SUPERVISED domains | FULL_AUTO domains |
|---------|-------------------|--------------------|-------------------|
| **conservative** | 5 (pricing, customer data, schema, auth, destructive ops) | 4 (existing files, new files, UI/styling, tests) | 1 (documentation) |
| **balanced** | 4 | 2 | 4 |
| **velocity** | 2 | 3 | 5 |

Custom profiles are supported through the same domain-rule structure.

## How to Use It

### Plugin Mode

Load the repo as a local Claude Code plugin:

```bash
claude --plugin-dir /path/to/blue-collar-governance-plugin
```

This registers the hooks and makes the 28 skills available as `/blue-collar-governance-plugin:<skill-name>`.

### Standalone Repo Mode

The plugin also works as a standalone project-local governance layer through:

- `.claude/settings.json` — hook registration and deny rules
- `.claude/hooks/run-governance-hook.js` — hook entrypoint

### Mode Boundary

Plugin mode and standalone mode are alternate loading paths. Do not run both simultaneously in the same session unless you have explicitly verified that combination — duplicate hook execution is possible.

### Configuration

The active profile and matched tools are configured in `.claude/settings.json`:

```json
{
  "blueCollarGovernance": {
    "hookRuntime": {
      "profileId": "conservative",
      "matchedTools": ["Bash", "Write", "Edit"],
      "stateDirectory": ".claude/runtime",
      "blockingSeverities": ["CRITICAL", "HIGH"]
    }
  }
}
```

## What Ships Today

- Claude plugin manifest at `.claude-plugin/plugin.json`
- Plugin hook registry at `hooks/hooks.json`
- Fail-closed hook runtime at `src/HookRuntime.js` and `src/HookRuntimeSlice2.js`
- 28 operator-facing skills under `skills/<name>/SKILL.md`
- Standalone compatibility path at `.claude/settings.json`
- Runtime governance engines under `src/`
- 337 passing golden tests under `tests/golden/`

## What This Does Not Do

- **No npm package or marketplace install.** There is no `package.json`. Load the repo directly with `--plugin-dir`.
- **No Agent tool governance.** Hooks cover `Bash`, `Write`, and `Edit` only. `Agent` spawn semantics are not classified.
- **No HTTP hooks or LLM-based decisions.** All hook logic is deterministic local code. No network calls, no model queries.
- **No universal project compatibility claim.** The plugin has been proven on its own repo and on one foreign production repo. Broader compatibility is not yet validated.
- **No multi-agent governance.** This is single-session, single-operator enforcement.

## Proof

- **Golden tests:** 337 tests, 0 failures (`node --test tests/golden/*.golden.test.js`)
- **Live enforcement proof:** A real `Write` to a pricing file on a foreign repo was classified into `pricing_quote_logic`, resolved to `HARD_STOP`, denied by `PreToolUse`, and never executed.
- **Compaction survival proof:** Governance state is preserved through `PreCompact` and rehydrated on `SessionStart` with source `compact`.
- **Fail-closed proof:** Corrupted state files, unknown hook events, and internal errors all produce deny/block decisions — never silent pass-through.

Detailed proof documentation:

- `docs/PLUGIN_CONVERSION_PROOF.md` — plugin validation and local smoke runbook
- `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md` — hook runtime contract baseline

## Repository Layout

```text
.
├── .claude-plugin/        # Claude plugin manifest
├── hooks/                 # Plugin hook registry and wrapper
├── .claude/               # Standalone path, project settings, deny rules
├── skills/                # 28 operator-facing skills
├── src/                   # Runtime governance engines and hook runtime
├── tests/                 # Golden (337) and live verification
├── docs/                  # Specs, proof artifacts, and indexes
│   └── specs/             # Canonical contract baselines
└── raw/                   # Reference-only methodology inputs (not canon)
```

## License

[MIT](LICENSE)

## Start Here

1. `CLAUDE.md` — AI operating posture and repo truth
2. `TEAM_CHARTER.md` — governance doctrine
3. `CONTRIBUTING.md` — contribution rules
4. `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md` — hook runtime contract
5. `REPO_INDEX.md` — full repo navigation map
