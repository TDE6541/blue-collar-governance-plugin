"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  FireBreakSkill,
  SKILL_ROUTES,
} = require("../../src/FireBreakSkill");

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
    openItemsBoardView: {
      boardLabel: "Open Items Board",
      sessionId: "wave5_s32",
      precedence: [
        "Resolved this session",
        "Aging into risk",
        "Still unresolved",
        "Missing now",
      ],
      groups: {
        "Missing now": [
          {
            itemId: "finding_001",
            summary: "Expected handoff artifact was not present.",
            missingItemCode: "MISSING_AS_BUILT",
            profilePack: "form_customer_data_flow",
            sourceRefs: ["omission_wave5_s32"],
            evidenceRefs: ["evidence_omission_001"],
          },
        ],
        "Still unresolved": [
          {
            itemId: "continuity_001",
            summary: "Blocked operation remains open.",
            stateLabel: "OPEN",
            sourceRefs: ["continuity_wave5_s32"],
            evidenceRefs: ["standing_signal_001"],
          },
        ],
        "Aging into risk": [
          {
            itemId: "continuity_002",
            summary: "Carry-forward item remains standing.",
            stateLabel: "STANDING",
            sourceRefs: ["continuity_wave5_s31"],
            evidenceRefs: ["standing_signal_002"],
          },
        ],
        "Resolved this session": [
          {
            itemId: "continuity_003",
            summary: "Outcome captured in current session.",
            stateLabel: "Resolved this session",
            sourceRefs: ["receipt_wave5_s32"],
            evidenceRefs: ["outcome_003"],
          },
        ],
      },
    },
  };
}

test("FireBreakSkill keeps locked route list", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/fire-break"]);
});

test("/fire-break renders deterministic snapshot and keeps input unchanged", () => {
  const skill = new FireBreakSkill();
  const input = sampleInput();
  const snapshot = JSON.parse(JSON.stringify(input));

  const viewA = skill.renderFireBreak(input);
  const viewB = skill.renderFireBreak(input);

  assert.deepEqual(input, snapshot);
  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/fire-break");
  assert.equal(viewA.boardLabel, "Open Items Board");
  assert.equal(viewA.sessionId, "wave5_s32");
  assert.equal(viewA.snapshot.missingNowCount, 1);
  assert.equal(viewA.snapshot.stillUnresolvedCount, 1);
  assert.equal(viewA.snapshot.agingIntoRiskCount, 1);
  assert.equal(viewA.snapshot.resolvedThisSessionCount, 1);
  assert.equal(viewA.snapshot.totalItems, 4);
  assert.equal(viewA.groups["Missing now"][0].itemId, "finding_001");
  assert.equal(viewA.groups["Resolved this session"][0].itemId, "continuity_003");
});

test("/fire-break requires openItemsBoardView", () => {
  const skill = new FireBreakSkill();

  expectValidationError(
    () => skill.renderFireBreak({}),
    "ERR_INVALID_INPUT",
    "'openItemsBoardView' is required"
  );
});

test("FireBreakSkill method list stays render only", () => {
  const methodNames = Object.getOwnPropertyNames(FireBreakSkill.prototype).sort();

  assert.deepEqual(methodNames, ["constructor", "renderFireBreak"]);
});

