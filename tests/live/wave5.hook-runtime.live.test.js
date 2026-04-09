"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  createEmptySessionState,
  getCompactionStateFilePath,
  loadSessionState,
  resolveRuntimeConfig,
  runHookEvent,
  saveSessionState,
} = require("../../src/HookRuntime");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SETTINGS_SOURCE = path.join(REPO_ROOT, ".claude", "settings.json");
const WRAPPER_PATH = path.join(REPO_ROOT, "scripts", "render-skill.js");

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

function forceHardStopObservedAction(state, timestamp = "2026-04-02T12:32:00Z") {
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
    firstObservedAt: timestamp,
    lastObservedAt: timestamp,
  });
}

test("Wave5 hook runtime live proof: shipped settings and runtime enforce deny/allow/stop truth together", () => {
  const projectDir = makeTempProject();

  const sessionStart = runHookEvent(
    "SessionStart",
    {
      session_id: "wave5_hook_live",
      cwd: projectDir,
      hook_event_name: "SessionStart",
      source: "startup",
    },
    {
      projectDir,
      now: "2026-04-02T12:29:00Z",
    }
  );

  assert.match(sessionStart.hookSpecificOutput.additionalContext, /Source=startup/);

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
  forceHardStopObservedAction(state);
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

test("Wave5 hook runtime live proof: PreCompact snapshot rehydrates compact SessionStart", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);

  const sourceState = createEmptySessionState("wave5_hook_compact_source", config.profile);
  forceHardStopObservedAction(sourceState, "2026-04-02T12:40:00Z");
  saveSessionState(config, "wave5_hook_compact_source", sourceState);

  runHookEvent(
    "PreCompact",
    {
      session_id: "wave5_hook_compact_source",
      cwd: projectDir,
      hook_event_name: "PreCompact",
      trigger: "manual",
      custom_instructions: "",
    },
    {
      projectDir,
      now: "2026-04-02T12:41:00Z",
    }
  );

  assert.equal(fs.existsSync(getCompactionStateFilePath(config)), true);

  const sessionStart = runHookEvent(
    "SessionStart",
    {
      session_id: "wave5_hook_compact_target",
      cwd: projectDir,
      hook_event_name: "SessionStart",
      source: "compact",
    },
    {
      projectDir,
      now: "2026-04-02T12:42:00Z",
    }
  );

  assert.match(sessionStart.hookSpecificOutput.additionalContext, /Source=compact/);
  assert.match(sessionStart.hookSpecificOutput.additionalContext, /Recovery=Rehydrated/);

  const stopResult = runHookEvent(
    "Stop",
    {
      session_id: "wave5_hook_compact_target",
      cwd: projectDir,
      hook_event_name: "Stop",
      stop_hook_active: false,
      last_assistant_message: "closeout after compact",
    },
    {
      projectDir,
      now: "2026-04-02T12:43:00Z",
    }
  );

  assert.equal(stopResult.decision, "block");
});

function runRenderWrapper(route, projectDir) {
  return JSON.parse(
    execFileSync("node", [WRAPPER_PATH, route], {
      cwd: projectDir,
      encoding: "utf8",
      timeout: 10000,
    })
  );
}

test("Wave7A walk render live proof: persisted runtime state survives compaction and renders /walk", () => {
  const projectDir = makeTempProject();
  const sourceSessionId = "wave7_walk_render_source";
  const targetSessionId = "wave7_walk_render_target";

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
      now: "2026-04-04T10:00:00Z",
    }
  );

  runHookEvent(
    "PreToolUse",
    {
      session_id: sourceSessionId,
      cwd: projectDir,
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      tool_input: {
        file_path: path.join(projectDir, "docs", "walk-proof.md"),
        content: "# proof\n",
      },
    },
    {
      projectDir,
      now: "2026-04-04T10:01:00Z",
    }
  );

  runHookEvent(
    "PostToolUse",
    {
      session_id: sourceSessionId,
      cwd: projectDir,
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: {
        file_path: path.join(projectDir, "docs", "walk-proof.md"),
        content: "# proof\n",
      },
      tool_response: "File written.",
    },
    {
      projectDir,
      now: "2026-04-04T10:01:30Z",
    }
  );

  const stopResult = runHookEvent(
    "Stop",
    {
      session_id: sourceSessionId,
      cwd: projectDir,
      hook_event_name: "Stop",
      stop_hook_active: false,
    },
    {
      projectDir,
      now: "2026-04-04T10:02:00Z",
    }
  );

  assert.deepEqual(stopResult, {});

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
      now: "2026-04-04T10:03:00Z",
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
      now: "2026-04-04T10:04:00Z",
    }
  );

  const walkRender = runRenderWrapper("walk", projectDir);
  assert.equal(walkRender.route, "walk");
  assert.equal(walkRender.status, "ok");
  assert.equal(walkRender.rendered.route, "/walk");
  assert.equal(walkRender.rendered.asBuiltStatusCounts.ADDED, 1);
  assert.equal(walkRender.rendered.sessionOfRecordRef, `hook_receipt_${sourceSessionId}`);
  assert.ok(
    typeof walkRender.sessionSource === "string" &&
      walkRender.sessionSource.endsWith(`${targetSessionId}.json`)
  );
});
test("Wave5 hook runtime live proof: Elicitation request path stays observe-only while writing bounded evidence", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "Elicitation",
    {
      session_id: "wave5_hook_live_elicitation",
      cwd: projectDir,
      hook_event_name: "Elicitation",
      mcp_server_name: "github",
      message: "Please authenticate to continue.",
      mode: "form",
      elicitation_id: "elicit-live-001",
      requested_schema: {
        type: "object",
        properties: { username: { type: "string" } },
      },
    },
    { projectDir, now: "2026-04-09T10:00:00Z" }
  );

  assert.deepEqual(result, {});

  const state = loadSessionState(
    resolveRuntimeConfig(projectDir),
    "wave5_hook_live_elicitation"
  );
  const entry = state.chainEntries.find((item) => item.sourceArtifact === "hook:Elicitation");
  assert.equal(state.lastElicitation.mcpServerName, "github");
  assert.equal(state.lastElicitation.requestedFieldCount, 1);
  assert.ok(entry, "Should have an Elicitation chain entry");
  assert.equal(entry.payload.action, "elicitation_observed");
});

test("Wave5 hook runtime live proof: ElicitationResult response path stays observe-only while writing bounded evidence", () => {
  const projectDir = makeTempProject();

  const result = runHookEvent(
    "ElicitationResult",
    {
      session_id: "wave5_hook_live_elicitation_result",
      cwd: projectDir,
      hook_event_name: "ElicitationResult",
      mcp_server_name: "github",
      action: "accept",
      mode: "form",
      elicitation_id: "elicit-live-002",
      content: { username: "alice", otp: "123456" },
    },
    { projectDir, now: "2026-04-09T10:01:00Z" }
  );

  assert.deepEqual(result, {});

  const state = loadSessionState(
    resolveRuntimeConfig(projectDir),
    "wave5_hook_live_elicitation_result"
  );
  const entry = state.chainEntries.find(
    (item) => item.sourceArtifact === "hook:ElicitationResult"
  );
  assert.equal(state.lastElicitationResult.action, "accept");
  assert.equal(state.lastElicitationResult.contentFieldCount, 2);
  assert.ok(entry, "Should have an ElicitationResult chain entry");
  assert.equal(entry.payload.action, "elicitation_result_observed");
  assert.equal(entry.payload.resultAction, "accept");
});
test("Hook runtime live proof: TaskCreated and TaskCompleted keep registry state bounded while writing completion evidence", () => {
  const projectDir = makeTempProject();
  const sessionId = "wave5_hook_live_task_registry";

  const created = runHookEvent(
    "TaskCreated",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TaskCreated",
      task_id: "task-live-001",
      task_subject: "Implement lifecycle seam",
      task_description: "Track task registry in hook runtime",
      teammate_name: "implementer",
      team_name: "my-project",
    },
    { projectDir, now: "2026-04-09T10:02:00Z" }
  );

  const completed = runHookEvent(
    "TaskCompleted",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TaskCompleted",
      task_id: "task-live-001",
      task_subject: "Implement lifecycle seam",
      task_description: "Track task registry in hook runtime",
      teammate_name: "implementer",
      team_name: "my-project",
    },
    { projectDir, now: "2026-04-09T10:03:00Z" }
  );

  assert.deepEqual(created, {});
  assert.deepEqual(completed, {});

  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  assert.equal(state.trackedTasks.length, 0);
  assert.equal(state.lastTaskLifecycle.eventType, "TaskCompleted");
  assert.equal(state.lastTaskLifecycle.outcome, "completed");
  assert.equal(state.chainEntries[0].payload.action, "task_completed");
});

test("Hook runtime live proof: TeammateIdle stays observe-only while surfacing open-task evidence", () => {
  const projectDir = makeTempProject();
  const sessionId = "wave5_hook_live_teammate_idle";

  runHookEvent(
    "TaskCreated",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TaskCreated",
      task_id: "task-live-002",
      task_subject: "Hold open task",
      teammate_name: "researcher",
      team_name: "my-project",
    },
    { projectDir, now: "2026-04-09T10:04:00Z" }
  );

  const result = runHookEvent(
    "TeammateIdle",
    {
      session_id: sessionId,
      cwd: projectDir,
      hook_event_name: "TeammateIdle",
      teammate_name: "researcher",
      team_name: "my-project",
    },
    { projectDir, now: "2026-04-09T10:05:00Z" }
  );

  assert.deepEqual(result, {});

  const state = loadSessionState(resolveRuntimeConfig(projectDir), sessionId);
  const entry = state.chainEntries.find((item) => item.sourceArtifact === "hook:TeammateIdle");
  assert.equal(state.lastTeammateIdle.openTaskCount, 1);
  assert.deepEqual(state.lastTeammateIdle.openTaskIds, ["task-live-002"]);
  assert.ok(entry, "Should have a TeammateIdle chain entry");
  assert.equal(entry.payload.action, "teammate_idle_with_open_tasks");
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