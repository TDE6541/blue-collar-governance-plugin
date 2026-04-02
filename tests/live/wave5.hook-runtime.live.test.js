"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  createEmptySessionState,
  resolveRuntimeConfig,
  runHookEvent,
  saveSessionState,
} = require("../../src/HookRuntime");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SETTINGS_SOURCE = path.join(REPO_ROOT, ".claude", "settings.json");

function makeTempProject() {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "bcgp-hook-live-"));
  fs.mkdirSync(path.join(projectDir, ".claude"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "docs"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
  fs.copyFileSync(SETTINGS_SOURCE, path.join(projectDir, ".claude", "settings.json"));
  fs.writeFileSync(path.join(projectDir, "docs", "note.md"), "hello\n");
  fs.writeFileSync(path.join(projectDir, "src", "pricing-engine.js"), "module.exports = {};\n");
  fs.writeFileSync(path.join(projectDir, "src", "worker.js"), "module.exports = {};\n");
  return projectDir;
}

test("Wave5 hook runtime live proof: shipped settings and runtime enforce deny/allow/stop truth together", () => {
  const projectDir = makeTempProject();

  const preToolResult = runHookEvent(
    "PreToolUse",
    {
      session_id: "wave5_hook_live",
      cwd: projectDir,
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectDir, "src", "pricing-engine.js"),
        old_string: "module.exports = {};",
        new_string: "module.exports = { price: 1 };",
      },
    },
    {
      projectDir,
      now: "2026-04-02T12:30:00Z",
    }
  );

  assert.equal(preToolResult.hookSpecificOutput.permissionDecision, "deny");

  const permissionResult = runHookEvent(
    "PermissionRequest",
    {
      session_id: "wave5_hook_live",
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
      now: "2026-04-02T12:31:00Z",
    }
  );

  assert.equal(permissionResult.hookSpecificOutput.decision.behavior, "allow");

  const config = resolveRuntimeConfig(projectDir);
  const state = createEmptySessionState("wave5_hook_live", config.profile);
  state.observedActions.push({
    fingerprint: "forced-violation",
    toolName: "Edit",
    workItem: "Edit src/pricing-engine.js",
    domainId: "pricing_quote_logic",
    domainLabel: "Pricing / quote logic",
    autonomyLevel: "HARD_STOP",
    operationType: "change_rules",
    relativePath: "src/pricing-engine.js",
    approvalState: "permission_user_review",
    firstObservedAt: "2026-04-02T12:32:00Z",
    lastObservedAt: "2026-04-02T12:32:00Z",
  });
  saveSessionState(config, "wave5_hook_live", state);

  const firstStop = runHookEvent(
    "Stop",
    {
      session_id: "wave5_hook_live",
      cwd: projectDir,
      hook_event_name: "Stop",
      stop_hook_active: false,
      last_assistant_message: "closeout attempt",
    },
    {
      projectDir,
      now: "2026-04-02T12:33:00Z",
    }
  );

  assert.equal(firstStop.decision, "block");

  const secondStop = runHookEvent(
    "Stop",
    {
      session_id: "wave5_hook_live",
      cwd: projectDir,
      hook_event_name: "Stop",
      stop_hook_active: true,
      last_assistant_message: "closeout retry",
    },
    {
      projectDir,
      now: "2026-04-02T12:34:00Z",
    }
  );

  assert.deepEqual(secondStop, {});
});

test("Wave5 hook runtime live proof: malformed hook posture throws before any allow path can proceed", () => {
  const projectDir = makeTempProject();
  const brokenSettingsPath = path.join(projectDir, ".claude", "settings.json");
  const settings = JSON.parse(fs.readFileSync(brokenSettingsPath, "utf8"));
  settings.blueCollarGovernance.hookRuntime.profileId = "unsafe_unknown_profile";
  fs.writeFileSync(brokenSettingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

  assert.throws(
    () =>
      runHookEvent(
        "PreToolUse",
        {
          session_id: "wave5_hook_live_broken",
          cwd: projectDir,
          hook_event_name: "PreToolUse",
          tool_name: "Edit",
          tool_input: {
            file_path: path.join(projectDir, "src", "worker.js"),
            old_string: "module.exports = {};",
            new_string: "module.exports = { worker: true };",
          },
        },
        {
          projectDir,
          now: "2026-04-02T12:35:00Z",
        }
      ),
    /preset id must be one of/
  );
});
