"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { ScopeGuard } = require("../../src/ScopeGuard");

const CREATED_AT = "2026-03-29T13:10:00Z";

function buildEvaluation(overrides = {}) {
  return {
    evaluationId: "scope_wave1_001",
    requestedWork: [
      "Implement SafetyInterlocks runtime.",
      "Add SafetyInterlocks golden tests.",
    ],
    observedWork: [
      "Implement SafetyInterlocks runtime.",
      "Add SafetyInterlocks golden tests.",
      "Touched an unapproved file.",
    ],
    decision: "reject",
    decisionReason: "Observed unauthorized work must be resolved before ship.",
    requiresOperatorAction: true,
    evidence: [
      "Approved wave names only Block B runtime/test files.",
      "Observed work includes extra item not in requested scope.",
    ],
    createdBy: "ai",
    createdAt: CREATED_AT,
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

test("ScopeGuard.createEvaluation computes matched, unauthorized, and missing work", () => {
  const guard = new ScopeGuard();
  const evaluation = guard.createEvaluation(buildEvaluation());

  assert.deepEqual(evaluation.matchedWork, [
    "Implement SafetyInterlocks runtime.",
    "Add SafetyInterlocks golden tests.",
  ]);
  assert.deepEqual(evaluation.unauthorizedWork, ["Touched an unapproved file."]);
  assert.deepEqual(evaluation.missingWork, []);
});

test("ScopeGuard rejects approve when unauthorized work exists", () => {
  const guard = new ScopeGuard();

  expectValidationError(
    () =>
      guard.createEvaluation(
        buildEvaluation({
          decision: "approve",
          requiresOperatorAction: false,
        })
      ),
    "INVALID_SCOPE_DECISION",
    "'approve' cannot be used when unauthorizedWork is not empty"
  );
});

test("ScopeGuard enforces extend requires operator action", () => {
  const guard = new ScopeGuard();

  expectValidationError(
    () =>
      guard.createEvaluation(
        buildEvaluation({
          decision: "extend",
          requiresOperatorAction: false,
        })
      ),
    "INVALID_SCOPE_DECISION",
    "'extend' requires requiresOperatorAction=true"
  );
});

test("ScopeGuard approvedExtensions can convert previously unauthorized work into approved scope", () => {
  const guard = new ScopeGuard();

  const evaluation = guard.createEvaluation(
    buildEvaluation({
      decision: "extend",
      decisionReason: "Operator approved one explicit scope extension.",
      approvedExtensions: ["Touched an unapproved file."],
      requiresOperatorAction: true,
    })
  );

  assert.deepEqual(evaluation.unauthorizedWork, []);
  assert.deepEqual(evaluation.approvedExtensions, ["Touched an unapproved file."]);
});

test("ScopeGuard deterministic validation message for malformed requestedWork", () => {
  const guard = new ScopeGuard();

  expectValidationError(
    () =>
      guard.createEvaluation(
        buildEvaluation({
          requestedWork: "Implement SafetyInterlocks runtime.",
        })
      ),
    "INVALID_FIELD",
    "'requestedWork' must be an array of strings"
  );

  expectValidationError(
    () =>
      guard.createEvaluation(
        buildEvaluation({
          requestedWork: "Implement SafetyInterlocks runtime.",
        })
      ),
    "INVALID_FIELD",
    "'requestedWork' must be an array of strings"
  );
});

test("ScopeGuard keeps requested, observed, and approved extension distinctions visible", () => {
  const guard = new ScopeGuard();

  const evaluation = guard.createEvaluation(
    buildEvaluation({
      evaluationId: "scope_wave1_002",
      observedWork: [
        "Implement SafetyInterlocks runtime.",
        "Add SafetyInterlocks golden tests.",
        "Add ScopeGuard golden tests.",
      ],
      approvedExtensions: ["Add ScopeGuard golden tests."],
      decision: "extend",
      decisionReason: "Operator approved one additional Block B task.",
      requiresOperatorAction: true,
    })
  );

  assert.deepEqual(evaluation.requestedWork, [
    "Implement SafetyInterlocks runtime.",
    "Add SafetyInterlocks golden tests.",
  ]);
  assert.deepEqual(evaluation.observedWork, [
    "Implement SafetyInterlocks runtime.",
    "Add SafetyInterlocks golden tests.",
    "Add ScopeGuard golden tests.",
  ]);
  assert.deepEqual(evaluation.approvedExtensions, ["Add ScopeGuard golden tests."]);
  assert.deepEqual(evaluation.unauthorizedWork, []);
});
