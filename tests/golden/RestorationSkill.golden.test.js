"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { recordResolve } = require("../../src/ResolveSkill");
const { RestorationSkill, SKILL_ROUTES } = require("../../src/RestorationSkill");

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

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

function buildState() {
  return {
    chainId: "chain_restoration_001",
    chainEntries: [],
    nextChainCounter: 1,
  };
}

function stubAppendChainEntry(state, entry) {
  const entryId = `chain_entry_${String(state.nextChainCounter).padStart(3, "0")}`;
  state.nextChainCounter += 1;

  const storedEntry = {
    chainId: state.chainId,
    entryId,
    linkedEntryRefs: [],
    ...cloneValue(entry),
  };

  state.chainEntries.push(storedEntry);
  return storedEntry;
}

function buildStandingRiskInput(overrides = {}) {
  return {
    finding: {
      sourceType: "standing_risk",
      entryId: "continuity_hold_001",
    },
    outcome: "resolve",
    summary: "Standing hold was restored and verified.",
    sessionId: "wave7_s01",
    recordedAt: "2026-04-09T12:30:00Z",
    recordedBy: "operator.tim",
    continuityEntryId: "continuity_hold_001",
    sourceRefs: ["receipt:wave7_s01", "chain:continuity_hold_001"],
    evidenceRefs: ["evidence:repair_photo_001"],
    verificationState: "VERIFIED",
    verificationEvidenceRefs: ["evidence:verify_001"],
    ...overrides,
  };
}

function buildWalkInput(overrides = {}) {
  return {
    finding: {
      sourceType: "foremans_walk",
      sessionOfRecordRef: "wave7_walk_001",
      issueRef: "issue_walk_001",
    },
    outcome: "resolve",
    summary: "Walk-only issue was corrected in place.",
    sessionId: "wave7_s01",
    recordedAt: "2026-04-09T12:31:00Z",
    recordedBy: "operator.tim",
    sourceRefs: ["walk:wave7_walk_001"],
    evidenceRefs: ["evidence:walk_photo_001"],
    verificationState: "VERIFIED",
    verificationEvidenceRefs: ["evidence:verify_walk_001"],
    ...overrides,
  };
}

function buildManualInput(overrides = {}) {
  return {
    finding: {
      sourceType: "manual",
      manualFindingKey: "manual_find_003",
      findingType: "operator_gap",
      sourceArtifact: "notes/manual.md",
      sourceLocation: "line 19",
    },
    outcome: "resolve",
    summary: "Manual-only issue was restored from explicit identity inputs.",
    sessionId: "wave7_s01",
    recordedAt: "2026-04-09T12:32:00Z",
    recordedBy: "operator.tim",
    sourceRefs: ["notes:manual", "receipt:wave7_s01"],
    evidenceRefs: ["evidence:manual_photo_001"],
    verificationState: "VERIFIED",
    verificationEvidenceRefs: ["evidence:verify_manual_001"],
    ...overrides,
  };
}

test("RestorationSkill keeps the /restoration route locked", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/restoration"]);
});

test("/restoration renders a deterministic ledger and keeps board projection continuity-only", () => {
  const state = buildState();

  recordResolve(buildStandingRiskInput(), state, stubAppendChainEntry);
  recordResolve(buildWalkInput(), state, stubAppendChainEntry);
  recordResolve(buildManualInput(), state, stubAppendChainEntry);

  const skill = new RestorationSkill();
  const input = {
    chainView: {
      chainId: state.chainId,
      entries: cloneValue(state.chainEntries),
    },
  };
  const snapshot = cloneValue(input);

  const view = skill.renderRestoration(input);

  assert.deepEqual(input, snapshot);
  assert.equal(view.route, "/restoration");
  assert.equal(view.chainId, "chain_restoration_001");
  assert.equal(view.recordCount, 3);
  assert.equal(view.verifiedCount, 3);
  assert.equal(view.boardProjectionCount, 1);
  assert.equal(view.boardResolvedOutcomes.length, 1);
  assert.equal(view.boardResolvedOutcomes[0].entryId, "continuity_hold_001");

  const walkRecord = view.records.find(
    (record) => record.findingIdentity.sourceType === "foremans_walk"
  );
  const manualRecord = view.records.find(
    (record) => record.findingIdentity.sourceType === "manual"
  );

  assert.ok(walkRecord);
  assert.ok(manualRecord);
  assert.equal(walkRecord.projectionEligibility.reason, "NO_CONTINUITY_LINK");
  assert.equal(manualRecord.projectionEligibility.reason, "NO_CONTINUITY_LINK");
});

test("/restoration requires explicit chainView input", () => {
  const skill = new RestorationSkill();

  expectValidationError(
    () => skill.renderRestoration({}),
    "ERR_INVALID_INPUT",
    "'chainView' is required"
  );
});

test("RestorationSkill keeps a read-only method surface", () => {
  const skill = new RestorationSkill();
  const methodNames = Object.getOwnPropertyNames(RestorationSkill.prototype).sort();

  assert.deepEqual(methodNames, ["constructor", "renderRestoration"]);
  assert.equal(typeof skill.persist, "undefined");
  assert.equal(typeof skill.write, "undefined");
  assert.equal(typeof skill.append, "undefined");
});
