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

function buildTestAuthorization(sessionId, domainId = "pricing_quote_logic") {
  return {
    authorizationId: `test_auth_${domainId}`,
    domainId,
    authorizedBy: "test-operator",
    authorizedAt: "2026-04-03T09:00:00Z",
    reason: "Test authorization for golden test",
    scope: { scopeType: "SESSION", sessionId },
    conditions: [],
    chainRef: `chain_auth_${domainId}`,
  };
}

function buildTestPermit(sessionId, domainId = "pricing_quote_logic", decision = "GRANTED") {
  return {
    permitId: `test_permit_${domainId}`,
    sessionId,
    requestedDomains: [domainId],
    scopeJustification: "Test permit for golden test",
    riskAssessment: "Low risk test scenario",
    rollbackPlan: "Revert the change",
    operatorDecision: decision,
    conditions: decision === "CONDITIONAL" ? ["must verify after"] : [],
    chainRef: `chain_permit_${domainId}`,
  };
}

function seedPermitState(projectDir, sessionId, domainId, decision) {
  const config = resolveRuntimeConfig(projectDir);
  const state = loadSessionState(config, sessionId);
  if (!Array.isArray(state.activeAuthorizations)) {
    state.activeAuthorizations = [];
  }
  if (!Array.isArray(state.activePermits)) {
    state.activePermits = [];
  }
  state.activeAuthorizations.push(buildTestAuthorization(sessionId, domainId));
  state.activePermits.push(buildTestPermit(sessionId, domainId, decision));
  saveSessionState(config, sessionId, state);
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
    "Edit(/**/auth.*)",
    "Edit(/**/auth-*.*)",
    "Edit(/**/auth_*.*)",
    "Edit(/**/*-auth.*)",
    "Edit(/**/*_auth.*)",
    "Edit(/**/*.auth.*)",
    "Edit(/**/*oauth*.*)",
    "Edit(/**/*authent*.*)",
    "Edit(/**/*authoriz*.*)",
    "Edit(/**/*authz*.*)",
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
  assert.deepEqual(state.persistedBrief.inScope, []);
  assert.deepEqual(state.persistedBrief.outOfScope, []);
  assert.equal(state.persistedBrief.source, "hook_runtime");
  assert.equal(state.persistedBrief.createdAt, "2026-04-02T11:59:00Z");
  assert.equal(state.persistedBrief.controlRodProfile.profileId, "conservative");
  assert.equal(state.persistedReceipt, null);
  assert.equal(state.lastFireBreak, null);
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
  assert.ok(rehydratedState.persistedBrief, "persistedBrief should exist after compact recovery");
  assert.equal(rehydratedState.persistedBrief.source, "hook_runtime");

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

  const stoppedState = loadSessionState(config, "session-after-compact");
  assert.ok(stoppedState.persistedReceipt, "persistedReceipt should be populated at Stop");
  assert.ok(stoppedState.lastWalk, "lastWalk should be populated at Stop");
  assert.ok(stoppedState.lastWalk.asBuilt, "lastWalk should include asBuilt");
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

  const stoppedState = loadSessionState(config, "session-compact-malformed");
  assert.ok(stoppedState.persistedReceipt, "persistedReceipt should be populated at Stop");
  assert.ok(stoppedState.lastWalk, "lastWalk should be populated at Stop");
  assert.ok(stoppedState.lastWalk.asBuilt, "lastWalk should include asBuilt");
});


test("HookRuntime Stop persists hook-derived receipt and full Walk cache for render", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-walk-persist";

  runHookEvent(
    "SessionStart",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "SessionStart",
      source: "startup",
    },
    {
      projectDir,
      now: "2026-04-02T12:26:00Z",
    }
  );

  runHookEvent(
    "PreToolUse",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      tool_input: {
        file_path: path.join(projectDir, "docs", "walk-note.md"),
        content: "# walk\n",
      },
    },
    {
      projectDir,
      now: "2026-04-02T12:27:00Z",
    }
  );

  runHookEvent(
    "PostToolUse",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: {
        file_path: path.join(projectDir, "docs", "walk-note.md"),
        content: "# walk\n",
      },
      tool_response: "File written.",
    },
    {
      projectDir,
      now: "2026-04-02T12:27:30Z",
    }
  );

  const stopResult = runHookEvent(
    "Stop",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "Stop",
      stop_hook_active: false,
    },
    {
      projectDir,
      now: "2026-04-02T12:28:00Z",
    }
  );

  assert.deepEqual(stopResult, {});

  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.equal(state.persistedBrief.source, "hook_runtime");
  assert.deepEqual(state.persistedBrief.inScope, []);
  assert.deepEqual(state.persistedBrief.outOfScope, []);
  assert.equal(state.persistedReceipt.source, "hook_runtime");
  assert.deepEqual(state.persistedReceipt.completedWork, ["Write docs/walk-note.md"]);
  assert.deepEqual(state.persistedReceipt.holdsRaised, []);
  assert.ok(state.lastWalk, "lastWalk should be populated after Stop");
  assert.ok(state.lastWalk.asBuilt, "lastWalk should include asBuilt");
  assert.equal(state.lastWalk.asBuilt.sessionOfRecordRef, state.persistedReceipt.receiptId);
  assert.equal(state.lastWalk.asBuilt.statusCounts.ADDED, 1);
});


test("HookRuntime Stop persists hook-derived fire-break snapshot with resolved precedence over blocked fingerprint", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-firebreak-dedupe";
  const editInput = {
    file_path: path.join(projectDir, "src", "pricing-engine.js"),
    old_string: "module.exports = {};",
    new_string: "module.exports = { changed: true };",
  };

  runHookEvent(
    "SessionStart",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "SessionStart",
      source: "startup",
    },
    {
      projectDir,
      now: "2026-04-04T11:00:00Z",
    }
  );

  const blocked = runHookEvent(
    "PreToolUse",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: editInput,
    },
    {
      projectDir,
      now: "2026-04-04T11:01:00Z",
    }
  );

  assert.equal(blocked.hookSpecificOutput.permissionDecision, "deny");

  seedPermitState(projectDir, sessionId, "pricing_quote_logic", "GRANTED");

  const permitted = runHookEvent(
    "PreToolUse",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: editInput,
    },
    {
      projectDir,
      now: "2026-04-04T11:02:00Z",
    }
  );

  assert.deepEqual(permitted, {});

  runHookEvent(
    "PostToolUse",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "PostToolUse",
      tool_name: "Edit",
      tool_input: editInput,
      tool_response: "File written.",
    },
    {
      projectDir,
      now: "2026-04-04T11:02:30Z",
    }
  );

  runHookEvent(
    "Stop",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "Stop",
      stop_hook_active: false,
    },
    {
      projectDir,
      now: "2026-04-04T11:03:00Z",
    }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.ok(state.lastFireBreak, "lastFireBreak should be populated after Stop");
  assert.equal(state.lastFireBreak.source, "hook_runtime");
  assert.equal(state.lastFireBreak.projectionType, "hook_runtime_governance_health_snapshot");
  assert.deepEqual(state.lastFireBreak.precedence, [
    "Resolved this session",
    "Aging into risk",
    "Still unresolved",
    "Missing now",
  ]);
  assert.equal(state.lastFireBreak.groups["Resolved this session"].length, 1);
  assert.equal(state.lastFireBreak.groups["Missing now"].length, 0);
  assert.equal(state.lastFireBreak.groups["Still unresolved"].length, 0);
  assert.equal(state.lastFireBreak.groups["Aging into risk"].length, 0);
  assert.equal(
    state.lastFireBreak.groups["Resolved this session"][0].stateLabel,
    "Hook-runtime governance passage"
  );
  assert.match(
    state.lastFireBreak.groups["Resolved this session"][0].summary,
    /permit-cleared HARD_STOP governance passage/
  );
});

test("HookRuntime lastFireBreak survives compaction and compact SessionStart rehydrates it", () => {
  const projectDir = makeTempProject();
  const sourceSessionId = "session-firebreak-compact-src";
  const targetSessionId = "session-firebreak-compact-dst";
  const editInput = {
    file_path: path.join(projectDir, "src", "pricing-engine.js"),
    old_string: "module.exports = {};",
    new_string: "module.exports = { changed: true };",
  };

  runHookEvent(
    "SessionStart",
    {
      session_id: sourceSessionId,
      cwd: projectDir,
      hook_event_name: "SessionStart",
      source: "startup",
    },
    {
      projectDir,
      now: "2026-04-04T11:10:00Z",
    }
  );

  seedPermitState(projectDir, sourceSessionId, "pricing_quote_logic", "GRANTED");

  assert.deepEqual(
    runHookEvent(
      "PreToolUse",
      {
        session_id: sourceSessionId,
        cwd: projectDir,
        hook_event_name: "PreToolUse",
        tool_name: "Edit",
        tool_input: editInput,
      },
      {
        projectDir,
        now: "2026-04-04T11:11:00Z",
      }
    ),
    {}
  );

  runHookEvent(
    "PostToolUse",
    {
      session_id: sourceSessionId,
      cwd: projectDir,
      hook_event_name: "PostToolUse",
      tool_name: "Edit",
      tool_input: editInput,
      tool_response: "File written.",
    },
    {
      projectDir,
      now: "2026-04-04T11:11:30Z",
    }
  );

  assert.deepEqual(
    runHookEvent(
      "Stop",
      {
        session_id: sourceSessionId,
        cwd: projectDir,
        hook_event_name: "Stop",
        stop_hook_active: false,
      },
      {
        projectDir,
        now: "2026-04-04T11:12:00Z",
      }
    ),
    {}
  );

  runHookEvent(
    "PreCompact",
    {
      session_id: sourceSessionId,
      cwd: projectDir,
      hook_event_name: "PreCompact",
      trigger: "manual",
    },
    {
      projectDir,
      now: "2026-04-04T11:13:00Z",
    }
  );

  runHookEvent(
    "SessionStart",
    {
      session_id: targetSessionId,
      cwd: projectDir,
      hook_event_name: "SessionStart",
      source: "compact",
    },
    {
      projectDir,
      now: "2026-04-04T11:14:00Z",
    }
  );

  const rehydrated = loadSessionState(resolveRuntimeConfig(projectDir), targetSessionId);
  assert.ok(rehydrated.lastFireBreak, "lastFireBreak should survive compaction");
  assert.equal(rehydrated.lastFireBreak.sessionId, sourceSessionId);
  assert.equal(rehydrated.lastFireBreak.groups["Resolved this session"].length, 1);
  assert.equal(rehydrated.lastFireBreak.groups["Missing now"].length, 0);
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

test("HookRuntime rejects remaining parked worktree hook event names", () => {
  const projectDir = makeTempProject();

  assert.throws(
    () => {
      runHookEvent(
        "WorktreeCreate",
        {
          session_id: "session-unknown-event",
          cwd: projectDir,
          hook_event_name: "WorktreeCreate",
          name: "feature-auth",
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

test("HookRuntime KNOWN_HOOK_EVENTS contains exactly the twenty-four governed events", () => {
  assert.equal(KNOWN_HOOK_EVENTS.size, 24);
  assert.equal(KNOWN_HOOK_EVENTS.has("SessionStart"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("UserPromptSubmit"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("PreCompact"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("PostCompact"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("PreToolUse"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("PermissionRequest"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("PermissionDenied"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("PostToolUse"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("PostToolUseFailure"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("Notification"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("SubagentStart"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("SubagentStop"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("TaskCreated"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("TaskCompleted"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("Stop"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("StopFailure"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("TeammateIdle"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("SessionEnd"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("Elicitation"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("ElicitationResult"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("ConfigChange"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("CwdChanged"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("FileChanged"), true);
  assert.equal(KNOWN_HOOK_EVENTS.has("InstructionsLoaded"), true);
});

test("HookRuntime TaskCreated tracks session-local tasks without chain spam", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-task-created";

  const result = runHookEvent(
    "TaskCreated",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TaskCreated",
      task_id: "task-001",
      task_subject: "Implement user authentication",
      task_description: "Add login and signup endpoints",
      teammate_name: "implementer",
      team_name: "my-project",
    },
    {
      projectDir,
      now: "2026-04-09T11:00:00Z",
    }
  );

  assert.deepEqual(result, {});
  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.equal(state.trackedTasks.length, 1);
  assert.equal(state.trackedTasks[0].taskId, "task-001");
  assert.equal(state.lastTaskLifecycle.eventType, "TaskCreated");
  assert.equal(state.lastTaskLifecycle.outcome, "tracked");
  assert.equal(state.chainEntries.length, 0);
});

test("HookRuntime TaskCreated writes mismatch evidence when the same task id changes shape", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-task-create-mismatch";

  runHookEvent(
    "TaskCreated",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TaskCreated",
      task_id: "task-001",
      task_subject: "Implement user authentication",
      task_description: "Add login and signup endpoints",
      teammate_name: "implementer",
      team_name: "my-project",
    },
    {
      projectDir,
      now: "2026-04-09T11:01:00Z",
    }
  );

  runHookEvent(
    "TaskCreated",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TaskCreated",
      task_id: "task-001",
      task_subject: "Implement auth flow",
      task_description: "Add login and signup endpoints",
      teammate_name: "implementer",
      team_name: "my-project",
    },
    {
      projectDir,
      now: "2026-04-09T11:02:00Z",
    }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.equal(state.trackedTasks.length, 1);
  assert.equal(state.trackedTasks[0].taskSubject, "Implement auth flow");
  assert.equal(state.lastTaskLifecycle.outcome, "registry_mismatch");
  assert.deepEqual(state.lastTaskLifecycle.mismatchFields, ["taskSubject"]);
  assert.equal(state.chainEntries.length, 1);
  assert.equal(state.chainEntries[0].payload.action, "task_registry_mismatch");
});

test("HookRuntime TaskCompleted writes matched completion evidence and clears the tracked task", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-task-complete-match";

  runHookEvent(
    "TaskCreated",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TaskCreated",
      task_id: "task-002",
      task_subject: "Wire governance docs",
      task_description: "Sync task closeout docs",
      teammate_name: "writer",
      team_name: "my-project",
    },
    {
      projectDir,
      now: "2026-04-09T11:03:00Z",
    }
  );

  const result = runHookEvent(
    "TaskCompleted",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TaskCompleted",
      task_id: "task-002",
      task_subject: "Wire governance docs",
      task_description: "Sync task closeout docs",
      teammate_name: "writer",
      team_name: "my-project",
    },
    {
      projectDir,
      now: "2026-04-09T11:04:00Z",
    }
  );

  assert.deepEqual(result, {});
  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.equal(state.trackedTasks.length, 0);
  assert.equal(state.lastTaskLifecycle.outcome, "completed");
  assert.equal(state.chainEntries.length, 1);
  assert.equal(state.chainEntries[0].payload.action, "task_completed");
});

test("HookRuntime TaskCompleted writes orphan evidence when no tracked task exists", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-task-complete-orphan";

  const result = runHookEvent(
    "TaskCompleted",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TaskCompleted",
      task_id: "task-003",
      task_subject: "Run tests",
      teammate_name: "tester",
      team_name: "my-project",
    },
    {
      projectDir,
      now: "2026-04-09T11:05:00Z",
    }
  );

  assert.deepEqual(result, {});
  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.equal(state.lastTaskLifecycle.outcome, "orphaned");
  assert.equal(state.chainEntries.length, 1);
  assert.equal(state.chainEntries[0].payload.action, "task_completion_orphaned");
});

test("HookRuntime TaskCompleted writes mismatch evidence when completion diverges from the tracked task", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-task-complete-mismatch";

  runHookEvent(
    "TaskCreated",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TaskCreated",
      task_id: "task-004",
      task_subject: "Ship proof pack",
      task_description: "Prepare proof artifacts",
      teammate_name: "reviewer",
      team_name: "my-project",
    },
    {
      projectDir,
      now: "2026-04-09T11:06:00Z",
    }
  );

  runHookEvent(
    "TaskCompleted",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TaskCompleted",
      task_id: "task-004",
      task_subject: "Ship proof-pack",
      task_description: "Prepare proof artifacts",
      teammate_name: "reviewer",
      team_name: "my-project",
    },
    {
      projectDir,
      now: "2026-04-09T11:07:00Z",
    }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.equal(state.trackedTasks.length, 0);
  assert.equal(state.lastTaskLifecycle.outcome, "completion_mismatch");
  assert.deepEqual(state.lastTaskLifecycle.mismatchFields, ["taskSubject"]);
  assert.equal(state.chainEntries.length, 1);
  assert.equal(state.chainEntries[0].payload.action, "task_completion_mismatch");
});

test("HookRuntime TeammateIdle stays observe-only when no related tracked tasks remain", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-teammate-idle-safe";

  runHookEvent(
    "TaskCreated",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TaskCreated",
      task_id: "task-005",
      task_subject: "Prepare notes",
      teammate_name: "writer",
      team_name: "my-project",
    },
    {
      projectDir,
      now: "2026-04-09T11:08:00Z",
    }
  );

  const result = runHookEvent(
    "TeammateIdle",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TeammateIdle",
      teammate_name: "reviewer",
      team_name: "other-team",
    },
    {
      projectDir,
      now: "2026-04-09T11:09:00Z",
    }
  );

  assert.deepEqual(result, {});
  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.equal(state.lastTeammateIdle.openTaskCount, 0);
  assert.equal(state.lastTeammateIdle.trackedTaskCount, 1);
  assert.equal(state.chainEntries.length, 0);
});

test("HookRuntime TeammateIdle writes bounded evidence when related tracked tasks remain open", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-teammate-idle-open-tasks";

  runHookEvent(
    "TaskCreated",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TaskCreated",
      task_id: "task-006",
      task_subject: "Prepare diff",
      teammate_name: "implementer",
      team_name: "my-project",
    },
    {
      projectDir,
      now: "2026-04-09T11:10:00Z",
    }
  );

  runHookEvent(
    "TeammateIdle",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TeammateIdle",
      teammate_name: "implementer",
      team_name: "my-project",
    },
    {
      projectDir,
      now: "2026-04-09T11:11:00Z",
    }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.equal(state.lastTeammateIdle.openTaskCount, 1);
  assert.deepEqual(state.lastTeammateIdle.openTaskIds, ["task-006"]);
  assert.equal(state.chainEntries.length, 1);
  assert.equal(state.chainEntries[0].payload.action, "teammate_idle_with_open_tasks");
});

test("HookRuntime trackedTasks survive compaction and compact SessionStart rehydrates task lifecycle state", () => {
  const projectDir = makeTempProject();
  const sourceSessionId = "session-task-compact-source";
  const targetSessionId = "session-task-compact-target";

  runHookEvent(
    "TaskCreated",
    {
      session_id: sourceSessionId,
      cwd: projectDir,
      hook_event_name: "TaskCreated",
      task_id: "task-007",
      task_subject: "Carry task across compact",
      teammate_name: "implementer",
      team_name: "my-project",
    },
    {
      projectDir,
      now: "2026-04-09T11:12:00Z",
    }
  );

  runHookEvent(
    "PreCompact",
    {
      session_id: sourceSessionId,
      cwd: projectDir,
      hook_event_name: "PreCompact",
      trigger: "manual",
      custom_instructions: "",
    },
    {
      projectDir,
      now: "2026-04-09T11:13:00Z",
    }
  );

  runHookEvent(
    "SessionStart",
    {
      session_id: targetSessionId,
      cwd: projectDir,
      hook_event_name: "SessionStart",
      source: "compact",
    },
    {
      projectDir,
      now: "2026-04-09T11:14:00Z",
    }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), targetSessionId);
  assert.equal(state.trackedTasks.length, 1);
  assert.equal(state.trackedTasks[0].taskId, "task-007");
  assert.equal(state.lastTaskLifecycle.eventType, "TaskCreated");
  assert.equal(state.lastTaskLifecycle.taskId, "task-007");
});

// --- ConfigChange enforcement upgrade tests ---

test("HookRuntime ConfigChange blocks project_settings changes", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "ConfigChange",
    {
      session_id: "session-config-block",
      cwd: projectDir,
      hook_event_name: "ConfigChange",
      source: "project_settings",
      file_path: path.join(projectDir, ".claude", "settings.json"),
    },
    {
      projectDir,
      now: "2026-04-03T10:00:00Z",
    }
  );

  assert.equal(result.decision, "block");
  assert.match(result.reason, /project_settings/);

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-config-block");
  assert.equal(state.lastConfigChange.source, "project_settings");
  assert.equal(state.lastConfigChange.decision, "block");
});

test("HookRuntime ConfigChange observes policy_settings without blocking", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "ConfigChange",
    {
      session_id: "session-config-policy",
      cwd: projectDir,
      hook_event_name: "ConfigChange",
      source: "policy_settings",
    },
    {
      projectDir,
      now: "2026-04-03T10:01:00Z",
    }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "ConfigChange");
  assert.match(result.hookSpecificOutput.additionalContext, /observe-only/i);
  assert.equal(result.decision, undefined);

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-config-policy");
  assert.equal(state.lastConfigChange.source, "policy_settings");
  assert.equal(state.lastConfigChange.decision, "observe");
});

test("HookRuntime ConfigChange observes unknown sources without blocking", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "ConfigChange",
    {
      session_id: "session-config-unknown",
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
  assert.equal(result.decision, undefined);

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-config-unknown");
  assert.equal(state.lastConfigChange.source, "settings.json");
  assert.equal(state.lastConfigChange.decision, "observe");
});

test("HookRuntime ConfigChange fails closed with block on corrupted state for blockable source", () => {
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
      source: "project_settings",
    },
    {
      projectDir,
      now: "2026-04-03T10:03:00Z",
    }
  );

  assert.equal(result.decision, "block");
  assert.match(result.reason, /FAIL_CLOSED/);
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

// --- Wave 6A Block C: Live Chain Population Tests ---

test("HookRuntime blocked HARD_STOP action writes OPERATOR_ACTION chain entry", () => {
  const projectDir = makeTempProject();

  runHookEvent(
    "PreToolUse",
    {
      session_id: "session-chain-blocked",
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
      now: "2026-04-03T11:00:00Z",
    }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-chain-blocked");
  assert.equal(state.chainEntries.length, 1);
  assert.equal(state.chainEntries[0].entryType, "OPERATOR_ACTION");
  assert.equal(state.chainEntries[0].sourceArtifact, "hook:PreToolUse");
  assert.match(state.chainEntries[0].sourceLocation, /domain:pricing_quote_logic/);
  assert.equal(state.chainEntries[0].payload.action, "blocked");
  assert.equal(state.chainEntries[0].sessionId, "session-chain-blocked");
  assert.equal(state.nextChainCounter, 2);
});

test("HookRuntime PostToolUse on classified domain writes EVIDENCE chain entry", () => {
  const projectDir = makeTempProject();

  runHookEvent(
    "PostToolUse",
    {
      session_id: "session-chain-posttool",
      cwd: projectDir,
      hook_event_name: "PostToolUse",
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectDir, "src", "pricing-engine.js"),
        old_string: "module.exports = {};",
        new_string: "module.exports = { changed: true };",
      },
      tool_response: "Edit applied.",
    },
    {
      projectDir,
      now: "2026-04-03T11:01:00Z",
    }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-chain-posttool");
  assert.equal(state.chainEntries.length, 1);
  assert.equal(state.chainEntries[0].entryType, "EVIDENCE");
  assert.equal(state.chainEntries[0].sourceArtifact, "hook:PostToolUse");
  assert.equal(state.chainEntries[0].payload.action, "completed");
  assert.equal(state.chainEntries[0].payload.toolName, "Edit");
});

test("HookRuntime PostToolUse on unclassified tool does NOT write chain entry", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "PostToolUse",
    {
      session_id: "session-chain-unclassified",
      cwd: projectDir,
      hook_event_name: "PostToolUse",
      tool_name: "Read",
      tool_input: {
        file_path: path.join(projectDir, "docs", "note.md"),
      },
      tool_response: "file content",
    },
    {
      projectDir,
      now: "2026-04-03T11:02:00Z",
    }
  );

  assert.deepEqual(result, {});
  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-chain-unclassified");
  assert.equal((state.chainEntries || []).length, 0);
});

test("HookRuntime PostToolUseFailure on classified domain writes EVIDENCE chain entry", () => {
  const projectDir = makeTempProject();

  runHookEvent(
    "PostToolUseFailure",
    {
      session_id: "session-chain-failure",
      cwd: projectDir,
      hook_event_name: "PostToolUseFailure",
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectDir, "src", "pricing-engine.js"),
        old_string: "not found",
        new_string: "replacement",
      },
      error: "old_string not found in file",
    },
    {
      projectDir,
      now: "2026-04-03T11:03:00Z",
    }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-chain-failure");
  assert.equal(state.chainEntries.length, 1);
  assert.equal(state.chainEntries[0].entryType, "EVIDENCE");
  assert.equal(state.chainEntries[0].sourceArtifact, "hook:PostToolUseFailure");
  assert.equal(state.chainEntries[0].payload.action, "failed");
  assert.equal(state.chainEntries[0].payload.errorSummary, "old_string not found in file");
});

test("HookRuntime ConfigChange writes OPERATOR_ACTION chain entry", () => {
  const projectDir = makeTempProject();

  runHookEvent(
    "ConfigChange",
    {
      session_id: "session-chain-config",
      cwd: projectDir,
      hook_event_name: "ConfigChange",
      source: "project_settings",
    },
    {
      projectDir,
      now: "2026-04-03T11:04:00Z",
    }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-chain-config");
  const chainConfig = state.chainEntries.find(
    (e) => e.sourceArtifact === "hook:ConfigChange"
  );
  assert.ok(chainConfig, "Should have a ConfigChange chain entry");
  assert.equal(chainConfig.entryType, "OPERATOR_ACTION");
  assert.equal(chainConfig.payload.action, "config_change_blocked");
});

test("HookRuntime FileChanged writes OPERATOR_ACTION chain entry", () => {
  const projectDir = makeTempProject();

  runHookEvent(
    "FileChanged",
    {
      session_id: "session-chain-file",
      cwd: projectDir,
      hook_event_name: "FileChanged",
      source: ".claude/settings.json",
    },
    {
      projectDir,
      now: "2026-04-03T11:05:00Z",
    }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-chain-file");
  const chainFile = state.chainEntries.find(
    (e) => e.sourceArtifact === "hook:FileChanged"
  );
  assert.ok(chainFile, "Should have a FileChanged chain entry");
  assert.equal(chainFile.entryType, "OPERATOR_ACTION");
  assert.equal(chainFile.payload.action, "external_file_change_detected");
});

test("HookRuntime chain entries survive compaction and rehydration", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);

  // Generate a chain entry via a blocked action
  runHookEvent(
    "PreToolUse",
    {
      session_id: "session-chain-compact-src",
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
      now: "2026-04-03T11:10:00Z",
    }
  );

  const preState = loadSessionState(config, "session-chain-compact-src");
  assert.equal(preState.chainEntries.length, 1);

  // Compact
  runHookEvent(
    "PreCompact",
    {
      session_id: "session-chain-compact-src",
      cwd: projectDir,
      hook_event_name: "PreCompact",
      trigger: "manual",
    },
    {
      projectDir,
      now: "2026-04-03T11:11:00Z",
    }
  );

  // Rehydrate in new session
  runHookEvent(
    "SessionStart",
    {
      session_id: "session-chain-compact-dst",
      cwd: projectDir,
      hook_event_name: "SessionStart",
      source: "compact",
    },
    {
      projectDir,
      now: "2026-04-03T11:12:00Z",
    }
  );

  const rehydrated = loadSessionState(config, "session-chain-compact-dst");
  assert.equal(rehydrated.chainEntries.length, 1);
  assert.equal(rehydrated.chainEntries[0].entryType, "OPERATOR_ACTION");
  assert.equal(rehydrated.chainEntries[0].payload.action, "blocked");
  assert.ok(rehydrated.nextChainCounter >= 2, "Counter should survive compaction");
});

test("HookRuntime chain entries persist independently from Walk evaluation at Stop", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);

  // Generate chain entries via blocked action and PostToolUse
  runHookEvent(
    "PreToolUse",
    {
      session_id: "session-chain-walk",
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
      now: "2026-04-03T11:20:00Z",
    }
  );

  runHookEvent(
    "PostToolUse",
    {
      session_id: "session-chain-walk",
      cwd: projectDir,
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: {
        file_path: path.join(projectDir, "docs", "guide.md"),
        content: "# guide\n",
      },
      tool_response: "File written.",
    },
    {
      projectDir,
      now: "2026-04-03T11:20:30Z",
    }
  );

  // Stop — Walk evaluates without chain entries in forensicEntries
  // (chain entries are self-standing runtime evidence, not claim-linked)
  runHookEvent(
    "Stop",
    {
      session_id: "session-chain-walk",
      cwd: projectDir,
      hook_event_name: "Stop",
      stop_hook_active: false,
    },
    {
      projectDir,
      now: "2026-04-03T11:21:00Z",
    }
  );

  // Chain entries persist in state alongside Walk results
  const state = loadSessionState(config, "session-chain-walk");
  assert.ok(state.lastWalk, "lastWalk should be populated after Stop");
  assert.ok(state.chainEntries.length >= 2, "chain entries persist independently from Walk");
});

test("HookRuntime chain entries pass ForensicChain validation", () => {
  const { ForensicChain } = require("../../src/ForensicChain");
  const projectDir = makeTempProject();

  // Generate entries from multiple sources
  runHookEvent("PreToolUse", {
    session_id: "session-chain-validate",
    cwd: projectDir,
    hook_event_name: "PreToolUse",
    tool_name: "Edit",
    tool_input: {
      file_path: path.join(projectDir, "src", "pricing-engine.js"),
      old_string: "module.exports = {};",
      new_string: "changed",
    },
  }, { projectDir, now: "2026-04-03T11:30:00Z" });

  runHookEvent("ConfigChange", {
    session_id: "session-chain-validate",
    cwd: projectDir,
    hook_event_name: "ConfigChange",
    source: "settings.json",
  }, { projectDir, now: "2026-04-03T11:31:00Z" });

  const state = loadSessionState(
    resolveRuntimeConfig(projectDir),
    "session-chain-validate"
  );

  // All entries must load into a ForensicChain without validation errors
  const chain = new ForensicChain("validation_test_chain", state.chainEntries);
  assert.equal(chain.listEntries().length, state.chainEntries.length);
});

test("HookRuntime PostToolUse and PostToolUseFailure fail closed on corrupted state", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);

  const statePath = getStateFilePath(config, "session-post-corrupt");
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, "{bad json", "utf8");

  const postResult = runHookEvent("PostToolUse", {
    session_id: "session-post-corrupt",
    cwd: projectDir,
    hook_event_name: "PostToolUse",
    tool_name: "Edit",
    tool_input: {
      file_path: path.join(projectDir, "src", "pricing-engine.js"),
      old_string: "x",
      new_string: "y",
    },
    tool_response: "ok",
  }, { projectDir, now: "2026-04-03T11:40:00Z" });

  assert.match(postResult.hookSpecificOutput.additionalContext, /FAIL_CLOSED/);

  const failResult = runHookEvent("PostToolUseFailure", {
    session_id: "session-post-corrupt",
    cwd: projectDir,
    hook_event_name: "PostToolUseFailure",
    tool_name: "Edit",
    tool_input: {
      file_path: path.join(projectDir, "src", "pricing-engine.js"),
      old_string: "x",
      new_string: "y",
    },
    error: "failed",
  }, { projectDir, now: "2026-04-03T11:41:00Z" });

  assert.match(failResult.hookSpecificOutput.additionalContext, /FAIL_CLOSED/);
});

// --- Wave 6A Block D: Permit / Lockout Runtime Closure Tests ---

test("HookRuntime HARD_STOP denied without permit preserves existing behavior", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "PreToolUse",
    {
      session_id: "session-permit-none",
      cwd: projectDir,
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectDir, "src", "pricing-engine.js"),
        old_string: "module.exports = {};",
        new_string: "module.exports = { changed: true };",
      },
    },
    { projectDir, now: "2026-04-03T14:00:00Z" }
  );

  assert.equal(result.hookSpecificOutput.permissionDecision, "deny");
  assert.match(result.hookSpecificOutput.permissionDecisionReason, /HARD_STOP/);

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-permit-none");
  assert.equal(state.blockedAttempts.length, 1);
  assert.equal((state.activePermits || []).length, 0);
});

test("HookRuntime HARD_STOP allowed with valid GRANTED permit", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-permit-granted";

  seedPermitState(projectDir, sessionId, "pricing_quote_logic", "GRANTED");

  const result = runHookEvent(
    "PreToolUse",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectDir, "src", "pricing-engine.js"),
        old_string: "module.exports = {};",
        new_string: "module.exports = { changed: true };",
      },
    },
    { projectDir, now: "2026-04-03T14:01:00Z" }
  );

  // Empty result means action is allowed
  assert.deepEqual(result, {});

  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.equal(state.observedActions.length, 1);
  assert.equal(state.observedActions[0].approvalState, "permitted_hard_stop");
  assert.equal(state.blockedAttempts.length, 0);
});

test("HookRuntime HARD_STOP denied with DENIED permit", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-permit-denied";

  seedPermitState(projectDir, sessionId, "pricing_quote_logic", "DENIED");

  const result = runHookEvent(
    "PreToolUse",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectDir, "src", "pricing-engine.js"),
        old_string: "module.exports = {};",
        new_string: "module.exports = { changed: true };",
      },
    },
    { projectDir, now: "2026-04-03T14:02:00Z" }
  );

  assert.equal(result.hookSpecificOutput.permissionDecision, "deny");
  assert.match(result.hookSpecificOutput.permissionDecisionReason, /PERMIT_DENIED/);

  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.equal(state.blockedAttempts.length, 1);
});

test("HookRuntime HARD_STOP allowed with CONDITIONAL permit", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-permit-conditional";

  seedPermitState(projectDir, sessionId, "pricing_quote_logic", "CONDITIONAL");

  const result = runHookEvent(
    "PreToolUse",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectDir, "src", "pricing-engine.js"),
        old_string: "module.exports = {};",
        new_string: "module.exports = { changed: true };",
      },
    },
    { projectDir, now: "2026-04-03T14:03:00Z" }
  );

  assert.deepEqual(result, {});

  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.equal(state.observedActions.length, 1);
  assert.equal(state.observedActions[0].approvalState, "permitted_hard_stop");
});

test("HookRuntime permitted HARD_STOP action writes OPERATOR_ACTION chain entry", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-permit-chain";

  seedPermitState(projectDir, sessionId, "pricing_quote_logic", "GRANTED");

  runHookEvent(
    "PreToolUse",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectDir, "src", "pricing-engine.js"),
        old_string: "module.exports = {};",
        new_string: "module.exports = { changed: true };",
      },
    },
    { projectDir, now: "2026-04-03T14:04:00Z" }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  const permitted = state.chainEntries.find(
    (e) => e.payload && e.payload.action === "permitted"
  );
  assert.ok(permitted, "Should have a permitted chain entry");
  assert.equal(permitted.entryType, "OPERATOR_ACTION");
  assert.equal(permitted.payload.statusCode, "PERMIT_GRANTED");
  assert.equal(permitted.payload.permitRef, "test_permit_pricing_quote_logic");
  assert.equal(permitted.payload.authorizationRef, "test_auth_pricing_quote_logic");
});

test("HookRuntime permit/authorization state survives compaction", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  const srcSession = "session-permit-compact-src";

  seedPermitState(projectDir, srcSession, "pricing_quote_logic", "GRANTED");

  runHookEvent("PreCompact", {
    session_id: srcSession,
    cwd: projectDir,
    hook_event_name: "PreCompact",
    trigger: "manual",
  }, { projectDir, now: "2026-04-03T14:10:00Z" });

  const dstSession = "session-permit-compact-dst";
  runHookEvent("SessionStart", {
    session_id: dstSession,
    cwd: projectDir,
    hook_event_name: "SessionStart",
    source: "compact",
  }, { projectDir, now: "2026-04-03T14:11:00Z" });

  const rehydrated = loadSessionState(config, dstSession);
  assert.equal(rehydrated.activePermits.length, 1);
  assert.equal(rehydrated.activeAuthorizations.length, 1);
  assert.equal(rehydrated.activePermits[0].operatorDecision, "GRANTED");
  assert.equal(rehydrated.activeAuthorizations[0].domainId, "pricing_quote_logic");
});

test("HookRuntime PermissionRequest HARD_STOP allowed with valid permit", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-permit-permreq";

  seedPermitState(projectDir, sessionId, "pricing_quote_logic", "GRANTED");

  const result = runHookEvent(
    "PermissionRequest",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "PermissionRequest",
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectDir, "src", "pricing-engine.js"),
        old_string: "module.exports = {};",
        new_string: "module.exports = { changed: true };",
      },
    },
    { projectDir, now: "2026-04-03T14:05:00Z" }
  );

  assert.deepEqual(result, {});

  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.equal(state.observedActions[0].approvalState, "permitted_hard_stop");
});

// --- Wave 6B Block A: Instruction-Load Observability Tests ---

test("HookRuntime InstructionsLoaded records observation and returns advisory", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "InstructionsLoaded",
    {
      session_id: "session-instr-load",
      cwd: projectDir,
      hook_event_name: "InstructionsLoaded",
      file_path: "/project/CLAUDE.md",
      memory_type: "Project",
      load_reason: "session_start",
    },
    { projectDir, now: "2026-04-03T15:00:00Z" }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "InstructionsLoaded");
  assert.match(result.hookSpecificOutput.additionalContext, /Instruction file loaded/);
  assert.match(result.hookSpecificOutput.additionalContext, /CLAUDE\.md/);

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-instr-load");
  assert.equal(state.loadedInstructions.length, 1);
  assert.equal(state.loadedInstructions[0].filePath, "/project/CLAUDE.md");
  assert.equal(state.loadedInstructions[0].memoryType, "Project");
  assert.equal(state.loadedInstructions[0].loadReason, "session_start");
});

test("HookRuntime InstructionsLoaded writes OPERATOR_ACTION chain entry", () => {
  const projectDir = makeTempProject();

  runHookEvent(
    "InstructionsLoaded",
    {
      session_id: "session-instr-chain",
      cwd: projectDir,
      hook_event_name: "InstructionsLoaded",
      file_path: "/project/CLAUDE.md",
      memory_type: "Project",
      load_reason: "session_start",
    },
    { projectDir, now: "2026-04-03T15:01:00Z" }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-instr-chain");
  const instrEntry = state.chainEntries.find(
    (e) => e.sourceArtifact === "hook:InstructionsLoaded"
  );
  assert.ok(instrEntry, "Should have an InstructionsLoaded chain entry");
  assert.equal(instrEntry.entryType, "OPERATOR_ACTION");
  assert.equal(instrEntry.payload.action, "instruction_loaded");
  assert.equal(instrEntry.payload.filePath, "/project/CLAUDE.md");
  assert.equal(instrEntry.payload.memoryType, "Project");
});

test("HookRuntime InstructionsLoaded does not return blocking output", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "InstructionsLoaded",
    {
      session_id: "session-instr-noblock",
      cwd: projectDir,
      hook_event_name: "InstructionsLoaded",
      file_path: "/project/CLAUDE.md",
      memory_type: "Project",
      load_reason: "session_start",
    },
    { projectDir, now: "2026-04-03T15:02:00Z" }
  );

  assert.equal(result.decision, undefined);
  assert.equal(
    result.hookSpecificOutput.permissionDecision,
    undefined
  );
});

test("HookRuntime InstructionsLoaded fails closed with advisory on corrupted state", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  const statePath = getStateFilePath(config, "session-instr-corrupt");
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, "{bad json", "utf8");

  const result = runHookEvent(
    "InstructionsLoaded",
    {
      session_id: "session-instr-corrupt",
      cwd: projectDir,
      hook_event_name: "InstructionsLoaded",
      file_path: "/project/CLAUDE.md",
      memory_type: "Project",
      load_reason: "session_start",
    },
    { projectDir, now: "2026-04-03T15:03:00Z" }
  );

  assert.equal(result.hookSpecificOutput.hookEventName, "InstructionsLoaded");
  assert.match(result.hookSpecificOutput.additionalContext, /FAIL_CLOSED/);
});

test("HookRuntime InstructionsLoaded state survives compaction", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);

  runHookEvent("InstructionsLoaded", {
    session_id: "session-instr-compact-src",
    cwd: projectDir,
    hook_event_name: "InstructionsLoaded",
    file_path: "/project/CLAUDE.md",
    memory_type: "Project",
    load_reason: "session_start",
  }, { projectDir, now: "2026-04-03T15:04:00Z" });

  runHookEvent("PreCompact", {
    session_id: "session-instr-compact-src",
    cwd: projectDir,
    hook_event_name: "PreCompact",
    trigger: "manual",
  }, { projectDir, now: "2026-04-03T15:05:00Z" });

  runHookEvent("SessionStart", {
    session_id: "session-instr-compact-dst",
    cwd: projectDir,
    hook_event_name: "SessionStart",
    source: "compact",
  }, { projectDir, now: "2026-04-03T15:06:00Z" });

  const rehydrated = loadSessionState(config, "session-instr-compact-dst");
  assert.equal(rehydrated.loadedInstructions.length, 1);
  assert.equal(rehydrated.loadedInstructions[0].filePath, "/project/CLAUDE.md");
});

test("HookRuntime UserPromptSubmit blocks only approved exact phrases", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "UserPromptSubmit",
    {
      session_id: "session-prompt-block",
      cwd: projectDir,
      hook_event_name: "UserPromptSubmit",
      prompt: "Please DISABLE HOOKS before you continue.",
    },
    {
      projectDir,
      now: "2026-04-04T09:00:00Z",
    }
  );

  assert.equal(result.decision, "block");
  assert.match(result.reason, /disable hooks/i);

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-prompt-block");
  assert.equal(state.lastUserPromptSubmit.blocked, true);
  assert.equal(state.lastUserPromptSubmit.matchedPhrase, "disable hooks");
  assert.equal(state.chainEntries[0].entryType, "OPERATOR_ACTION");
  assert.equal(state.chainEntries[0].payload.action, "prompt_blocked");
});

test("HookRuntime UserPromptSubmit does not fuzzy-block near misses", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "UserPromptSubmit",
    {
      session_id: "session-prompt-allow",
      cwd: projectDir,
      hook_event_name: "UserPromptSubmit",
      prompt: "Please turn off enforcements after the review.",
    },
    {
      projectDir,
      now: "2026-04-04T09:01:00Z",
    }
  );

  assert.deepEqual(result, {});

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-prompt-allow");
  assert.equal(state.lastUserPromptSubmit.blocked, false);
  assert.equal(state.lastUserPromptSubmit.matchedPhrase, null);
  assert.equal(state.chainEntries.length, 0);
});

test("HookRuntime PermissionDenied records observer state without retry", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "PermissionDenied",
    {
      session_id: "session-permission-denied",
      cwd: projectDir,
      hook_event_name: "PermissionDenied",
      tool_name: "Bash",
      tool_input: {
        command: "rm -rf /tmp/build",
        description: "Clean build directory",
      },
      reason: "Auto mode denied: command targets a path outside the project",
    },
    {
      projectDir,
      now: "2026-04-04T09:02:00Z",
    }
  );

  assert.deepEqual(result, {});
  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-permission-denied");
  assert.equal(state.lastPermissionDenied.toolName, "Bash");
  assert.match(state.lastPermissionDenied.reason, /Auto mode denied/);
  assert.equal(state.chainEntries[0].payload.action, "permission_denied");
});

test("HookRuntime Notification records observer state only", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "Notification",
    {
      session_id: "session-notification",
      cwd: projectDir,
      hook_event_name: "Notification",
      notification_type: "permission_prompt",
      title: "Permission needed",
      message: "Claude needs your permission to use Bash",
    },
    {
      projectDir,
      now: "2026-04-04T09:03:00Z",
    }
  );

  assert.deepEqual(result, {});
  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-notification");
  assert.equal(state.lastNotification.notificationType, "permission_prompt");
  assert.equal(state.chainEntries[0].payload.action, "notification_observed");
});

test("HookRuntime SubagentStart records bounded active subagent state", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "SubagentStart",
    {
      session_id: "session-subagent-start",
      cwd: projectDir,
      hook_event_name: "SubagentStart",
      agent_id: "agent-01",
      agent_type: "Explore",
    },
    {
      projectDir,
      now: "2026-04-04T09:04:00Z",
    }
  );

  assert.deepEqual(result, {});
  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-subagent-start");
  assert.equal(state.activeSubagents.length, 1);
  assert.equal(state.activeSubagents[0].agentId, "agent-01");
  assert.equal(state.chainEntries[0].payload.action, "subagent_started");
});

test("HookRuntime SubagentStop stays bounded and does not read transcripts or instantiate ForemansWalk", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-subagent-stop-safe";
  const config = resolveRuntimeConfig(projectDir);

  runHookEvent(
    "SubagentStart",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "SubagentStart",
      agent_id: "agent-safe",
      agent_type: "Explore",
    },
    {
      projectDir,
      now: "2026-04-04T09:05:00Z",
    }
  );

  const { ForemansWalk } = require("../../src/ForemansWalk");
  let walkCalls = 0;
  const originalEvaluate = ForemansWalk.prototype.evaluate;
  ForemansWalk.prototype.evaluate = function patchedEvaluate() {
    walkCalls += 1;
    return originalEvaluate.apply(this, arguments);
  };

  const agentTranscriptPath = path.join(projectDir, "subagents", "agent-safe.jsonl");
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = function patchedReadFileSync(filePath) {
    if (String(filePath) === agentTranscriptPath) {
      throw new Error("SubagentStop should not read agent transcripts");
    }
    return originalReadFileSync.apply(this, arguments);
  };

  try {
    const result = runHookEvent(
      "SubagentStop",
      {
        session_id: sessionId,
        cwd: projectDir,
        hook_event_name: "SubagentStop",
        stop_hook_active: false,
        agent_id: "agent-safe",
        agent_type: "Explore",
        agent_transcript_path: agentTranscriptPath,
        last_assistant_message: "All done.",
      },
      {
        projectDir,
        now: "2026-04-04T09:06:00Z",
      }
    );

    assert.deepEqual(result, {});
  } finally {
    fs.readFileSync = originalReadFileSync;
    ForemansWalk.prototype.evaluate = originalEvaluate;
  }

  assert.equal(walkCalls, 0);
  const state = loadSessionState(config, sessionId);
  assert.equal(state.activeSubagents.length, 0);
  assert.equal(state.lastSubagentStop.decision, "allow");
});

test("HookRuntime SubagentStop blocks when blocking Walk findings already exist in state", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-subagent-stop-blocking-walk";
  const config = resolveRuntimeConfig(projectDir);

  runHookEvent(
    "SubagentStart",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "SubagentStart",
      agent_id: "agent-blocking",
      agent_type: "Explore",
    },
    {
      projectDir,
      now: "2026-04-04T09:07:00Z",
    }
  );

  const state = loadSessionState(config, sessionId);
  state.lastWalk = {
    findings: [
      {
        findingType: "TRUTHFULNESS_GAP",
        severity: "HIGH",
        summary: "Blocking finding still open",
      },
    ],
  };
  saveSessionState(config, sessionId, state);

  const result = runHookEvent(
    "SubagentStop",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "SubagentStop",
      stop_hook_active: false,
      agent_id: "agent-blocking",
      agent_type: "Explore",
      agent_transcript_path: path.join(projectDir, "subagents", "agent-blocking.jsonl"),
      last_assistant_message: "Done.",
    },
    {
      projectDir,
      now: "2026-04-04T09:08:00Z",
    }
  );

  assert.equal(result.decision, "block");
  assert.match(result.reason, /blocking Walk finding/);
});

test("HookRuntime SubagentStop blocks when blocked attempts remain permit-uncleared", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-subagent-stop-blocked-attempt";

  runHookEvent(
    "PreToolUse",
    {
      session_id: sessionId,
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
      now: "2026-04-04T09:09:00Z",
    }
  );

  runHookEvent(
    "SubagentStart",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "SubagentStart",
      agent_id: "agent-blocked-attempt",
      agent_type: "Explore",
    },
    {
      projectDir,
      now: "2026-04-04T09:10:00Z",
    }
  );

  const result = runHookEvent(
    "SubagentStop",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "SubagentStop",
      stop_hook_active: false,
      agent_id: "agent-blocked-attempt",
      agent_type: "Explore",
      agent_transcript_path: path.join(projectDir, "subagents", "agent-blocked-attempt.jsonl"),
      last_assistant_message: "Done.",
    },
    {
      projectDir,
      now: "2026-04-04T09:11:00Z",
    }
  );

  assert.equal(result.decision, "block");
  assert.match(result.reason, /permit-uncleared/);
});

test("HookRuntime PostCompact verifies preserved governance state without decision control", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);

  runHookEvent(
    "SessionStart",
    {
      session_id: "session-postcompact-src",
      cwd: projectDir,
      hook_event_name: "SessionStart",
      source: "startup",
    },
    { projectDir, now: "2026-04-04T09:11:30Z" }
  );

  runHookEvent(
    "InstructionsLoaded",
    {
      session_id: "session-postcompact-src",
      cwd: projectDir,
      hook_event_name: "InstructionsLoaded",
      file_path: "/project/CLAUDE.md",
      memory_type: "Project",
      load_reason: "session_start",
    },
    { projectDir, now: "2026-04-04T09:12:00Z" }
  );

  runHookEvent(
    "PreCompact",
    {
      session_id: "session-postcompact-src",
      cwd: projectDir,
      hook_event_name: "PreCompact",
      trigger: "manual",
    },
    { projectDir, now: "2026-04-04T09:13:00Z" }
  );

  runHookEvent(
    "SessionStart",
    {
      session_id: "session-postcompact-dst",
      cwd: projectDir,
      hook_event_name: "SessionStart",
      source: "compact",
    },
    { projectDir, now: "2026-04-04T09:14:00Z" }
  );

  const result = runHookEvent(
    "PostCompact",
    {
      session_id: "session-postcompact-dst",
      cwd: projectDir,
      hook_event_name: "PostCompact",
      trigger: "manual",
      compact_summary: "Summary of the compacted conversation.",
    },
    { projectDir, now: "2026-04-04T09:15:00Z" }
  );

  assert.equal(result.decision, undefined);
  assert.equal(result.hookSpecificOutput.hookEventName, "PostCompact");
  assert.match(result.hookSpecificOutput.additionalContext, /Advisory only/);

  const state = loadSessionState(config, "session-postcompact-dst");
  assert.equal(state.lastPostCompact.verificationStatus, "verified");
  const postCompactEntry = state.chainEntries.find(
    (entry) => entry.sourceArtifact === "hook:PostCompact"
  );
  assert.ok(postCompactEntry, "Should record PostCompact verification");
});

test("HookRuntime StopFailure records bounded error state", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "StopFailure",
    {
      session_id: "session-stop-failure",
      cwd: projectDir,
      hook_event_name: "StopFailure",
      error: "rate_limit",
      error_details: "Too many requests",
      last_assistant_message: "API Error: Rate limit reached",
    },
    {
      projectDir,
      now: "2026-04-04T09:16:00Z",
    }
  );

  assert.deepEqual(result, {});
  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-stop-failure");
  assert.equal(state.lastStopFailure.errorType, "rate_limit");
  assert.equal(state.lastStopFailure.errorDetails, "Too many requests");
  assert.equal(state.chainEntries[0].payload.action, "stop_failure");
});

test("HookRuntime SessionEnd records reason and clears active subagents", () => {
  const projectDir = makeTempProject();
  const sessionId = "session-end-observer";

  runHookEvent(
    "SubagentStart",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "SubagentStart",
      agent_id: "agent-end",
      agent_type: "Explore",
    },
    {
      projectDir,
      now: "2026-04-04T09:17:00Z",
    }
  );

  const result = runHookEvent(
    "SessionEnd",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "SessionEnd",
      reason: "other",
    },
    {
      projectDir,
      now: "2026-04-04T09:18:00Z",
    }
  );

  assert.deepEqual(result, {});
  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.equal(state.lastSessionEnd.reason, "other");
  assert.equal(state.activeSubagents.length, 0);
  assert.equal(state.chainEntries.at(-1).payload.action, "session_end");
});

// --- Phase 2 MCP Lifecycle Observability Tests ---

test("HookRuntime Elicitation records bounded normalized observation", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "Elicitation",
    {
      session_id: "session-elicitation",
      cwd: projectDir,
      hook_event_name: "Elicitation",
      mcp_server_name: "github",
      message: "Please authenticate to continue.",
      mode: "form",
      elicitation_id: "elicit-001",
      requested_schema: {
        type: "object",
        properties: {
          username: { type: "string" },
          otp: { type: "string" },
        },
        required: ["username"],
      },
    },
    { projectDir, now: "2026-04-09T09:00:00Z" }
  );

  assert.deepEqual(result, {});

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-elicitation");
  assert.equal(state.lastElicitation.eventType, "Elicitation");
  assert.equal(state.lastElicitation.mcpServerName, "github");
  assert.equal(state.lastElicitation.messagePreview, "Please authenticate to continue.");
  assert.equal(state.lastElicitation.mode, "form");
  assert.equal(state.lastElicitation.elicitationId, "elicit-001");
  assert.equal(state.lastElicitation.hasRequestedSchema, true);
  assert.equal(state.lastElicitation.requestedSchemaShape, "object");
  assert.equal(state.lastElicitation.requestedSchemaType, "object");
  assert.equal(state.lastElicitation.requestedFieldCount, 2);
  assert.equal(state.lastElicitation.requiredFieldCount, 1);
});

test("HookRuntime Elicitation normalizes URL mode without storing raw URL", () => {
  const projectDir = makeTempProject();

  runHookEvent(
    "Elicitation",
    {
      session_id: "session-elicitation-url",
      cwd: projectDir,
      hook_event_name: "Elicitation",
      mcp_server_name: "slack",
      message: "Complete browser sign-in.",
      mode: "url",
      url: "https://auth.example.com/login?token=secret",
    },
    { projectDir, now: "2026-04-09T09:01:00Z" }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-elicitation-url");
  const entry = state.chainEntries.find((item) => item.sourceArtifact === "hook:Elicitation");
  assert.equal(state.lastElicitation.hasUrl, true);
  assert.equal(state.lastElicitation.urlOrigin, "https://auth.example.com");
  assert.equal(state.lastElicitation.hasRequestedSchema, false);
  assert.equal(state.lastElicitation.requestedSchemaShape, "absent");
  assert.ok(entry, "Should have an Elicitation chain entry");
  assert.equal(entry.payload.urlOrigin, "https://auth.example.com");
  assert.equal(entry.payload.url, undefined);
});

test("HookRuntime Elicitation tolerates malformed optional payload shapes", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "Elicitation",
    {
      session_id: "session-elicitation-malformed",
      cwd: projectDir,
      hook_event_name: "Elicitation",
      mcp_server_name: "custom-server",
      requested_schema: 42,
      url: "not a url",
    },
    { projectDir, now: "2026-04-09T09:02:00Z" }
  );

  assert.deepEqual(result, {});

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-elicitation-malformed");
  assert.equal(state.lastElicitation.messagePreview, "");
  assert.equal(state.lastElicitation.mode, null);
  assert.equal(state.lastElicitation.hasUrl, true);
  assert.equal(state.lastElicitation.urlOrigin, null);
  assert.equal(state.lastElicitation.requestedSchemaShape, "number");
  assert.equal(state.lastElicitation.requestedFieldCount, 0);
});

test("HookRuntime Elicitation writes OPERATOR_ACTION chain entry without control output", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "Elicitation",
    {
      session_id: "session-elicitation-chain",
      cwd: projectDir,
      hook_event_name: "Elicitation",
      mcp_server_name: "github",
      message: "Authenticate.",
      mode: "form",
      requested_schema: {
        type: "object",
        properties: { code: { type: "string" } },
      },
    },
    { projectDir, now: "2026-04-09T09:03:00Z" }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-elicitation-chain");
  const entry = state.chainEntries.find((item) => item.sourceArtifact === "hook:Elicitation");
  assert.ok(entry, "Should have an Elicitation chain entry");
  assert.equal(entry.entryType, "OPERATOR_ACTION");
  assert.equal(entry.payload.action, "elicitation_observed");
  assert.equal(entry.payload.eventType, "Elicitation");
  assert.equal(entry.payload.mcpServerName, "github");
  assert.equal(result.decision, undefined);
  assert.equal(result.hookSpecificOutput, undefined);
});

test("HookRuntime Elicitation stays non-governing on corrupted state", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  const statePath = getStateFilePath(config, "session-elicitation-corrupt");
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, "{bad json", "utf8");

  const result = runHookEvent(
    "Elicitation",
    {
      session_id: "session-elicitation-corrupt",
      cwd: projectDir,
      hook_event_name: "Elicitation",
      mcp_server_name: "github",
      message: "Authenticate.",
    },
    { projectDir, now: "2026-04-09T09:04:00Z" }
  );

  assert.deepEqual(result, {});
});

test("HookRuntime ElicitationResult records bounded normalized observation", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "ElicitationResult",
    {
      session_id: "session-elicitation-result",
      cwd: projectDir,
      hook_event_name: "ElicitationResult",
      mcp_server_name: "github",
      action: "accept",
      mode: "form",
      elicitation_id: "elicit-002",
      content: { username: "alice", otp: "123456" },
    },
    { projectDir, now: "2026-04-09T09:05:00Z" }
  );

  assert.deepEqual(result, {});

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-elicitation-result");
  assert.equal(state.lastElicitationResult.eventType, "ElicitationResult");
  assert.equal(state.lastElicitationResult.mcpServerName, "github");
  assert.equal(state.lastElicitationResult.action, "accept");
  assert.equal(state.lastElicitationResult.mode, "form");
  assert.equal(state.lastElicitationResult.elicitationId, "elicit-002");
  assert.equal(state.lastElicitationResult.hasContent, true);
  assert.equal(state.lastElicitationResult.contentShape, "object");
  assert.equal(state.lastElicitationResult.contentFieldCount, 2);
});

test("HookRuntime ElicitationResult handles missing optional fields without overrides", () => {
  const projectDir = makeTempProject();

  runHookEvent(
    "ElicitationResult",
    {
      session_id: "session-elicitation-result-minimal",
      cwd: projectDir,
      hook_event_name: "ElicitationResult",
      mcp_server_name: "slack",
      action: "decline",
    },
    { projectDir, now: "2026-04-09T09:06:00Z" }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-elicitation-result-minimal");
  assert.equal(state.lastElicitationResult.mode, null);
  assert.equal(state.lastElicitationResult.elicitationId, null);
  assert.equal(state.lastElicitationResult.hasContent, false);
  assert.equal(state.lastElicitationResult.contentShape, "absent");
  assert.equal(state.lastElicitationResult.contentFieldCount, 0);
});

test("HookRuntime ElicitationResult summarizes malformed content without storing values", () => {
  const projectDir = makeTempProject();

  runHookEvent(
    "ElicitationResult",
    {
      session_id: "session-elicitation-result-malformed",
      cwd: projectDir,
      hook_event_name: "ElicitationResult",
      mcp_server_name: "custom-server",
      action: "accept",
      content: ["alice", "123456"],
    },
    { projectDir, now: "2026-04-09T09:07:00Z" }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-elicitation-result-malformed");
  assert.equal(state.lastElicitationResult.contentShape, "array");
  assert.equal(state.lastElicitationResult.contentFieldCount, 2);
});

test("HookRuntime ElicitationResult writes OPERATOR_ACTION chain entry without action override", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "ElicitationResult",
    {
      session_id: "session-elicitation-result-chain",
      cwd: projectDir,
      hook_event_name: "ElicitationResult",
      mcp_server_name: "github",
      action: "cancel",
    },
    { projectDir, now: "2026-04-09T09:08:00Z" }
  );

  const state = loadSessionState(resolveRuntimeConfig(projectDir), "session-elicitation-result-chain");
  const entry = state.chainEntries.find((item) => item.sourceArtifact === "hook:ElicitationResult");
  assert.ok(entry, "Should have an ElicitationResult chain entry");
  assert.equal(entry.entryType, "OPERATOR_ACTION");
  assert.equal(entry.payload.action, "elicitation_result_observed");
  assert.equal(entry.payload.resultAction, "cancel");
  assert.equal(entry.payload.eventType, "ElicitationResult");
  assert.equal(entry.payload.mcpServerName, "github");
  assert.equal(result.decision, undefined);
  assert.equal(result.hookSpecificOutput, undefined);
});

test("HookRuntime ElicitationResult stays non-governing on corrupted state", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  const statePath = getStateFilePath(config, "session-elicitation-result-corrupt");
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, "{bad json", "utf8");

  const result = runHookEvent(
    "ElicitationResult",
    {
      session_id: "session-elicitation-result-corrupt",
      cwd: projectDir,
      hook_event_name: "ElicitationResult",
      mcp_server_name: "github",
      action: "accept",
      content: { code: "123456" },
    },
    { projectDir, now: "2026-04-09T09:09:00Z" }
  );

  assert.deepEqual(result, {});
});
test("Repo hook registrations reflect the approved Phase 2 MCP observability set", () => {
  const settingsJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../.claude/settings.json"), "utf8")
  );
  const pluginHooksJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../hooks/hooks.json"), "utf8")
  );

  const expectedEvents = [
    "SessionStart",
    "UserPromptSubmit",
    "PreCompact",
    "PostCompact",
    "PreToolUse",
    "PermissionRequest",
    "PermissionDenied",
    "PostToolUse",
    "PostToolUseFailure",
    "Notification",
    "SubagentStart",
    "SubagentStop",
    "TaskCreated",
    "TaskCompleted",
    "Stop",
    "StopFailure",
    "TeammateIdle",
    "SessionEnd",
    "Elicitation",
    "ElicitationResult",
    "ConfigChange",
    "CwdChanged",
    "InstructionsLoaded",
    "FileChanged",
  ].sort();
  const parkedEvents = [
    "WorktreeCreate",
    "WorktreeRemove",
  ];

  assert.deepEqual(Object.keys(settingsJson.hooks).sort(), expectedEvents);
  assert.deepEqual(Object.keys(pluginHooksJson.hooks).sort(), expectedEvents);
  assert.equal(settingsJson.hooks.PermissionDenied[0].matcher, "Bash|Write|Edit");
  assert.equal(pluginHooksJson.hooks.PermissionDenied[0].matcher, "Bash|Write|Edit");
  assert.equal(settingsJson.hooks.FileChanged[0].matcher, ".claude/settings.json");
  assert.equal(pluginHooksJson.hooks.FileChanged[0].matcher, ".claude/settings.json");
  assert.equal(Object.prototype.hasOwnProperty.call(settingsJson.hooks.Elicitation[0], "matcher"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(pluginHooksJson.hooks.Elicitation[0], "matcher"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(settingsJson.hooks.ElicitationResult[0], "matcher"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(pluginHooksJson.hooks.ElicitationResult[0], "matcher"), false);

  for (const eventName of parkedEvents) {
    assert.equal(Object.prototype.hasOwnProperty.call(settingsJson.hooks, eventName), false);
    assert.equal(Object.prototype.hasOwnProperty.call(pluginHooksJson.hooks, eventName), false);
  }
});