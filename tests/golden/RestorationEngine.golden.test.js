"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  FINDING_SOURCE_TYPES,
  RESTORATION_OUTCOMES,
  VERIFICATION_STATES,
  RestorationEngine,
} = require("../../src/RestorationEngine");

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

function buildStandingRiskFinding(overrides = {}) {
  return {
    sourceType: "standing_risk",
    entryId: "continuity_hold_001",
    ...overrides,
  };
}

function buildOmissionFinding(overrides = {}) {
  return {
    sourceType: "omission",
    sessionId: "wave7_s01",
    profilePack: "closeout_pack",
    missingItemCode: "MISSING_CLOSEOUT_NOTE",
    ...overrides,
  };
}

function buildForemansWalkFinding(overrides = {}) {
  return {
    sourceType: "foremans_walk",
    sessionOfRecordRef: "wave7_walk_001",
    issueRef: "issue_walk_009",
    ...overrides,
  };
}

function buildManualFinding(overrides = {}) {
  return {
    sourceType: "manual",
    manualFindingKey: "manual_find_001",
    findingType: "operator_gap",
    sourceArtifact: "notes/restoration.md",
    sourceLocation: "section 1",
    ...overrides,
  };
}

function buildCreateInput(overrides = {}) {
  return {
    finding: buildStandingRiskFinding(),
    outcome: "resolve",
    summary: "Operator restored the blocked hold with evidence.",
    sessionId: "wave7_s01",
    recordedAt: "2026-04-09T12:00:00Z",
    recordedBy: "operator.tim",
    continuityEntryId: "continuity_hold_001",
    sourceRefs: ["receipt:wave7_s01", "chain:continuity_hold_001"],
    evidenceRefs: ["evidence:repair_photo_001"],
    verificationState: "UNVERIFIED",
    verificationEvidenceRefs: [],
    ...overrides,
  };
}

function buildChainEntry(record, overrides = {}) {
  return {
    entryId: "chain_entry_001",
    entryType: "OPERATOR_ACTION",
    recordedAt: record.recordedAt,
    sessionId: record.sessionId,
    sourceArtifact: "skill:resolve",
    sourceLocation: `finding:${record.findingRef}`,
    payload: {
      action: "restoration_recorded",
      record: cloneValue(record),
    },
    linkedEntryRefs: [],
    ...overrides,
  };
}

test("RestorationEngine keeps its published enums locked", () => {
  assert.deepEqual([...FINDING_SOURCE_TYPES], [
    "standing_risk",
    "omission",
    "foremans_walk",
    "manual",
  ]);
  assert.deepEqual([...RESTORATION_OUTCOMES], [
    "resolve",
    "dismiss",
    "explicitly_accept",
  ]);
  assert.deepEqual([...VERIFICATION_STATES], ["UNVERIFIED", "VERIFIED"]);
});

test("RestorationEngine creates deterministic standing-risk restoration records", () => {
  const engine = new RestorationEngine();
  const input = buildCreateInput({
    verificationState: "VERIFIED",
    verificationEvidenceRefs: ["evidence:verify_001"],
  });

  const first = engine.createRecord(input);
  const second = engine.createRecord(input);

  assert.deepEqual(first, second);
  assert.equal(first.findingRef, "standing-risk:continuity_hold_001");
  assert.equal(first.continuityEntryId, "continuity_hold_001");
  assert.equal(first.verificationState, "VERIFIED");
  assert.equal(first.restorationId.startsWith("restoration:"), true);
});

test("RestorationEngine derives omission and walk findingRef values without source-engine widening", () => {
  const engine = new RestorationEngine();

  const omissionRecord = engine.createRecord(
    buildCreateInput({
      finding: buildOmissionFinding(),
      continuityEntryId: "continuity_omission_001",
      verificationState: "VERIFIED",
      verificationEvidenceRefs: ["evidence:verify_omission_001"],
    })
  );
  const walkRecord = engine.createRecord(
    buildCreateInput({
      finding: buildForemansWalkFinding(),
      continuityEntryId: null,
      verificationState: "VERIFIED",
      verificationEvidenceRefs: ["evidence:verify_walk_001"],
    })
  );

  assert.equal(
    omissionRecord.findingRef,
    "omission:wave7_s01:closeout_pack:MISSING_CLOSEOUT_NOTE"
  );
  assert.equal(
    walkRecord.findingRef,
    "foremans-walk:wave7_walk_001:issue_walk_009"
  );
});

test("RestorationEngine requires explicit manual identity ingredients and never falls back to free text", () => {
  const engine = new RestorationEngine();

  expectValidationError(
    () =>
      engine.createRecord(
        buildCreateInput({
          finding: buildManualFinding({
            sourceLocation: "   ",
          }),
          continuityEntryId: null,
          summary: "This summary is present but must not substitute for sourceLocation.",
        })
      ),
    "INVALID_FIELD",
    "'finding.sourceLocation' must be a non-empty string"
  );

  const record = engine.createRecord(
    buildCreateInput({
      finding: buildManualFinding(),
      continuityEntryId: null,
      verificationState: "VERIFIED",
      verificationEvidenceRefs: ["evidence:verify_manual_001"],
    })
  );

  assert.equal(
    record.findingRef,
    "manual:manual_find_001:operator_gap:notes%2Frestoration.md:section%201"
  );
});

test("RestorationEngine requires verification evidence when a record is marked VERIFIED", () => {
  const engine = new RestorationEngine();

  expectValidationError(
    () =>
      engine.createRecord(
        buildCreateInput({
          verificationState: "VERIFIED",
          verificationEvidenceRefs: [],
        })
      ),
    "INVALID_FIELD",
    "'verificationEvidenceRefs' must be a non-empty array when 'verificationState' is VERIFIED"
  );
});

test("RestorationEngine listRecords reads only restoration operator actions from existing chain truth", () => {
  const engine = new RestorationEngine();
  const record = engine.createRecord(
    buildCreateInput({
      verificationState: "VERIFIED",
      verificationEvidenceRefs: ["evidence:verify_001"],
    })
  );

  const records = engine.listRecords([
    {
      entryId: "chain_noise_001",
      entryType: "OBSERVATION",
      recordedAt: "2026-04-09T11:59:00Z",
      sessionId: "wave7_s01",
      sourceArtifact: "diagnose",
      sourceLocation: "observation:1",
      payload: { action: "ignored" },
      linkedEntryRefs: [],
    },
    {
      entryId: "chain_noise_002",
      entryType: "OPERATOR_ACTION",
      recordedAt: "2026-04-09T11:59:30Z",
      sessionId: "wave7_s01",
      sourceArtifact: "skill:other",
      sourceLocation: "other:1",
      payload: { action: "not_restoration" },
      linkedEntryRefs: [],
    },
    buildChainEntry(record),
  ]);

  assert.equal(records.length, 1);
  assert.equal(records[0].chainEntryId, "chain_entry_001");
  assert.equal(records[0].findingRef, "standing-risk:continuity_hold_001");
});

test("RestorationEngine keeps a narrow runtime surface", () => {
  const methodNames = Object.getOwnPropertyNames(RestorationEngine.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "createRecord", "listRecords"]);
});
