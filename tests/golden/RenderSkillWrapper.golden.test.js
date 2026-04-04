"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const WRAPPER_PATH = path.join(__dirname, "..", "..", "scripts", "render-skill.js");

function makeTempRuntimeDir() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "render-skill-test-"));
  const runtimeDir = path.join(base, ".claude", "runtime");
  fs.mkdirSync(runtimeDir, { recursive: true });
  return { base, runtimeDir };
}

function writeSessionState(runtimeDir, filename, state) {
  fs.writeFileSync(path.join(runtimeDir, filename), JSON.stringify(state), "utf8");
}

function runWrapper(route, projectDir) {
  const result = execFileSync("node", [WRAPPER_PATH, route], {
    cwd: projectDir,
    env: { ...process.env },
    encoding: "utf8",
    timeout: 10000,
  });
  return JSON.parse(result);
}

const T0 = "2026-04-04T00:00:00Z";
const T1 = "2026-04-04T00:01:00Z";
const SESSION_ID = "test-session-001";

function buildPopulatedState() {
  return {
    version: 1,
    chainEntries: [
      {
        chainId: `hook_chain_${SESSION_ID}`,
        entryId: `hook_instruction_loaded_${SESSION_ID}_0001`,
        entryType: "OPERATOR_ACTION",
        recordedAt: T0,
        sessionId: SESSION_ID,
        sourceArtifact: "hook:InstructionsLoaded",
        sourceLocation: "file:CLAUDE.md",
        payload: { action: "instructions_loaded", file: "CLAUDE.md" },
        linkedEntryRefs: [],
      },
      {
        chainId: `hook_chain_${SESSION_ID}`,
        entryId: `hook_completed_${SESSION_ID}_0002`,
        entryType: "EVIDENCE",
        recordedAt: T1,
        sessionId: SESSION_ID,
        sourceArtifact: "hook:PostToolUse",
        sourceLocation: "docs/INDEX.md",
        payload: { action: "tool_completed", tool: "Edit" },
        linkedEntryRefs: [],
      },
    ],
    observedActions: [],
    blockedActions: [],
    nextChainCounter: 3,
    profileId: "conservative",
  };
}

test("render-skill chain returns deterministic non-empty render from populated state", () => {
  const { base, runtimeDir } = makeTempRuntimeDir();
  writeSessionState(runtimeDir, `${SESSION_ID}.json`, buildPopulatedState());

  const result = runWrapper("chain", base);

  assert.equal(result.route, "chain");
  assert.equal(result.status, "ok");
  assert.ok(result.sessionSource);
  assert.ok(result.rendered);
  assert.equal(result.rendered.route, "/chain");
  assert.equal(result.rendered.entryCount, 2);
  assert.equal(result.rendered.entryTypeSummary.OPERATOR_ACTION, 1);
  assert.equal(result.rendered.entryTypeSummary.EVIDENCE, 1);
  assert.equal(result.rendered.entries.length, 2);

  fs.rmSync(base, { recursive: true, force: true });
});

test("render-skill chain returns hold when session state has no chain entries", () => {
  const { base, runtimeDir } = makeTempRuntimeDir();
  writeSessionState(runtimeDir, `${SESSION_ID}.json`, {
    version: 1,
    chainEntries: [],
    observedActions: [],
    blockedActions: [],
    nextChainCounter: 1,
  });

  const result = runWrapper("chain", base);

  assert.equal(result.route, "chain");
  assert.equal(result.status, "hold");
  assert.ok(result.hold);
  assert.ok(result.hold.reason);

  fs.rmSync(base, { recursive: true, force: true });
});

test("render-skill walk returns deterministic hold for missing session brief and receipt", () => {
  const { base, runtimeDir } = makeTempRuntimeDir();
  writeSessionState(runtimeDir, `${SESSION_ID}.json`, buildPopulatedState());

  const result = runWrapper("walk", base);

  assert.equal(result.route, "walk");
  assert.equal(result.status, "hold");
  assert.ok(result.hold);
  assert.ok(result.hold.missingInputs.length > 0);

  fs.rmSync(base, { recursive: true, force: true });
});

test("render-skill fire-break returns deterministic hold for missing board inputs", () => {
  const { base, runtimeDir } = makeTempRuntimeDir();
  writeSessionState(runtimeDir, `${SESSION_ID}.json`, buildPopulatedState());

  const result = runWrapper("fire-break", base);

  assert.equal(result.route, "fire-break");
  assert.equal(result.status, "hold");
  assert.ok(result.hold);
  assert.ok(result.hold.missingInputs.length > 0);

  fs.rmSync(base, { recursive: true, force: true });
});

test("render-skill prevention-record returns deterministic render from forensic entries", () => {
  const { base, runtimeDir } = makeTempRuntimeDir();
  writeSessionState(runtimeDir, `${SESSION_ID}.json`, buildPopulatedState());

  const result = runWrapper("prevention-record", base);

  assert.equal(result.route, "prevention-record");
  assert.equal(result.status, "ok");
  assert.ok(result.rendered);
  assert.equal(result.rendered.route, "/prevention-record");
  assert.equal(result.rendered.sessionId, SESSION_ID);
  assert.equal(result.rendered.sourceCounts.forensicEntries, 2);
  assert.equal(result.rendered.sourceCounts.totalSignals, 2);
  assert.equal(result.rendered.capturedSignals.length, 2);

  fs.rmSync(base, { recursive: true, force: true });
});

test("render-skill prevention-record returns hold when no forensic entries exist", () => {
  const { base, runtimeDir } = makeTempRuntimeDir();
  writeSessionState(runtimeDir, `${SESSION_ID}.json`, {
    version: 1,
    chainEntries: [],
    observedActions: [],
    blockedActions: [],
    nextChainCounter: 1,
  });

  const result = runWrapper("prevention-record", base);

  assert.equal(result.route, "prevention-record");
  assert.equal(result.status, "hold");
  assert.ok(result.hold);

  fs.rmSync(base, { recursive: true, force: true });
});

test("render-skill returns hold when no session state files exist", () => {
  const { base } = makeTempRuntimeDir();

  // Remove all json files from runtime dir to simulate empty state
  const runtimeDir = path.join(base, ".claude", "runtime");
  for (const f of fs.readdirSync(runtimeDir)) {
    fs.unlinkSync(path.join(runtimeDir, f));
  }

  const result = runWrapper("chain", base);

  assert.equal(result.route, "chain");
  assert.equal(result.status, "hold");
  assert.ok(result.hold.reason.includes("no session state"));

  fs.rmSync(base, { recursive: true, force: true });
});

test("render-skill exits with error for unsupported route", () => {
  assert.throws(() => {
    execFileSync("node", [WRAPPER_PATH, "nonexistent"], {
      encoding: "utf8",
      timeout: 10000,
    });
  });
});
