"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { ForensicChain } = require("../../src/ForensicChain");
const { SessionBrief } = require("../../src/SessionBrief");
const { ControlRodMode, AUTONOMY_LEVELS } = require("../../src/ControlRodMode");
const { OperatorTrustLedger } = require("../../src/OperatorTrustLedger");
const { JourneymanTrustEngine } = require("../../src/JourneymanTrustEngine");

const T0 = "2026-03-31T11:00:00Z";
const T1 = "2026-03-31T11:05:00Z";
const T2 = "2026-03-31T11:10:00Z";
const T3 = "2026-03-31T11:15:00Z";

function expectValidationError(run, code, message) {
  let error;
  try {
    run();
  } catch (caught) {
    error = caught;
  }

  if (!error) {
    assert.fail("Expected validation error, but no error was thrown");
  }

  assert.equal(error.name, "ValidationError");
  assert.equal(error.code, code);
  assert.equal(error.message, `${code}: ${message}`);
}

function buildForensicChain() {
  const chain = new ForensicChain("forensic_chain_wave5_block_a_001");

  chain.appendEntry({
    entryId: "evidence_001",
    entryType: "EVIDENCE",
    recordedAt: T0,
    sessionId: "wave5a_block_a_s01",
    sourceArtifact: "tests/live/wave4.live-oversight.live.test.js",
    sourceLocation: "trust-regression-detection",
    payload: {
      summary: "Observed trust-relevant regression signal.",
    },
    linkedEntryRefs: [],
  });

  chain.appendEntry({
    entryId: "finding_001",
    entryType: "FINDING",
    recordedAt: T1,
    sessionId: "wave5a_block_a_s01",
    sourceArtifact: "docs/WAVE4_CLOSEOUT.md",
    sourceLocation: "Wave 4 Oversight Evidence",
    payload: {
      summary: "Evidence confirms controlled regression path.",
    },
    linkedEntryRefs: ["evidence_001"],
  });

  return chain;
}

test("JourneymanTrustEngine reads trust state deterministically from OperatorTrustLedger", () => {
  const ledger = new OperatorTrustLedger();
  const engine = new JourneymanTrustEngine({ trustLedger: ledger });

  const firstRead = engine.readTrustState({
    operatorKey: "operator_alpha",
    readAt: T0,
  });

  const secondRead = engine.readTrustState({
    operatorKey: "operator_alpha",
    readAt: T1,
  });

  assert.equal(firstRead.currentLevel, "APPRENTICE");
  assert.equal(secondRead.currentLevel, "APPRENTICE");
  assert.equal(secondRead.createdAt, T0);
});

test("JourneymanTrustEngine proposes promotion, hold, and regression deterministically and persists outcomes", () => {
  const ledger = new OperatorTrustLedger();
  const chain = buildForensicChain();
  const engine = new JourneymanTrustEngine({ trustLedger: ledger, forensicChain: chain });

  const promotion = engine.evaluateDecision({
    operatorKey: "operator_bravo",
    decisionId: "decision_001",
    evaluatedAt: T1,
    promotionSignal: true,
    reasonCodes: ["PROMOTION_SIGNAL_TRUE"],
    forensicReferenceIds: ["evidence_001"],
  });

  const hold = engine.evaluateDecision({
    operatorKey: "operator_bravo",
    decisionId: "decision_002",
    evaluatedAt: T2,
    reasonCodes: ["NO_SIGNAL"],
    forensicReferenceIds: ["finding_001"],
  });

  const regression = engine.evaluateDecision({
    operatorKey: "operator_bravo",
    decisionId: "decision_003",
    evaluatedAt: T3,
    regressionSignal: true,
    reasonCodes: ["REGRESSION_SIGNAL_TRUE"],
    forensicReferenceIds: ["finding_001"],
  });

  assert.equal(promotion.decisionType, "PROMOTION");
  assert.equal(promotion.fromLevel, "APPRENTICE");
  assert.equal(promotion.toLevel, "JOURNEYMAN");

  assert.equal(hold.decisionType, "HOLD");
  assert.equal(hold.fromLevel, "JOURNEYMAN");
  assert.equal(hold.toLevel, "JOURNEYMAN");

  assert.equal(regression.decisionType, "REGRESSION");
  assert.equal(regression.fromLevel, "JOURNEYMAN");
  assert.equal(regression.toLevel, "APPRENTICE");
  assert.deepEqual(regression.forensicReferenceIds, ["finding_001"]);

  const finalState = ledger.getOperatorState("operator_bravo");
  assert.equal(finalState.currentLevel, "APPRENTICE");
  assert.equal(finalState.decisionHistory.length, 3);
  assert.equal(finalState.levelTransitions.length, 2);
});

test("JourneymanTrustEngine regression decisions require concrete forensic reference ids", () => {
  const ledger = new OperatorTrustLedger();
  const chain = buildForensicChain();
  const engine = new JourneymanTrustEngine({ trustLedger: ledger, forensicChain: chain });

  expectValidationError(
    () =>
      engine.evaluateDecision({
        operatorKey: "operator_charlie",
        decisionId: "decision_missing_refs",
        evaluatedAt: T1,
        regressionSignal: true,
        forensicReferenceIds: [],
      }),
    "INVALID_FIELD",
    "'forensicReferenceIds' must be a non-empty array of strings"
  );

  expectValidationError(
    () =>
      engine.evaluateDecision({
        operatorKey: "operator_charlie",
        decisionId: "decision_bad_ref",
        evaluatedAt: T1,
        regressionSignal: true,
        forensicReferenceIds: ["missing_forensic_entry"],
      }),
    "FORENSIC_REF_NOT_FOUND",
    "forensic reference 'missing_forensic_entry' was not found"
  );
});

test("JourneymanTrustEngine persists approved rod adjustments and override outcomes without mutating Control Rod enum", () => {
  const ledger = new OperatorTrustLedger();
  const chain = buildForensicChain();
  const engine = new JourneymanTrustEngine({ trustLedger: ledger, forensicChain: chain });

  const beforeLevels = [...AUTONOMY_LEVELS];

  const stateAfterAdjustment = engine.recordApprovedRodAdjustment({
    operatorKey: "operator_delta",
    adjustmentId: "rod_adj_001",
    fromAutonomyLevel: "SUPERVISED",
    toAutonomyLevel: "HARD_STOP",
    approvedBy: "architect",
    approvedAt: T2,
    reason: "Escalate after repeated controlled exceptions.",
    forensicReferenceIds: ["finding_001"],
  });

  const stateAfterOverride = engine.recordOverrideOutcome({
    operatorKey: "operator_delta",
    overrideId: "override_001",
    outcome: "APPROVED",
    resolvedBy: "architect",
    resolvedAt: T3,
    reason: "Override accepted with bounded scope.",
    forensicReferenceIds: ["finding_001"],
  });

  assert.equal(stateAfterAdjustment.approvedRodAdjustments.length, 1);
  assert.equal(stateAfterOverride.overrideOutcomes.length, 1);
  assert.deepEqual([...AUTONOMY_LEVELS], beforeLevels);

  const mode = new ControlRodMode();
  assert.deepEqual(mode.listStarterProfileIds(), ["conservative", "balanced", "velocity"]);
});

test("JourneymanTrustEngine introduces no SessionBrief widening or hidden Block B behavior", () => {
  const ledger = new OperatorTrustLedger();
  const engine = new JourneymanTrustEngine({ trustLedger: ledger });

  const sessionBriefMethods = Object.getOwnPropertyNames(SessionBrief.prototype).sort();
  assert.deepEqual(sessionBriefMethods, [
    "constructor",
    "createBrief",
    "evaluateSessionStartReadiness",
    "getBrief",
    "listBriefs",
  ]);

  assert.equal(typeof engine.setJourneymanLevel, "undefined");
  assert.equal(typeof engine.evaluateWarranty, "undefined");
  assert.equal(typeof engine.evaluateScarcitySignal, "undefined");
  assert.equal(typeof engine.evaluateSkills, "undefined");
  assert.equal(typeof engine.evaluateSkins, "undefined");
  assert.equal(typeof engine.publishPackage, "undefined");
});
