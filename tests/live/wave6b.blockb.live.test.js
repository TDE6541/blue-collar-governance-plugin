"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  appendChainEntry,
  createEmptySessionState,
  loadSessionState,
  resolveRuntimeConfig,
  runHookEvent,
  saveSessionState,
} = require("../../src/HookRuntime");

const {
  createLotoClearance,
  revokeLotoClearance,
} = require("../../src/LotoClearanceSkill");

const {
  createPermit,
  revokePermit,
} = require("../../src/PermitIssuanceSkill");

function makeTempProject() {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "bcgp-blockb-live-"));
  fs.mkdirSync(path.join(projectDir, ".claude"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, ".claude", "settings.json"),
    JSON.stringify({
      blueCollarGovernance: {
        hookRuntime: {
          profileId: "conservative",
          stateDirectory: ".claude/runtime",
          matchedTools: ["Bash", "Write", "Edit"],
          blockingSeverities: ["CRITICAL", "HIGH"],
        },
      },
    }, null, 2)
  );
  fs.writeFileSync(path.join(projectDir, "src", "pricing-engine.js"), "module.exports = {};\n");
  return projectDir;
}

test("Block B live: HARD_STOP denied → loto-clearance + issue-permit → allowed → revoke → denied → compaction", () => {
  const projectDir = makeTempProject();
  const config = resolveRuntimeConfig(projectDir);
  const sessionId = "live-blockb-session";
  const now = "2026-04-03T17:00:00Z";

  // 1. HARD_STOP denied before any authoring
  const denied1 = runHookEvent("PreToolUse", {
    session_id: sessionId,
    cwd: projectDir,
    hook_event_name: "PreToolUse",
    tool_name: "Edit",
    tool_input: {
      file_path: path.join(projectDir, "src", "pricing-engine.js"),
      old_string: "module.exports = {};",
      new_string: "module.exports = { changed: true };",
    },
  }, { projectDir, now: "2026-04-03T17:00:00Z" });

  assert.equal(denied1.hookSpecificOutput.permissionDecision, "deny");
  assert.match(denied1.hookSpecificOutput.permissionDecisionReason, /HARD_STOP/);

  // 2. Author LOTO clearance via /loto-clearance
  const state1 = loadSessionState(config, sessionId);
  const clearanceResult = createLotoClearance({
    domainId: "pricing_quote_logic",
    operatorName: "architect",
    reason: "Approved pricing change for live test",
    sessionId,
    scope: { scopeType: "SESSION", sessionId },
    createdAt: "2026-04-03T17:01:00Z",
  }, state1, appendChainEntry);

  assert.equal(clearanceResult.action, "created");
  assert.ok(clearanceResult.chainEntryId);

  // 3. Author permit via /issue-permit
  const permitResult = createPermit({
    domainId: "pricing_quote_logic",
    sessionId,
    operatorDecision: "GRANTED",
    scopeJustification: "Bounded pricing update for live proof",
    riskAssessment: "Low risk, single file",
    rollbackPlan: "Revert the edit",
    createdAt: "2026-04-03T17:02:00Z",
  }, state1, appendChainEntry);

  assert.equal(permitResult.action, "created");
  assert.ok(permitResult.chainEntryId);
  saveSessionState(config, sessionId, state1);

  // 4. HARD_STOP now allowed with valid clearance + permit
  const allowed = runHookEvent("PreToolUse", {
    session_id: sessionId,
    cwd: projectDir,
    hook_event_name: "PreToolUse",
    tool_name: "Edit",
    tool_input: {
      file_path: path.join(projectDir, "src", "pricing-engine.js"),
      old_string: "module.exports = {};",
      new_string: "module.exports = { changed: true };",
    },
  }, { projectDir, now: "2026-04-03T17:03:00Z" });

  assert.deepEqual(allowed, {});

  // 5. Verify chain has authoring + permitted entries
  const state2 = loadSessionState(config, sessionId);
  const chainActions = state2.chainEntries.map((e) => e.payload.action);
  assert.ok(chainActions.includes("authorization_created"));
  assert.ok(chainActions.includes("permit_created"));
  assert.ok(chainActions.includes("permitted"));

  // 6. Revoke the permit → should deny again
  revokePermit({
    permitId: permitResult.permit.permitId,
    sessionId,
    revokedAt: "2026-04-03T17:04:00Z",
  }, state2, appendChainEntry);
  saveSessionState(config, sessionId, state2);

  const denied2 = runHookEvent("PreToolUse", {
    session_id: sessionId,
    cwd: projectDir,
    hook_event_name: "PreToolUse",
    tool_name: "Edit",
    tool_input: {
      file_path: path.join(projectDir, "src", "pricing-engine.js"),
      old_string: "module.exports = {};",
      new_string: "module.exports = { changed: true };",
    },
  }, { projectDir, now: "2026-04-03T17:05:00Z" });

  assert.equal(denied2.hookSpecificOutput.permissionDecision, "deny");

  // 7. Verify permit_revoked in chain
  const state3 = loadSessionState(config, sessionId);
  const revokeActions = state3.chainEntries.filter(
    (e) => e.payload.action === "permit_revoked"
  );
  assert.equal(revokeActions.length, 1);

  // 8. Re-author permit + verify compaction survival
  createPermit({
    domainId: "pricing_quote_logic",
    sessionId,
    operatorDecision: "GRANTED",
    scopeJustification: "Re-issued for compaction test",
    riskAssessment: "Low",
    rollbackPlan: "Revert",
    createdAt: "2026-04-03T17:06:00Z",
  }, state3, appendChainEntry);
  saveSessionState(config, sessionId, state3);

  // PreCompact
  runHookEvent("PreCompact", {
    session_id: sessionId,
    cwd: projectDir,
    hook_event_name: "PreCompact",
    trigger: "manual",
  }, { projectDir, now: "2026-04-03T17:07:00Z" });

  // SessionStart compact in new session
  const newSession = "live-blockb-session-post-compact";
  runHookEvent("SessionStart", {
    session_id: newSession,
    cwd: projectDir,
    hook_event_name: "SessionStart",
    source: "compact",
  }, { projectDir, now: "2026-04-03T17:08:00Z" });

  const rehydrated = loadSessionState(config, newSession);
  assert.ok(rehydrated.activeAuthorizations.length >= 1, "LOTO clearance survives compaction");
  assert.ok(rehydrated.activePermits.length >= 1, "Permit survives compaction");
  assert.ok(rehydrated.chainEntries.length >= 4, "Chain entries survive compaction");
});
