"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  DEFAULT_PROFILE_ID,
  PROJECT_HARD_STOP_DENY_RULES,
  createEmptySessionState,
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

test("HookRuntime Stop blocks once on blocking Walk findings and then respects stop loop guard", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  const state = createEmptySessionState("session-stop-block", config.profile);

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
    firstObservedAt: "2026-04-02T12:15:00Z",
    lastObservedAt: "2026-04-02T12:15:00Z",
  });

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
