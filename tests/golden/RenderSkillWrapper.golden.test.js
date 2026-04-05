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

function buildWalkReadyState() {
  return {
    ...buildPopulatedState(),
    persistedBrief: {
      briefId: `hook_brief_${SESSION_ID}`,
      inScope: [],
      outOfScope: [],
      controlRodProfile: {
        profileId: "conservative",
        domainRules: [],
      },
      source: "hook_runtime",
      createdAt: T0,
    },
    persistedReceipt: {
      receiptId: `hook_receipt_${SESSION_ID}`,
      completedWork: ["Write docs/walk-note.md"],
      holdsRaised: [],
      source: "hook_runtime",
      createdAt: T1,
    },
    lastWalk: {
      findings: [],
      findingSummary: {
        VIOLATION: 0,
        DRIFT: 0,
        INCOMPLETE: 0,
        PHANTOM: 0,
        GHOST: 0,
        PARTIAL_VERIFICATION: 0,
        EVIDENCE_GAP: 0,
      },
      asBuilt: {
        sessionOfRecordRef: `hook_receipt_${SESSION_ID}`,
        statusCounts: {
          MATCHED: 0,
          MODIFIED: 0,
          ADDED: 1,
          DEFERRED: 0,
          HELD: 0,
        },
      },
    },
  };
}

function buildFireBreakReadyState() {
  return {
    ...buildPopulatedState(),
    lastFireBreak: {
      boardLabel: "Open Items Board",
      sessionId: SESSION_ID,
      precedence: [
        "Resolved this session",
        "Aging into risk",
        "Still unresolved",
        "Missing now",
      ],
      groups: {
        "Missing now": [],
        "Still unresolved": [],
        "Aging into risk": [],
        "Resolved this session": [
          {
            itemId: `hook_firebreak_resolved_${SESSION_ID}`,
            summary: "Edit src/pricing-engine.js completed after permit-cleared HARD_STOP governance passage in this session.",
            stateLabel: "Hook-runtime governance passage",
            sourceRefs: [`hook_runtime:observedAction:${SESSION_ID}`],
            evidenceRefs: [`hook_completed_${SESSION_ID}_0002`],
          },
        ],
      },
      source: "hook_runtime",
      projectionType: "hook_runtime_governance_health_snapshot",
      derivedAt: T1,
    },
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

test("render-skill walk returns deterministic render from persisted Walk state", () => {
  const { base, runtimeDir } = makeTempRuntimeDir();
  writeSessionState(runtimeDir, `${SESSION_ID}.json`, buildWalkReadyState());

  const result = runWrapper("walk", base);

  assert.equal(result.route, "walk");
  assert.equal(result.status, "ok");
  assert.ok(result.rendered);
  assert.equal(result.rendered.route, "/walk");
  assert.equal(result.rendered.findingCount, 0);
  assert.equal(result.rendered.sessionOfRecordRef, `hook_receipt_${SESSION_ID}`);
  assert.equal(result.rendered.asBuiltStatusCounts.ADDED, 1);

  fs.rmSync(base, { recursive: true, force: true });
});

test("render-skill walk returns deterministic hold when persisted Walk cache is absent", () => {
  const { base, runtimeDir } = makeTempRuntimeDir();
  writeSessionState(runtimeDir, `${SESSION_ID}.json`, buildPopulatedState());

  const result = runWrapper("walk", base);

  assert.equal(result.route, "walk");
  assert.equal(result.status, "hold");
  assert.ok(result.hold);
  assert.deepEqual(result.hold.missingInputs, ["lastWalk"]);

  fs.rmSync(base, { recursive: true, force: true });
});

test("render-skill fire-break returns deterministic render from persisted hook snapshot", () => {
  const { base, runtimeDir } = makeTempRuntimeDir();
  writeSessionState(runtimeDir, `${SESSION_ID}.json`, buildFireBreakReadyState());

  const result = runWrapper("fire-break", base);

  assert.equal(result.route, "fire-break");
  assert.equal(result.status, "ok");
  assert.ok(result.rendered);
  assert.equal(result.rendered.route, "/fire-break");
  assert.equal(result.rendered.snapshot.resolvedThisSessionCount, 1);
  assert.equal(result.rendered.snapshot.missingNowCount, 0);
  assert.equal(result.rendered.snapshot.totalItems, 1);
  assert.equal(result.rendered.groups["Resolved this session"][0].stateLabel, "Hook-runtime governance passage");

  fs.rmSync(base, { recursive: true, force: true });
});

test("render-skill fire-break returns deterministic hold when persisted snapshot is absent", () => {
  const { base, runtimeDir } = makeTempRuntimeDir();
  writeSessionState(runtimeDir, `${SESSION_ID}.json`, buildPopulatedState());

  const result = runWrapper("fire-break", base);

  assert.equal(result.route, "fire-break");
  assert.equal(result.status, "hold");
  assert.ok(result.hold);
  assert.deepEqual(result.hold.missingInputs, ["lastFireBreak"]);

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
