"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { StandingRiskEngine } = require("../../src/StandingRiskEngine");

function buildEntry(overrides = {}) {
  return {
    entryId: "continuity_hold_001",
    entryType: "hold",
    summary: "Unresolved protected change risk.",
    originSessionId: "wave2_s01",
    lastSeenSessionId: "wave2_s02",
    sessionCount: 2,
    carryCount: 1,
    operatorOutcome: undefined,
    ...overrides,
  };
}

function buildSignal(overrides = {}) {
  return {
    entryId: "continuity_hold_001",
    relevantWorkContinued: true,
    blastRadiusStillExists: true,
    evidenceRefs: ["receipt_wave2_s02", "scope_eval_wave2_s02"],
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

test("StandingRiskEngine derives OPEN -> CARRIED on first qualifying later continuation", () => {
  const engine = new StandingRiskEngine();

  const derived = engine.deriveStandingRisk([buildEntry()], {
    evaluationSessionId: "wave2_s02",
    continuationSignals: [buildSignal()],
  });

  assert.equal(derived.length, 1);
  assert.equal(derived[0].state, "CARRIED");
  assert.equal(derived[0].triadSatisfied, true);
});

test("StandingRiskEngine derives CARRIED -> STANDING on second qualifying continuation", () => {
  const engine = new StandingRiskEngine();

  const derived = engine.deriveStandingRisk(
    [buildEntry({ entryId: "continuity_hold_002", carryCount: 2, lastSeenSessionId: "wave2_s03", sessionCount: 3 })],
    {
      evaluationSessionId: "wave2_s03",
      continuationSignals: [
        buildSignal({
          entryId: "continuity_hold_002",
          evidenceRefs: ["receipt_wave2_s03"],
        }),
      ],
    }
  );

  assert.equal(derived[0].state, "STANDING");
  assert.equal(derived[0].triadSatisfied, true);
});

test("StandingRiskEngine does not promote without escalation triad", () => {
  const engine = new StandingRiskEngine();

  const missingBlast = engine.deriveStandingRisk([buildEntry()], {
    evaluationSessionId: "wave2_s02",
    continuationSignals: [buildSignal({ blastRadiusStillExists: false })],
  });

  const missingRelevance = engine.deriveStandingRisk([buildEntry()], {
    evaluationSessionId: "wave2_s02",
    continuationSignals: [buildSignal({ relevantWorkContinued: false })],
  });

  assert.equal(missingBlast[0].state, "OPEN");
  assert.equal(missingBlast[0].triadSatisfied, false);
  assert.equal(missingRelevance[0].state, "OPEN");
  assert.equal(missingRelevance[0].triadSatisfied, false);
});

test("Negative control: time passing alone does not escalate", () => {
  const engine = new StandingRiskEngine();

  const derived = engine.deriveStandingRisk(
    [buildEntry({ carryCount: 2, sessionCount: 5, lastSeenSessionId: "wave2_s09" })],
    {
      evaluationSessionId: "wave2_s09",
      continuationSignals: [],
    }
  );

  assert.equal(derived[0].state, "OPEN");
  assert.equal(derived[0].triadSatisfied, false);
});

test("Negative control: unrelated later sessions do not escalate continuity items", () => {
  const engine = new StandingRiskEngine();

  const derived = engine.deriveStandingRisk([buildEntry({ lastSeenSessionId: "wave2_s04", carryCount: 2 })], {
    evaluationSessionId: "wave2_s99",
    continuationSignals: [buildSignal()],
  });

  assert.equal(derived[0].state, "OPEN");
  assert.equal(derived[0].triadSatisfied, false);
});

test("Negative control: dismissed items do not keep escalating", () => {
  const engine = new StandingRiskEngine();

  const derived = engine.deriveStandingRisk(
    [buildEntry({ entryId: "continuity_hold_003", operatorOutcome: "dismiss", carryCount: 2 })],
    {
      evaluationSessionId: "wave2_s03",
      continuationSignals: [buildSignal({ entryId: "continuity_hold_003" })],
    }
  );

  assert.equal(derived[0].state, "DISMISSED");
  assert.equal(derived[0].triadSatisfied, false);
});

test("Negative control: explicitly accepted items do not keep escalating unless reintroduced by new evidence", () => {
  const engine = new StandingRiskEngine();

  const accepted = engine.deriveStandingRisk(
    [buildEntry({ entryId: "continuity_hold_004", operatorOutcome: "explicitly_accept", carryCount: 3 })],
    {
      evaluationSessionId: "wave2_s04",
      continuationSignals: [buildSignal({ entryId: "continuity_hold_004" })],
    }
  );

  const reintroduced = engine.deriveStandingRisk(
    [buildEntry({ entryId: "continuity_hold_005", operatorOutcome: undefined, carryCount: 1 })],
    {
      evaluationSessionId: "wave2_s02",
      continuationSignals: [buildSignal({ entryId: "continuity_hold_005" })],
    }
  );

  assert.equal(accepted[0].state, "EXPLICITLY_ACCEPTED");
  assert.equal(reintroduced[0].state, "CARRIED");
});

test("Negative control: non-blocked_operation entries without explicit continuation evidence remain OPEN", () => {
  const engine = new StandingRiskEngine();

  const derived = engine.deriveStandingRisk(
    [buildEntry({ entryId: "continuity_decision_001", entryType: "operator_deferred_decision", carryCount: 2 })],
    {
      evaluationSessionId: "wave2_s02",
      continuationSignals: [],
    }
  );

  assert.equal(derived[0].state, "OPEN");
  assert.equal(derived[0].triadSatisfied, false);
});

test("StandingRiskEngine validates continuationSignals contract deterministically", () => {
  const engine = new StandingRiskEngine();

  expectValidationError(
    () =>
      engine.deriveStandingRisk([buildEntry()], {
        evaluationSessionId: "wave2_s02",
        continuationSignals: [
          {
            entryId: "continuity_hold_001",
            relevantWorkContinued: true,
            blastRadiusStillExists: true,
            evidenceRefs: [],
          },
        ],
      }),
    "INVALID_FIELD",
    "'evidenceRefs' must be a non-empty array of strings"
  );

  expectValidationError(
    () =>
      engine.deriveStandingRisk([buildEntry()], {
        evaluationSessionId: "wave2_s02",
        continuationSignals: [
          {
            entryId: "continuity_hold_001",
            relevantWorkContinued: true,
            blastRadiusStillExists: true,
            evidenceRefs: [],
          },
        ],
      }),
    "INVALID_FIELD",
    "'evidenceRefs' must be a non-empty array of strings"
  );
});
