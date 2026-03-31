"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { WarrantyMonitor, WARRANTY_STATES } = require("../../src/WarrantyMonitor");

const T0 = "2026-04-01T09:00:00Z";

function buildTrustState(overrides = {}) {
  return {
    operatorKey: "operator_alpha",
    currentLevel: "JOURNEYMAN",
    decisionHistory: [
      {
        decisionType: "PROMOTION",
        forensicReferenceIds: ["forensic_promote_001"],
      },
    ],
    ...overrides,
  };
}

function buildSignal(overrides = {}) {
  return {
    operatorKey: "operator_alpha",
    degradationObserved: false,
    outOfBandChangeDetected: false,
    coverageExpired: false,
    evidenceRefs: [],
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

test("WarrantyMonitor derives HEALTHY when no warning signals exist", () => {
  const monitor = new WarrantyMonitor();

  const views = monitor.deriveWarrantyViews([buildTrustState()], {
    evaluatedAt: T0,
    warrantySignals: [buildSignal()],
  });

  assert.deepEqual([...WARRANTY_STATES], ["HEALTHY", "WATCH", "DEGRADED", "EXPIRED"]);
  assert.equal(views.length, 1);
  assert.equal(views[0].warrantyState, "HEALTHY");
  assert.equal(views[0].evidenceRefs.length, 0);
});

test("WarrantyMonitor derives WATCH from recent trust regression with forensic evidence", () => {
  const monitor = new WarrantyMonitor();

  const views = monitor.deriveWarrantyViews(
    [
      buildTrustState({
        decisionHistory: [
          {
            decisionType: "REGRESSION",
            forensicReferenceIds: ["forensic_regression_001"],
          },
        ],
      }),
    ],
    {
      evaluatedAt: T0,
      warrantySignals: [],
    }
  );

  assert.equal(views[0].warrantyState, "WATCH");
  assert.equal(views[0].hasRecentRegression, true);
  assert.deepEqual(views[0].evidenceRefs, ["forensic_regression_001"]);
});

test("WarrantyMonitor derives DEGRADED when degradation and out-of-band or regression signals align", () => {
  const monitor = new WarrantyMonitor();

  const views = monitor.deriveWarrantyViews(
    [
      buildTrustState({
        decisionHistory: [
          {
            decisionType: "REGRESSION",
            forensicReferenceIds: ["forensic_regression_002"],
          },
        ],
      }),
    ],
    {
      evaluatedAt: T0,
      warrantySignals: [
        buildSignal({
          degradationObserved: true,
          outOfBandChangeDetected: true,
          evidenceRefs: ["forensic_signal_001"],
        }),
      ],
    }
  );

  assert.equal(views[0].warrantyState, "DEGRADED");
  assert.deepEqual(views[0].evidenceRefs, ["forensic_regression_002", "forensic_signal_001"]);
});

test("WarrantyMonitor derives EXPIRED when coverage-expired signal is true", () => {
  const monitor = new WarrantyMonitor();

  const views = monitor.deriveWarrantyViews([buildTrustState()], {
    evaluatedAt: T0,
    warrantySignals: [
      buildSignal({
        coverageExpired: true,
        evidenceRefs: ["forensic_expiry_001"],
      }),
    ],
  });

  assert.equal(views[0].warrantyState, "EXPIRED");
  assert.equal(views[0].coverageExpired, true);
  assert.deepEqual(views[0].evidenceRefs, ["forensic_expiry_001"]);
});

test("WarrantyMonitor enforces evidence refs when any warranty signal is true", () => {
  const monitor = new WarrantyMonitor();

  expectValidationError(
    () =>
      monitor.deriveWarrantyViews([buildTrustState()], {
        evaluatedAt: T0,
        warrantySignals: [
          buildSignal({
            degradationObserved: true,
            evidenceRefs: [],
          }),
        ],
      }),
    "INVALID_FIELD",
    "'evidenceRefs' must be a non-empty array of strings when any warranty signal is true"
  );
});

test("WarrantyMonitor emits no persistence or gamification surfaces", () => {
  const monitor = new WarrantyMonitor();

  const views = monitor.deriveWarrantyViews([buildTrustState()], {
    evaluatedAt: T0,
    warrantySignals: [buildSignal()],
  });

  const forbiddenFields = [
    "score",
    "points",
    "badge",
    "rank",
    "leaderboard",
    "engagementState",
    "usageAnalytics",
  ];

  for (const field of forbiddenFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(views[0], field), false);
  }

  assert.equal(typeof monitor.createWarrantyLedger, "undefined");
  assert.equal(typeof monitor.persistWarranty, "undefined");
  assert.equal(typeof monitor.saveWarrantyState, "undefined");
  assert.equal(typeof monitor.evaluateScarcitySignal, "undefined");
});
