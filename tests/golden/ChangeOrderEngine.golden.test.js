"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ChangeOrderEngine,
  CHANGE_ORDER_STATUSES,
} = require("../../src/ChangeOrderEngine");

const T0 = "2026-03-30T22:00:00Z";
const T1 = "2026-03-30T22:05:00Z";

function buildDriftPayload(overrides = {}) {
  return {
    changeOrderId: "co_001",
    sessionId: "wave4_s01",
    calloutType: "DRIFT",
    calloutRef: "callout_drift_001",
    summary: "Unplanned schema touch detected in active session.",
    requestedChange: "Allow bounded schema update for current migration.",
    scopeBoundary: "database_schema domain only",
    impactStatement: "Schema drift requires explicit governed decision.",
    sourceRefs: ["session_brief:wave4_s01", "callout:callout_drift_001"],
    evidenceRefs: ["chain:entry_200", "receipt:wave4_s01"],
    createdBy: "ai",
    createdAt: T0,
    ...overrides,
  };
}

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

test("ChangeOrderEngine locks exactly three statuses", () => {
  assert.deepEqual([...CHANGE_ORDER_STATUSES], ["APPROVED", "REJECTED", "DEFERRED"]);
});

test("ChangeOrderEngine generates a formal change order from DRIFT payload", () => {
  const engine = new ChangeOrderEngine();
  const created = engine.createFromDrift(buildDriftPayload());

  assert.equal(created.changeOrder.changeOrderId, "co_001");
  assert.equal(created.changeOrder.calloutType, "DRIFT");
  assert.equal(created.changeOrder.status, "DEFERRED");
  assert.equal(created.executionOutcome.workMayContinue, false);
  assert.equal(created.executionOutcome.driftPathState, "DEFERRED_PAUSE");
  assert.equal(created.executionOutcome.autoRevert, false);
  assert.equal(
    created.executionOutcome.continuityPromotion.entryType,
    "operator_deferred_decision"
  );
});

test("ChangeOrderEngine APPROVED path allows continuation with no auto-revert", () => {
  const engine = new ChangeOrderEngine();
  engine.createFromDrift(buildDriftPayload());

  const decided = engine.decide("co_001", {
    status: "APPROVED",
    decisionReason: "Architect approved bounded change.",
    decisionBy: "architect",
    decidedAt: T1,
  });

  assert.equal(decided.changeOrder.status, "APPROVED");
  assert.equal(decided.executionOutcome.workMayContinue, true);
  assert.equal(decided.executionOutcome.driftPathState, "APPROVED_CONTINUE");
  assert.equal(decided.executionOutcome.autoRevert, false);
  assert.equal(decided.executionOutcome.continuityPromotion, null);
});

test("ChangeOrderEngine REJECTED path halts drifted path with no auto-revert", () => {
  const engine = new ChangeOrderEngine();
  engine.createFromDrift(buildDriftPayload());

  const decided = engine.decide("co_001", {
    status: "REJECTED",
    decisionReason: "Requested drift exceeds approved boundary.",
    decisionBy: "architect",
    decidedAt: T1,
  });

  assert.equal(decided.changeOrder.status, "REJECTED");
  assert.equal(decided.executionOutcome.workMayContinue, false);
  assert.equal(decided.executionOutcome.driftPathState, "REJECTED_HALT");
  assert.equal(decided.executionOutcome.autoRevert, false);
  assert.equal(decided.executionOutcome.continuityPromotion, null);
});

test("ChangeOrderEngine DEFERRED path pauses and maps into continuity", () => {
  const engine = new ChangeOrderEngine();
  engine.createFromDrift(buildDriftPayload());

  const decided = engine.decide("co_001", {
    status: "DEFERRED",
    decisionReason: "Need additional domain review before proceeding.",
    decisionBy: "architect",
    decidedAt: T1,
  });

  assert.equal(decided.changeOrder.status, "DEFERRED");
  assert.equal(decided.executionOutcome.workMayContinue, false);
  assert.equal(decided.executionOutcome.driftPathState, "DEFERRED_PAUSE");
  assert.equal(decided.executionOutcome.autoRevert, false);
  assert.ok(decided.executionOutcome.continuityPromotion);

  const continuity = decided.executionOutcome.continuityPromotion;
  assert.equal(continuity.entryType, "operator_deferred_decision");
  assert.equal(continuity.originSessionId, "wave4_s01");
  assert.equal(continuity.lastSeenSessionId, "wave4_s01");
  assert.equal(continuity.sourceRefs.includes("change_order:co_001"), true);
});

test("ChangeOrderEngine rejects non-DRIFT payloads deterministically", () => {
  const engine = new ChangeOrderEngine();

  expectValidationError(
    () =>
      engine.createFromDrift(
        buildDriftPayload({
          calloutType: "VIOLATION",
        })
      ),
    "INVALID_FIELD",
    "Change orders can only be generated from DRIFT callouts"
  );
});

test("ChangeOrderEngine rejects invalid decision status deterministically", () => {
  const engine = new ChangeOrderEngine();
  engine.createFromDrift(buildDriftPayload());

  expectValidationError(
    () =>
      engine.decide("co_001", {
        status: "PENDING",
        decisionReason: "Not a shipped status.",
        decisionBy: "architect",
        decidedAt: T1,
      }),
    "INVALID_FIELD",
    "'status' must be one of: APPROVED, REJECTED, DEFERRED"
  );
});

test("Negative control: no board redesign fields and no persistence/write theater", () => {
  const engine = new ChangeOrderEngine();
  const created = engine.createFromDrift(buildDriftPayload());

  const forbiddenFields = [
    "score",
    "confidence",
    "rank",
    "priority",
    "anomaly",
    "prediction",
    "boardGroup",
    "boardColumn",
  ];

  for (const field of forbiddenFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(created.changeOrder, field), false);
  }

  const methodNames = Object.getOwnPropertyNames(ChangeOrderEngine.prototype).sort();
  assert.deepEqual(methodNames, [
    "constructor",
    "createFromDrift",
    "decide",
    "getChangeOrder",
    "listChangeOrders",
  ]);
  assert.equal(typeof engine.autoApprove, "undefined");
  assert.equal(typeof engine.autoRevert, "undefined");
  assert.equal(typeof engine.persistBoard, "undefined");
});
