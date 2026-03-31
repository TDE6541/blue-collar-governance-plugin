"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CompressedGovernanceHealthSkills,
  SKILL_ROUTES,
  RIGHTS_VIEW_MODE
} = require("../../src/CompressedGovernanceHealthSkills");

function expectValidationError(action, code, message) {
  try {
    action();
    assert.fail("Expected validation error, but no error was thrown");
  } catch (error) {
    assert.equal(error.name, "ValidationError");
    assert.equal(error.code, code);
    assert.equal(error.message, `${code}: ${message}`);
  }
}

function sampleInput() {
  return {
    sessionId: "wave5_s31",
    foremansWalkFindings: [
      {
        findingId: "finding_walk_001",
        findingType: "VIOLATION",
        summary: "HARD_STOP domain action lacked explicit authorization.",
        sourceRefs: ["walk_session_wave5_s31"],
        evidenceRefs: ["chain:walk_violation_001"]
      }
    ],
    boardCapturedItems: [
      {
        itemId: "board_item_001",
        summary: "Long-carry continuity item remains visible.",
        stateLabel: "STANDING",
        sourceRefs: ["board_wave5_s31"],
        evidenceRefs: ["standing_eval_wave5_s31"]
      }
    ],
    continuityEntries: [
      {
        entryId: "continuity_001",
        entryType: "hold",
        summary: "Protected change remains blocked pending explicit authorization.",
        sourceRefs: ["continuity_wave5_s31"],
        evidenceRefs: ["receipt_wave5_s31"]
      }
    ],
    standingRiskItems: [
      {
        entryId: "continuity_001",
        state: "STANDING",
        summary: "Escalation triad remains true with carry count >= 2.",
        sourceRefs: ["standing_wave5_s31"],
        evidenceRefs: ["risk_signal_wave5_s31"]
      }
    ],
    forensicEntries: [
      {
        entryId: "forensic_001",
        entryType: "FINDING",
        recordedAt: "2026-03-31T19:00:00Z",
        sourceArtifact: "tests/live/wave4.live-oversight.live.test.js",
        sourceLocation: "violation-path",
        payload: {
          summary: "Chain captured governance intervention context."
        },
        linkedEntryRefs: ["claim_001", "evidence_001"]
      }
    ]
  };
}

test("CompressedGovernanceHealthSkills exposes the locked route list", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/prevention-record", "/rights"]);
});

test("/prevention-record renders deterministic explicit-signal history and does not mutate input", () => {
  const skills = new CompressedGovernanceHealthSkills();
  const input = sampleInput();
  const snapshot = JSON.parse(JSON.stringify(input));

  const viewA = skills.renderPreventionRecord(input);
  const viewB = skills.renderPreventionRecord(input);

  assert.deepEqual(input, snapshot);
  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/prevention-record");
  assert.equal(viewA.sessionId, "wave5_s31");
  assert.equal(viewA.sourceCounts.totalSignals, 5);
  assert.equal(viewA.capturedSignals.length, 5);
  assert.equal(viewA.capturedSignals[0].sourceSurface, "FOREMANS_WALK");
  assert.equal(viewA.capturedSignals[4].sourceSurface, "FORENSIC_CHAIN");
});

test("/prevention-record raises HOLD when explicit captured signals are absent", () => {
  const skills = new CompressedGovernanceHealthSkills();

  expectValidationError(
    () =>
      skills.renderPreventionRecord({
        sessionId: "wave5_s31",
        foremansWalkFindings: [],
        boardCapturedItems: [],
        continuityEntries: [],
        standingRiskItems: [],
        forensicEntries: []
      }),
    "HOLD_INSUFFICIENT_EVIDENCE",
    "No explicit captured governance signal is available for '/prevention-record'"
  );
});

test("/rights renders deterministic manual static declaration", () => {
  const skills = new CompressedGovernanceHealthSkills();

  const viewA = skills.renderRights();
  const viewB = skills.renderRights();

  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/rights");
  assert.equal(viewA.viewMode, RIGHTS_VIEW_MODE);
  assert.equal(Array.isArray(viewA.rights), true);
  assert.equal(viewA.rights.length, 5);
  assert.equal(viewA.rights[0].rightId, "RIGHT_SCOPE_CLARITY");
});

test("CompressedGovernanceHealthSkills public method surface is render-only", () => {
  const methodNames = Object.getOwnPropertyNames(CompressedGovernanceHealthSkills.prototype).sort();

  assert.deepEqual(methodNames, ["constructor", "renderPreventionRecord", "renderRights"]);
});
