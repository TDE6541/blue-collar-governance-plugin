"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { recordResolve, SKILL_ROUTES } = require("../../src/ResolveSkill");

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

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildStandingRiskInput(overrides = {}) {
  return {
    finding: {
      sourceType: "standing_risk",
      entryId: "continuity_hold_001",
    },
    outcome: "resolve",
    summary: "Operator restored the hold and attached verification.",
    sessionId: "wave7_s01",
    recordedAt: "2026-04-09T12:10:00Z",
    recordedBy: "operator.tim",
    continuityEntryId: "continuity_hold_001",
    sourceRefs: ["receipt:wave7_s01", "chain:continuity_hold_001"],
    evidenceRefs: ["evidence:repair_photo_001"],
    verificationState: "VERIFIED",
    verificationEvidenceRefs: ["evidence:verify_001"],
    ...overrides,
  };
}

function buildManualInput(overrides = {}) {
  return {
    finding: {
      sourceType: "manual",
      manualFindingKey: "manual_find_001",
      findingType: "operator_gap",
      sourceArtifact: "notes/restoration.md",
      sourceLocation: "line 21",
    },
    outcome: "resolve",
    summary: "Operator confirmed a manual finding from explicit source coordinates.",
    sessionId: "wave7_s01",
    recordedAt: "2026-04-09T12:11:00Z",
    recordedBy: "operator.tim",
    sourceRefs: ["notes:restoration", "receipt:wave7_s01"],
    evidenceRefs: ["evidence:manual_photo_001"],
    verificationState: "VERIFIED",
    verificationEvidenceRefs: ["evidence:verify_manual_001"],
    ...overrides,
  };
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

test("ResolveSkill keeps the /resolve route locked", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/resolve"]);
});

test("/resolve records a verified continuity-linked restoration and appends one operator action", () => {
  const state = buildState();

  const result = recordResolve(
    buildStandingRiskInput(),
    state,
    stubAppendChainEntry
  );

  assert.equal(result.route, "/resolve");
  assert.equal(result.action, "recorded");
  assert.equal(result.projectionEligibility.eligible, true);
  assert.equal(result.projectionEligibility.reason, "READY_FOR_BOARD");
  assert.equal(result.chainEntryId, "chain_entry_001");
  assert.equal(state.chainEntries.length, 1);
  assert.equal(state.chainEntries[0].entryType, "OPERATOR_ACTION");
  assert.equal(state.chainEntries[0].payload.action, "restoration_recorded");
  assert.deepEqual(state.chainEntries[0].payload.record, result.record);
  assert.equal(
    state.chainEntries[0].sourceLocation,
    `finding:${result.record.findingRef}`
  );
});

test("/resolve keeps manual-only verified findings off the board projection path", () => {
  const state = buildState();
  const result = recordResolve(buildManualInput(), state, stubAppendChainEntry);

  assert.equal(result.record.findingIdentity.sourceType, "manual");
  assert.equal(result.record.continuityEntryId, null);
  assert.equal(result.projectionEligibility.eligible, false);
  assert.equal(result.projectionEligibility.reason, "NO_CONTINUITY_LINK");
  assert.equal(state.chainEntries.length, 1);
});

test("/resolve requires explicit manual identity ingredients and does not invent them from free text", () => {
  expectValidationError(
    () =>
      recordResolve(
        buildManualInput({
          finding: {
            sourceType: "manual",
            manualFindingKey: "manual_find_001",
            findingType: "operator_gap",
            sourceArtifact: "notes/restoration.md",
            sourceLocation: "",
          },
          summary: "This text exists but must not become a fallback location.",
        })
      ),
    "INVALID_FIELD",
    "'finding.sourceLocation' must be a non-empty string"
  );
});

test("/resolve reports NOT_VERIFIED for continuity-linked records that are still unverified", () => {
  const result = recordResolve(
    buildStandingRiskInput({
      verificationState: "UNVERIFIED",
      verificationEvidenceRefs: [],
    })
  );

  assert.equal(result.projectionEligibility.eligible, false);
  assert.equal(result.projectionEligibility.reason, "NOT_VERIFIED");
});
