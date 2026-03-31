"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  OperatorTrustLedger,
  TRUST_LEVELS,
  DECISION_TYPES,
  OVERRIDE_OUTCOMES,
} = require("../../src/OperatorTrustLedger");

const T0 = "2026-03-31T10:00:00Z";
const T1 = "2026-03-31T10:05:00Z";
const T2 = "2026-03-31T10:10:00Z";
const T3 = "2026-03-31T10:15:00Z";

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

test("OperatorTrustLedger initializes new operators deterministically at APPRENTICE", () => {
  const ledger = new OperatorTrustLedger();
  const state = ledger.initializeOperator({
    operatorKey: "operator_alpha",
    initializedAt: T0,
  });

  assert.deepEqual([...TRUST_LEVELS], ["APPRENTICE", "JOURNEYMAN", "FOREMAN"]);
  assert.deepEqual([...DECISION_TYPES], ["PROMOTION", "HOLD", "REGRESSION"]);
  assert.deepEqual([...OVERRIDE_OUTCOMES], ["APPROVED", "DENIED", "EXPIRED"]);
  assert.equal(state.operatorKey, "operator_alpha");
  assert.equal(state.currentLevel, "APPRENTICE");
  assert.equal(state.levelTransitions.length, 0);
  assert.equal(state.approvedRodAdjustments.length, 0);
  assert.equal(state.overrideOutcomes.length, 0);
  assert.equal(state.decisionHistory.length, 0);
});

test("OperatorTrustLedger persists level transitions and decision history with adjacency constraints", () => {
  const ledger = new OperatorTrustLedger();
  ledger.initializeOperator({ operatorKey: "operator_bravo", initializedAt: T0 });

  ledger.recordDecisionOutcome({
    operatorKey: "operator_bravo",
    decisionId: "decision_001",
    decisionType: "PROMOTION",
    targetLevel: "JOURNEYMAN",
    decidedAt: T1,
    reasonCodes: ["PROMOTION_SIGNAL_TRUE"],
    forensicReferenceIds: ["forensic_entry_001"],
  });

  ledger.recordDecisionOutcome({
    operatorKey: "operator_bravo",
    decisionId: "decision_002",
    decisionType: "HOLD",
    targetLevel: "JOURNEYMAN",
    decidedAt: T2,
    reasonCodes: ["NO_CHANGE_SIGNAL"],
    forensicReferenceIds: ["forensic_entry_002"],
  });

  const finalState = ledger.recordDecisionOutcome({
    operatorKey: "operator_bravo",
    decisionId: "decision_003",
    decisionType: "REGRESSION",
    targetLevel: "APPRENTICE",
    decidedAt: T3,
    reasonCodes: ["REGRESSION_SIGNAL_TRUE"],
    forensicReferenceIds: ["forensic_entry_003"],
  });

  assert.equal(finalState.currentLevel, "APPRENTICE");
  assert.equal(finalState.decisionHistory.length, 3);
  assert.equal(finalState.levelTransitions.length, 2);
  assert.deepEqual(
    finalState.levelTransitions.map((entry) => `${entry.fromLevel}->${entry.toLevel}`),
    ["APPRENTICE->JOURNEYMAN", "JOURNEYMAN->APPRENTICE"]
  );

  expectValidationError(
    () =>
      ledger.recordDecisionOutcome({
        operatorKey: "operator_bravo",
        decisionId: "decision_invalid",
        decisionType: "PROMOTION",
        targetLevel: "FOREMAN",
        decidedAt: T3,
        reasonCodes: ["SKIP_LEVEL"],
        forensicReferenceIds: ["forensic_entry_004"],
      }),
    "INVALID_DECISION",
    "PROMOTION decisions must move exactly one level up"
  );
});

test("OperatorTrustLedger persists approved rod adjustments with explicit forensic references", () => {
  const ledger = new OperatorTrustLedger();

  const state = ledger.recordApprovedRodAdjustment({
    operatorKey: "operator_charlie",
    adjustmentId: "rod_adj_001",
    fromAutonomyLevel: "SUPERVISED",
    toAutonomyLevel: "HARD_STOP",
    approvedBy: "architect",
    approvedAt: T1,
    reason: "Escalate posture after repeated trust regression.",
    forensicReferenceIds: ["forensic_entry_rod_001", "forensic_entry_rod_001"],
  });

  assert.equal(state.approvedRodAdjustments.length, 1);
  assert.equal(state.approvedRodAdjustments[0].adjustmentId, "rod_adj_001");
  assert.equal(state.approvedRodAdjustments[0].fromAutonomyLevel, "SUPERVISED");
  assert.equal(state.approvedRodAdjustments[0].toAutonomyLevel, "HARD_STOP");
  assert.deepEqual(state.approvedRodAdjustments[0].forensicReferenceIds, ["forensic_entry_rod_001"]);
});

test("OperatorTrustLedger persists override outcomes with explicit forensic references", () => {
  const ledger = new OperatorTrustLedger();

  const state = ledger.recordOverrideOutcome({
    operatorKey: "operator_delta",
    overrideId: "override_001",
    outcome: "APPROVED",
    resolvedBy: "architect",
    resolvedAt: T2,
    reason: "Override accepted for bounded scope.",
    forensicReferenceIds: ["forensic_entry_override_001"],
  });

  assert.equal(state.overrideOutcomes.length, 1);
  assert.equal(state.overrideOutcomes[0].overrideId, "override_001");
  assert.equal(state.overrideOutcomes[0].outcome, "APPROVED");
  assert.deepEqual(state.overrideOutcomes[0].forensicReferenceIds, ["forensic_entry_override_001"]);
});

test("OperatorTrustLedger exposes no score, badge, rank, or leaderboard fields", () => {
  const ledger = new OperatorTrustLedger();

  const state = ledger.recordDecisionOutcome({
    operatorKey: "operator_echo",
    decisionId: "decision_100",
    decisionType: "HOLD",
    targetLevel: "APPRENTICE",
    decidedAt: T1,
    reasonCodes: ["BASELINE"],
    forensicReferenceIds: ["forensic_entry_100"],
  });

  const forbiddenFields = [
    "score",
    "points",
    "badges",
    "rank",
    "leaderboard",
    "engagementState",
    "usageAnalytics",
  ];

  for (const field of forbiddenFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(state, field), false);
  }

  assert.equal(typeof ledger.recordScore, "undefined");
  assert.equal(typeof ledger.recordBadge, "undefined");
  assert.equal(typeof ledger.rankOperator, "undefined");
});
