"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { SafetyInterlocks } = require("../../src/SafetyInterlocks");

const CREATED_AT = "2026-03-29T13:00:00Z";

function buildInterlock(overrides = {}) {
  return {
    interlockId: "interlock_wave1_001",
    actionCategory: "protected_surface_change",
    defaultOutcome: "require_authorization",
    requiresExplicitAuthorization: true,
    protectedTargets: ["README.md", "CLAUDE.md"],
    operatorPrompt: "This change touches protected canon surfaces.",
    rationale: "Front-door truth surfaces require explicit operator control.",
    evidence: [
      "CLAUDE.md marks stale front-door truth as a ship blocker.",
      "Sync doctrine requires same-wave update discipline.",
    ],
    createdBy: "architect",
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

test("SafetyInterlocks.createInterlock stores a valid interlock", () => {
  const interlocks = new SafetyInterlocks();
  const interlock = interlocks.createInterlock(buildInterlock());

  assert.equal(interlock.interlockId, "interlock_wave1_001");
  assert.equal(interlock.defaultOutcome, "require_authorization");
});

test("SafetyInterlocks deterministic validation for invalid protected_surface_change outcome", () => {
  const interlocks = new SafetyInterlocks();

  expectValidationError(
    () =>
      interlocks.createInterlock(
        buildInterlock({
          defaultOutcome: "allow_with_receipt",
          requiresExplicitAuthorization: false,
        })
      ),
    "INVALID_INTERLOCK_RULE",
    "'protected_surface_change' interlocks must default to 'require_authorization' or 'stop'"
  );

  expectValidationError(
    () =>
      interlocks.createInterlock(
        buildInterlock({
          defaultOutcome: "allow_with_receipt",
          requiresExplicitAuthorization: false,
        })
      ),
    "INVALID_INTERLOCK_RULE",
    "'protected_surface_change' interlocks must default to 'require_authorization' or 'stop'"
  );
});

test("SafetyInterlocks blocks destructive action when defaultOutcome is stop", () => {
  const interlocks = new SafetyInterlocks();
  interlocks.createInterlock(
    buildInterlock({
      interlockId: "interlock_destructive",
      actionCategory: "destructive_change",
      defaultOutcome: "stop",
      requiresExplicitAuthorization: false,
    })
  );

  const result = interlocks.evaluateAction("interlock_destructive", {
    actionCategory: "destructive_change",
    targets: ["src/HoldEngine.js"],
  });

  assert.equal(result.triggered, true);
  assert.equal(result.decision, "stop");
  assert.equal(result.mayProceed, false);
});

test("SafetyInterlocks gates protected surface work until explicit authorization", () => {
  const interlocks = new SafetyInterlocks();
  interlocks.createInterlock(buildInterlock());

  const blocked = interlocks.evaluateAction("interlock_wave1_001", {
    actionCategory: "protected_surface_change",
    targets: ["README.md"],
    operatorAuthorized: false,
  });

  assert.equal(blocked.decision, "require_authorization");
  assert.equal(blocked.mayProceed, false);
  assert.equal(blocked.requiresAuthorization, true);

  const authorized = interlocks.evaluateAction("interlock_wave1_001", {
    actionCategory: "protected_surface_change",
    targets: ["README.md"],
    operatorAuthorized: true,
  });

  assert.equal(authorized.decision, "require_authorization");
  assert.equal(authorized.mayProceed, true);
});

test("SafetyInterlocks applies when protected target is hit and names target in prompt", () => {
  const interlocks = new SafetyInterlocks();
  interlocks.createInterlock(buildInterlock());

  const result = interlocks.evaluateAction("interlock_wave1_001", {
    actionCategory: "external_side_effect",
    targets: ["README.md"],
    operatorAuthorized: false,
  });

  assert.equal(result.triggered, true);
  assert.deepEqual(result.protectedTargetHits, ["README.md"]);
  assert.match(result.operatorPrompt, /Protected target\(s\): README\.md\./);
});

test("SafetyInterlocks does not silently weaken active constraint blocks", () => {
  const interlocks = new SafetyInterlocks();
  interlocks.createInterlock(
    buildInterlock({
      interlockId: "interlock_external",
      actionCategory: "external_side_effect",
      defaultOutcome: "allow_with_receipt",
      requiresExplicitAuthorization: false,
    })
  );

  const result = interlocks.evaluateAction("interlock_external", {
    actionCategory: "external_side_effect",
    targets: ["docs/INDEX.md"],
    activeConstraintBlock: true,
  });

  assert.equal(result.triggered, true);
  assert.equal(result.decision, "stop");
  assert.equal(result.mayProceed, false);
});

test("SafetyInterlocks rejects requiresExplicitAuthorization=true with allow_with_receipt", () => {
  const interlocks = new SafetyInterlocks();

  expectValidationError(
    () =>
      interlocks.createInterlock(
        buildInterlock({
          interlockId: "interlock_invalid_auth",
          actionCategory: "external_side_effect",
          defaultOutcome: "allow_with_receipt",
          requiresExplicitAuthorization: true,
        })
      ),
    "INVALID_INTERLOCK_RULE",
    "requiresExplicitAuthorization=true must align with defaultOutcome 'require_authorization' or 'stop'"
  );
});
