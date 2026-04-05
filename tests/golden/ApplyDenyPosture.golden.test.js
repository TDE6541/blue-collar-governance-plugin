"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { PROJECT_HARD_STOP_DENY_RULES } = require("../../src/HookRuntime");
const {
  HARD_ERROR_EXIT_CODE,
  PROJECT_RULE_SOURCE,
  SUCCESS_EXIT_CODE,
  VERIFY_FAILURE_EXIT_CODE,
  getSettingsPath,
  runCli,
} = require("../../scripts/apply-deny-posture");

function makeTempTarget() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bcgp-apply-deny-"));
}

function writeSettings(targetDir, settings) {
  const settingsPath = getSettingsPath(targetDir);
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

function readSettings(targetDir) {
  return JSON.parse(fs.readFileSync(getSettingsPath(targetDir), "utf8"));
}

function captureRun(args, cwd = process.cwd()) {
  let stdout = "";
  let stderr = "";
  const exitCode = runCli(args, {
    cwd,
    stdout: { write(chunk) { stdout += chunk; } },
    stderr: { write(chunk) { stderr += chunk; } },
  });

  return {
    exitCode,
    stdout,
    stderr,
    stdoutJson: stdout.trim() ? JSON.parse(stdout) : null,
    stderrJson: stderr.trim() ? JSON.parse(stderr) : null,
  };
}

test("apply-deny-posture merges canonical deny rules into empty settings", () => {
  const targetDir = makeTempTarget();

  const result = captureRun([targetDir]);

  assert.equal(result.exitCode, SUCCESS_EXIT_CODE);
  assert.equal(result.stdoutJson.mode, "apply");
  assert.equal(result.stdoutJson.ruleSource, PROJECT_RULE_SOURCE);
  assert.deepEqual(result.stdoutJson.addedRules, PROJECT_HARD_STOP_DENY_RULES);
  assert.deepEqual(result.stdoutJson.alreadyPresentRules, []);
  assert.equal(result.stdoutJson.writePerformed, true);

  const written = readSettings(targetDir);
  assert.deepEqual(written.permissions.deny, PROJECT_HARD_STOP_DENY_RULES);
});

test("apply-deny-posture preserves non-deny settings and non-plugin deny rules", () => {
  const targetDir = makeTempTarget();
  writeSettings(targetDir, {
    blueCollarGovernance: {
      hookRuntime: {
        profileId: "balanced",
      },
    },
    permissions: {
      allow: ["Read"],
      deny: ["Custom(rule)", PROJECT_HARD_STOP_DENY_RULES[0]],
    },
    notes: {
      owner: "ops",
    },
  });

  const result = captureRun([targetDir]);

  assert.equal(result.exitCode, SUCCESS_EXIT_CODE);
  assert.deepEqual(result.stdoutJson.alreadyPresentRules, [PROJECT_HARD_STOP_DENY_RULES[0]]);
  assert.deepEqual(result.stdoutJson.preservedNonPluginRules, ["Custom(rule)"]);

  const written = readSettings(targetDir);
  assert.deepEqual(written.blueCollarGovernance, {
    hookRuntime: {
      profileId: "balanced",
    },
  });
  assert.deepEqual(written.notes, { owner: "ops" });
  assert.deepEqual(written.permissions.allow, ["Read"]);
  assert.deepEqual(written.permissions.deny, [
    "Custom(rule)",
    ...PROJECT_HARD_STOP_DENY_RULES,
  ]);
});

test("apply-deny-posture is idempotent on re-application", () => {
  const targetDir = makeTempTarget();

  const first = captureRun([targetDir]);
  const firstFile = fs.readFileSync(getSettingsPath(targetDir), "utf8");
  const second = captureRun([targetDir]);
  const secondFile = fs.readFileSync(getSettingsPath(targetDir), "utf8");

  assert.equal(first.exitCode, SUCCESS_EXIT_CODE);
  assert.equal(second.exitCode, SUCCESS_EXIT_CODE);
  assert.deepEqual(second.stdoutJson.addedRules, []);
  assert.deepEqual(second.stdoutJson.alreadyPresentRules, PROJECT_HARD_STOP_DENY_RULES);
  assert.equal(firstFile, secondFile);
});

test("apply-deny-posture dry-run reports changes and performs no writes", () => {
  const targetDir = makeTempTarget();

  const result = captureRun([targetDir, "--dry-run"]);

  assert.equal(result.exitCode, SUCCESS_EXIT_CODE);
  assert.equal(result.stdoutJson.mode, "dry-run");
  assert.equal(result.stdoutJson.writePerformed, false);
  assert.deepEqual(result.stdoutJson.addedRules, PROJECT_HARD_STOP_DENY_RULES);
  assert.equal(fs.existsSync(getSettingsPath(targetDir)), false);
});

test("apply-deny-posture verify passes when all canonical rules are present", () => {
  const targetDir = makeTempTarget();
  writeSettings(targetDir, {
    permissions: {
      deny: [...PROJECT_HARD_STOP_DENY_RULES, "Custom(rule)"],
    },
  });

  const result = captureRun([targetDir, "--verify"]);

  assert.equal(result.exitCode, SUCCESS_EXIT_CODE);
  assert.equal(result.stdoutJson.mode, "verify");
  assert.equal(result.stdoutJson.status, "ok");
  assert.deepEqual(result.stdoutJson.presentRules, PROJECT_HARD_STOP_DENY_RULES);
  assert.deepEqual(result.stdoutJson.missingRules, []);
});

test("apply-deny-posture verify fails with exit 1 when canonical rules are missing", () => {
  const targetDir = makeTempTarget();
  writeSettings(targetDir, {
    permissions: {
      deny: [PROJECT_HARD_STOP_DENY_RULES[0]],
    },
  });

  const result = captureRun([targetDir, "--verify"]);

  assert.equal(result.exitCode, VERIFY_FAILURE_EXIT_CODE);
  assert.equal(result.stdoutJson.status, "verification_failed");
  assert.deepEqual(result.stdoutJson.presentRules, [PROJECT_HARD_STOP_DENY_RULES[0]]);
  assert.deepEqual(result.stdoutJson.missingRules, PROJECT_HARD_STOP_DENY_RULES.slice(1));
});

test("apply-deny-posture returns hard error exit 2 for invalid target path", () => {
  const result = captureRun([path.join("C:", "definitely", "missing", "bcgp-target")]);

  assert.equal(result.exitCode, HARD_ERROR_EXIT_CODE);
  assert.equal(result.stderrJson.status, "error");
  assert.match(result.stderrJson.error, /Target directory does not exist/);
});
