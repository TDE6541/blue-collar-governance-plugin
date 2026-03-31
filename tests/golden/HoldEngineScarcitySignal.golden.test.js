"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  HoldEngineScarcitySignal,
  SCARCITY_STATES,
} = require("../../src/HoldEngineScarcitySignal");

const T0 = "2026-04-01T10:00:00Z";

function buildHoldSnapshot(overrides = {}) {
  return {
    holdId: "hold_wave5_c_001",
    status: "proposed",
    blocking: true,
    reason: "Need explicit review",
    evidence: ["evidence_ref_001"],
    options: ["request architect signoff", "narrow scope"],
    createdAt: "2026-04-01T09:00:00Z",
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

test("HoldEngineScarcitySignal derives WATCH for proposed blocking hold", () => {
  const signal = new HoldEngineScarcitySignal();

  const report = signal.deriveScarcitySignal([buildHoldSnapshot()], {
    evaluatedAt: T0,
  });

  assert.deepEqual([...SCARCITY_STATES], ["CLEAR", "WATCH", "TIGHT", "CRITICAL"]);
  assert.equal(report.overallScarcityState, "WATCH");
  assert.equal(report.holdCount, 1);
  assert.equal(report.stateCounts.WATCH, 1);
  assert.equal(report.assessments[0].scarcityState, "WATCH");
});

test("HoldEngineScarcitySignal derives TIGHT for active blocking hold with multiple options", () => {
  const signal = new HoldEngineScarcitySignal();

  const report = signal.deriveScarcitySignal(
    [
      buildHoldSnapshot({
        status: "active",
        blocking: true,
        options: ["path_one", "path_two"],
      }),
    ],
    { evaluatedAt: T0 }
  );

  assert.equal(report.overallScarcityState, "TIGHT");
  assert.equal(report.activeHoldCount, 1);
  assert.equal(report.blockingActiveHoldCount, 1);
  assert.equal(report.stateCounts.TIGHT, 1);
});

test("HoldEngineScarcitySignal derives CRITICAL for active blocking hold with scarce options", () => {
  const signal = new HoldEngineScarcitySignal();

  const report = signal.deriveScarcitySignal(
    [
      buildHoldSnapshot({
        status: "active",
        blocking: true,
        options: ["single_path"],
        evidence: ["evidence_ref_critical_001", "evidence_ref_critical_002"],
      }),
    ],
    { evaluatedAt: T0 }
  );

  assert.equal(report.overallScarcityState, "CRITICAL");
  assert.equal(report.stateCounts.CRITICAL, 1);
  assert.equal(report.assessments[0].scarcityState, "CRITICAL");
  assert.equal(report.assessments[0].hasEscalationSignal, true);
});

test("HoldEngineScarcitySignal derives CLEAR for terminal hold statuses", () => {
  const signal = new HoldEngineScarcitySignal();

  const report = signal.deriveScarcitySignal(
    [
      buildHoldSnapshot({ status: "resolved", blocking: false, options: ["n/a"] }),
      buildHoldSnapshot({ holdId: "hold_wave5_c_002", status: "dismissed", blocking: false, options: ["n/a"] }),
    ],
    { evaluatedAt: T0 }
  );

  assert.equal(report.overallScarcityState, "CLEAR");
  assert.equal(report.stateCounts.CLEAR, 2);
});

test("HoldEngineScarcitySignal computes aggregate highest severity deterministically", () => {
  const signal = new HoldEngineScarcitySignal();

  const report = signal.deriveScarcitySignal(
    [
      buildHoldSnapshot({ holdId: "hold_a", status: "proposed", blocking: true, options: ["path_one", "path_two"] }),
      buildHoldSnapshot({ holdId: "hold_b", status: "active", blocking: true, options: ["path_one", "path_two"] }),
      buildHoldSnapshot({ holdId: "hold_c", status: "active", blocking: true, options: ["single_path"] }),
    ],
    { evaluatedAt: T0 }
  );

  assert.equal(report.overallScarcityState, "CRITICAL");
  assert.equal(report.stateCounts.WATCH, 1);
  assert.equal(report.stateCounts.TIGHT, 1);
  assert.equal(report.stateCounts.CRITICAL, 1);
  assert.equal(report.holdCount, 3);
});

test("HoldEngineScarcitySignal validates hold snapshot contract deterministically", () => {
  const signal = new HoldEngineScarcitySignal();

  expectValidationError(
    () =>
      signal.deriveScarcitySignal(
        [
          buildHoldSnapshot({
            status: "paused",
          }),
        ],
        { evaluatedAt: T0 }
      ),
    "INVALID_FIELD",
    "'status' must be one of: proposed, active, accepted, resolved, dismissed"
  );

  expectValidationError(
    () =>
      signal.deriveScarcitySignal([buildHoldSnapshot()], {
        evaluatedAt: "not-a-timestamp",
      }),
    "INVALID_FIELD",
    "'evaluatedAt' must be an ISO 8601 timestamp"
  );
});

test("HoldEngineScarcitySignal exposes no persistence or gamification surfaces", () => {
  const signal = new HoldEngineScarcitySignal();

  const report = signal.deriveScarcitySignal([buildHoldSnapshot()], {
    evaluatedAt: T0,
  });

  const forbiddenFields = [
    "score",
    "points",
    "badge",
    "badges",
    "rank",
    "leaderboard",
    "engagementState",
    "usageAnalytics",
  ];

  for (const field of forbiddenFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(report, field), false);
    assert.equal(Object.prototype.hasOwnProperty.call(report.assessments[0], field), false);
  }

  assert.equal(typeof signal.persistScarcitySignal, "undefined");
  assert.equal(typeof signal.saveScarcityState, "undefined");
  assert.equal(typeof signal.createScarcityLedger, "undefined");
});
