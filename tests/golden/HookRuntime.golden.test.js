"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  DEFAULT_PROFILE_ID,
  KNOWN_HOOK_EVENTS,
  PROJECT_HARD_STOP_DENY_RULES,
  createEmptySessionState,
  getCompactionStateFilePath,
  getStateFilePath,
  loadSessionState,
  resolveRuntimeConfig,
  runHookEvent,
  saveSessionState,
} = require("../../src/HookRuntime");

function makeTempProject() {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "bcgp-hook-runtime-"));
  fs.mkdirSync(path.join(projectDir, ".claude"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "docs"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, ".claude", "settings.json"),
    JSON.stringify(
      {
        blueCollarGovernance: {
          hookRuntime: {
            profileId: "conservative",
            stateDirectory: ".claude/runtime",
            matchedTools: ["Bash", "Write", "Edit"],
            blockingSeverities: ["CRITICAL", "HIGH"],
          },
        },
      },
      null,
      2
    )
  );
  fs.writeFileSync(path.join(projectDir, "docs", "note.md"), "hello\n");
  fs.writeFileSync(path.join(projectDir, "src", "pricing-engine.js"), "module.exports = {};\n");
  fs.writeFileSync(path.join(projectDir, "src", "worker.js"), "module.exports = {};\n");
  return projectDir;
}

function forceHardStopObservedAction(state, timestamp = "2026-04-02T12:15:00Z") {
  state.observedActions.push({
    fingerprint: "forced-hard-stop-action",
    toolName: "Edit",
    workItem: "Edit src/pricing-engine.js",
    domainId: "pricing_quote_logic",
    domainLabel: "Pricing / quote logic",
    autonomyLevel: "HARD_STOP",
    operationType: "change_rules",
    relativePath: "src/pricing-engine.js",
    approvalState: "permission_user_review",
    firstObservedAt: timestamp,
    lastObservedAt: timestamp,
  });
}

test("HookRuntime resolves conservative runtime config by default", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);

  assert.equal(DEFAULT_PROFILE_ID, "conservative");
  assert.equal(config.profile.profileId, "conservative");
  assert.deepEqual(PROJECT_HARD_STOP_DENY_RULES, [
    "Bash(rm *)",
    "Bash(del *)",
    "Bash(rd *)",
    "Bash(rmdir *)",
    "Bash(Remove-Item *)",
    "Bash(git clean *)",
    "Bash(git reset --hard *)",
    "Edit(/**/*pricing*.*)",
    "Edit(/**/*quote*.*)",
    "Edit(/**/*customer*.*)",
    "Edit(/**/*pii*.*)",
    "Edit(/**/*schema*.*)",
    "Edit(/migrations/**)",
    "Edit(/**/*auth*.*)",
    "Edit(/**/*security*.*)",
  ]);
});

test("HookRuntime SessionStart startup injects bounded governance context", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "SessionStart",
    {
      session_id: "session-startup",
      cwd: projectDir,
      hook_event_name: "SessionStart",
      source: "startup",
    },
    {
      projectDir,
      now: "2026-04-02T11:59:00Z",
    }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "SessionStart");
  assert.match(result.hookSpecificOutput.additionalContext, /Source=startup/);
  assert.match(result.hookSpecificOutput.additionalContext, /Profile=conservative/);

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-startup");
  assert.equal(state.sessionStart.source, "startup");
  assert.equal(state.recovery.status, "not_required");
});

test("HookRuntime PreToolUse denies HARD_STOP pricing edits and records blocked attempt", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "PreToolUse",
    {
      session_id: "session-pretool-deny",
      cwd: projectDir,
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectDir, "src", "pricing-engine.js"),
        old_string: "module.exports = {};",
        new_string: "module.exports = { changed: true };",
      },
    },
    {
      projectDir,
      now: "2026-04-02T12:00:00Z",
    }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(result.hookSpecificOutput.permissionDecision, "deny");
  assert.match(result.hookSpecificOutput.permissionDecisionReason, /HARD_STOP/);

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-pretool-deny");
  assert.equal(state.blockedAttempts.length, 1);
  assert.equal(state.blockedAttempts[0].domainId, "pricing_quote_logic");
});

test("HookRuntime PermissionRequest auto-allows FULL_AUTO documentation writes", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "PermissionRequest",
    {
      session_id: "session-permission-allow",
      cwd: projectDir,
      hook_event_name: "PermissionRequest",
      tool_name: "Write",
      tool_input: {
        file_path: path.join(projectDir, "docs", "guide.md"),
        content: "# guide\n",
      },
    },
    {
      projectDir,
      now: "2026-04-02T12:05:00Z",
    }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "PermissionRequest");
  assert.equal(result.hookSpecificOutput.decision.behavior, "allow");

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-permission-allow");
  assert.equal(state.observedActions.length, 1);
  assert.equal(state.observedActions[0].domainId, "documentation_comments");
  assert.equal(state.observedActions[0].approvalState, "permission_full_auto_allow");
});

test("HookRuntime PermissionRequest preserves SUPERVISED approval flow for existing file edits", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "PermissionRequest",
    {
      session_id: "session-permission-supervised",
      cwd: projectDir,
      hook_event_name: "PermissionRequest",
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectDir, "src", "worker.js"),
        old_string: "module.exports = {};",
        new_string: "module.exports = { worker: true };",
      },
    },
    {
      projectDir,
      now: "2026-04-02T12:10:00Z",
    }
  );

  assert.deepEqual(result, {});

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-permission-supervised");
  assert.equal(state.observedActions.length, 1);
  assert.equal(state.observedActions[0].domainId, "existing_file_modification");
  assert.equal(state.observedActions[0].approvalState, "permission_user_review");
});

test("HookRuntime PreCompact preserves state and SessionStart compact rehydrates it", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);

  const sourceState = createEmptySessionState("session-before-compact", config.profile);
  forceHardStopObservedAction(sourceState, "2026-04-02T12:15:00Z");
  sourceState.lastWalk = {
    evaluatedAt: "2026-04-02T12:16:00Z",
    findingSummary: {
      CRITICAL: 1,
    },
    findings: [
      {
        issueRef: "hook_action_1",
        findingType: "OUT_OF_SCOPE",
        severity: "CRITICAL",
        summary: "Forced recovery finding.",
      },
    ],
  };
  saveSessionState(config, "session-before-compact", sourceState);

  const preCompact = runHookEvent(
    "PreCompact",
    {
      session_id: "session-before-compact",
      cwd: projectDir,
      hook_event_name: "PreCompact",
      trigger: "manual",
      custom_instructions: "",
    },
    {
      projectDir,
      now: "2026-04-02T12:17:00Z",
    }
  );

  assert.deepEqual(preCompact, {});
  assert.equal(fs.existsSync(getCompactionStateFilePath(config)), true);

  const sessionStart = runHookEvent(
    "SessionStart",
    {
      session_id: "session-after-compact",
      cwd: projectDir,
      hook_event_name: "SessionStart",
      source: "compact",
    },
    {
      projectDir,
      now: "2026-04-02T12:18:00Z",
    }
  );

  assert.match(sessionStart.hookSpecificOutput.additionalContext, /Source=compact/);
  assert.match(sessionStart.hookSpecificOutput.additionalContext, /Recovery=Rehydrated/);

  const rehydratedState = loadSessionState(config, "session-after-compact");
  assert.equal(rehydratedState.recovery.status, "ok");
  assert.equal(rehydratedState.observedActions.length, 1);
  assert.equal(rehydratedState.observedActions[0].domainId, "pricing_quote_logic");

  const stopResult = runHookEvent(
    "Stop",
    {
      session_id: "session-after-compact",
      cwd: projectDir,
      hook_event_name: "Stop",
      stop_hook_active: false,
    },
    {
      projectDir,
      now: "2026-04-02T12:19:00Z",
    }
  );

  assert.equal(stopResult.decision, "block");
});

test("HookRuntime SessionStart compact without preserved state enters recovery HOLD and Stop blocks", () => {
  const projectDir = makeTempProject();

  const sessionStart = runHookEvent(
    "SessionStart",
    {
      session_id: "session-compact-missing",
      cwd: projectDir,
      hook_event_name: "SessionStart",
      source: "compact",
    },
    {
      projectDir,
      now: "2026-04-02T12:22:00Z",
    }
  );

  assert.match(sessionStart.hookSpecificOutput.additionalContext, /RecoveryHOLD=missing/);

  const config = resolveRuntimeConfig(projectDir);
  const state = loadSessionState(config, "session-compact-missing");
  assert.equal(state.recovery.status, "missing");

  const stopResult = runHookEvent(
    "Stop",
    {
      session_id: "session-compact-missing",
      cwd: projectDir,
      hook_event_name: "Stop",
      stop_hook_active: false,
    },
    {
      projectDir,
      now: "2026-04-02T12:23:00Z",
    }
  );

  assert.equal(stopResult.decision, "block");
  assert.match(stopResult.reason, /Foreman's Walk gate blocked closeout/);
});

test("HookRuntime SessionStart compact with malformed preserved state enters recovery HOLD", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  fs.mkdirSync(path.dirname(getCompactionStateFilePath(config)), { recursive: true });
  fs.writeFileSync(getCompactionStateFilePath(config), "{bad json", "utf8");

  const sessionStart = runHookEvent(
    "SessionStart",
    {
      session_id: "session-compact-malformed",
      cwd: projectDir,
      hook_event_name: "SessionStart",
      source: "compact",
    },
    {
      projectDir,
      now: "2026-04-02T12:24:00Z",
    }
  );

  assert.match(sessionStart.hookSpecificOutput.additionalContext, /RecoveryHOLD=malformed/);

  const state = loadSessionState(config, "session-compact-malformed");
  assert.equal(state.recovery.status, "malformed");

  const stopResult = runHookEvent(
    "Stop",
    {
      session_id: "session-compact-malformed",
      cwd: projectDir,
      hook_event_name: "Stop",
      stop_hook_active: false,
    },
    {
      projectDir,
      now: "2026-04-02T12:25:00Z",
    }
  );

  assert.equal(stopResult.decision, "block");
});

test("HookRuntime Stop blocks once on blocking Walk findings and then respects stop loop guard", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  const state = createEmptySessionState("session-stop-block", config.profile);

  forceHardStopObservedAction(state, "2026-04-02T12:15:00Z");
  saveSessionState(config, "session-stop-block", state);

  const first = runHookEvent(
    "Stop",
    {
      session_id: "session-stop-block",
      cwd: projectDir,
      hook_event_name: "Stop",
      stop_hook_active: false,
      last_assistant_message: "closing",
    },
    {
      projectDir,
      now: "2026-04-02T12:20:00Z",
    }
  );

  assert.equal(first.decision, "block");
  assert.match(first.reason, /Foreman's Walk gate blocked closeout/);

  const second = runHookEvent(
    "Stop",
    {
      session_id: "session-stop-block",
      cwd: projectDir,
      hook_event_name: "Stop",
      stop_hook_active: true,
      last_assistant_message: "closing again",
    },
    {
      projectDir,
      now: "2026-04-02T12:21:00Z",
    }
  );

  assert.deepEqual(second, {});
});

test("HookRuntime persists session state under the configured runtime directory", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  const state = createEmptySessionState("session-state-path", config.profile);

  saveSessionState(config, "session-state-path", state);

  assert.equal(fs.existsSync(getStateFilePath(config, "session-state-path")), true);
});

// --- Wave 6A Slice 3: Fail-Closed Hardening Tests ---

test("HookRuntime PreToolUse fails closed with deny on corrupted state file", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  const statePath = getStateFilePath(config, "session-pretool-corrupt");
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, "{bad json", "utf8");

  const result = runHookEvent(
    "PreToolUse",
    {
      session_id: "session-pretool-corrupt",
      cwd: projectDir,
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectDir, "src", "pricing-engine.js"),
        old_string: "module.exports = {};",
        new_string: "module.exports = { changed: true };",
      },
    },
    {
      projectDir,
      now: "2026-04-02T13:00:00Z",
    }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(result.hookSpecificOutput.permissionDecision, "deny");
  assert.match(result.hookSpecificOutput.permissionDecisionReason, /FAIL_CLOSED/);
});

test("HookRuntime PermissionRequest fails closed with deny on corrupted state file", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  const statePath = getStateFilePath(config, "session-perm-corrupt");
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, "{bad json", "utf8");

  const result = runHookEvent(
    "PermissionRequest",
    {
      session_id: "session-perm-corrupt",
      cwd: projectDir,
      hook_event_name: "PermissionRequest",
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectDir, "src", "pricing-engine.js"),
        old_string: "module.exports = {};",
        new_string: "module.exports = { changed: true };",
      },
    },
    {
      projectDir,
      now: "2026-04-02T13:01:00Z",
    }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "PermissionRequest");
  assert.equal(result.hookSpecificOutput.decision.behavior, "deny");
  assert.match(result.hookSpecificOutput.decision.message, /FAIL_CLOSED/);
});

test("HookRuntime Stop fails closed with block on corrupted state file", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  const statePath = getStateFilePath(config, "session-stop-corrupt");
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, "{bad json", "utf8");

  const result = runHookEvent(
    "Stop",
    {
      session_id: "session-stop-corrupt",
      cwd: projectDir,
      hook_event_name: "Stop",
      stop_hook_active: false,
    },
    {
      projectDir,
      now: "2026-04-02T13:02:00Z",
    }
  );

  assert.equal(result.decision, "block");
  assert.match(result.reason, /FAIL_CLOSED/);
});

test("HookRuntime rejects unknown hook event names", () => {
  const projectDir = makeTempProject();

  assert.throws(
    () => {
      runHookEvent(
        "PostToolUse",
        {
          session_id: "session-unknown-event",
          cwd: projectDir,
          hook_event_name: "PostToolUse",
        },
        {
          projectDir,
        }
      );
    },
    (error) => {
      assert.match(error.message, /FAIL_CLOSED/);
      assert.match(error.message, /Unknown hook event/);
      return true;
    }
  );
});

test("HookRuntime KNOWN_HOOK_EVENTS contains exactly the eight governed events", () => {
  assert.equal(KNOWN_HOOK_EVENTS.size, 8);
  assert.equal(KNOWN_HOOK_EVENTS.has("SessionStart"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("PreCompact"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("PreToolUse"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("PermissionRequest"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("Stop"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("ConfigChange"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("CwdChanged"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("FileChanged"), true);
});

// --- Wave 6A Block B: Enforcement Matrix v1 Tests ---

test("HookRuntime ConfigChange records observation and returns advisory context", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "ConfigChange",
    {
      session_id: "session-config-change",
      cwd: projectDir,
      hook_event_name: "ConfigChange",
      source: "settings.json",
    },
    {
      projectDir,
      now: "2026-04-03T10:00:00Z",
    }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "ConfigChange");
  assert.match(result.hookSpecificOutput.additionalContext, /config change detected/i);
  assert.match(result.hookSpecificOutput.additionalContext, /source=settings\.json/);

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-config-change");
  const configAction = state.observedActions.find(
    (a) => a.operationType === "config_change"
  );
  assert.ok(configAction, "Should record a config_change observation");
  assert.equal(configAction.domainId, "auth_security_surfaces");
});

test("HookRuntime ConfigChange does not return a blocking decision", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "ConfigChange",
    {
      session_id: "session-config-no-block",
      cwd: projectDir,
      hook_event_name: "ConfigChange",
      source: "settings.json",
    },
    {
      projectDir,
      now: "2026-04-03T10:01:00Z",
    }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "ConfigChange");
  assert.equal(result.decision, undefined);
  assert.equal(
    result.hookSpecificOutput.permissionDecision,
    undefined
  );
});

test("HookRuntime ConfigChange fails closed with advisory on corrupted state", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  const statePath = getStateFilePath(config, "session-config-corrupt");
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, "{bad json", "utf8");

  const result = runHookEvent(
    "ConfigChange",
    {
      session_id: "session-config-corrupt",
      cwd: projectDir,
      hook_event_name: "ConfigChange",
      source: "settings.json",
    },
    {
      projectDir,
      now: "2026-04-03T10:02:00Z",
    }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "ConfigChange");
  assert.match(result.hookSpecificOutput.additionalContext, /FAIL_CLOSED/);
});

test("HookRuntime CwdChanged records directory change and returns advisory", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "CwdChanged",
    {
      session_id: "session-cwd-change",
      cwd: projectDir,
      hook_event_name: "CwdChanged",
    },
    {
      projectDir,
      now: "2026-04-03T10:03:00Z",
    }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "CwdChanged");
  assert.match(result.hookSpecificOutput.additionalContext, /Working directory changed/);

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-cwd-change");
  assert.ok(state.lastCwdChange, "Should record lastCwdChange");
  assert.equal(state.lastCwdChange.changedAt, "2026-04-03T10:03:00Z");
});

test("HookRuntime CwdChanged notes when new directory is outside project root", () => {
  const projectDir = makeTempProject();
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "bcgp-outside-"));

  const result = runHookEvent(
    "CwdChanged",
    {
      session_id: "session-cwd-outside",
      cwd: outsideDir,
      hook_event_name: "CwdChanged",
    },
    {
      projectDir,
      now: "2026-04-03T10:04:00Z",
    }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "CwdChanged");
  assert.match(result.hookSpecificOutput.additionalContext, /outside project root/);
});

test("HookRuntime CwdChanged fails closed with advisory on corrupted state", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  const statePath = getStateFilePath(config, "session-cwd-corrupt");
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, "{bad json", "utf8");

  const result = runHookEvent(
    "CwdChanged",
    {
      session_id: "session-cwd-corrupt",
      cwd: projectDir,
      hook_event_name: "CwdChanged",
    },
    {
      projectDir,
      now: "2026-04-03T10:05:00Z",
    }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "CwdChanged");
  assert.match(result.hookSpecificOutput.additionalContext, /FAIL_CLOSED/);
});

test("HookRuntime FileChanged records observation and returns advisory", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "FileChanged",
    {
      session_id: "session-file-change",
      cwd: projectDir,
      hook_event_name: "FileChanged",
      source: ".claude/settings.json",
    },
    {
      projectDir,
      now: "2026-04-03T10:06:00Z",
    }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "FileChanged");
  assert.match(result.hookSpecificOutput.additionalContext, /file changed externally/i);

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-file-change");
  const fileAction = state.observedActions.find(
    (a) => a.operationType === "external_file_change"
  );
  assert.ok(fileAction, "Should record an external_file_change observation");
  assert.equal(fileAction.domainId, "auth_security_surfaces");
});

test("HookRuntime FileChanged fails closed with advisory on corrupted state", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  const statePath = getStateFilePath(config, "session-file-corrupt");
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, "{bad json", "utf8");

  const result = runHookEvent(
    "FileChanged",
    {
      session_id: "session-file-corrupt",
      cwd: projectDir,
      hook_event_name: "FileChanged",
      source: ".claude/settings.json",
    },
    {
      projectDir,
      now: "2026-04-03T10:07:00Z",
    }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "FileChanged");
  assert.match(result.hookSpecificOutput.additionalContext, /FAIL_CLOSED/);
});