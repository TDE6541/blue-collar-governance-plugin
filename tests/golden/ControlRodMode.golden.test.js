"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ControlRodMode,
  AUTONOMY_LEVELS,
  STARTER_PROFILE_IDS,
  STARTER_DOMAIN_IDS,
  PERMIT_DECISIONS,
  LOTO_SCOPE_TYPES,
} = require("../../src/ControlRodMode");

const T0 = "2026-03-30T21:00:00Z";
const T1 = "2026-03-30T21:05:00Z";

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

function assertNormalizedProfile(profile, expectedProfileId) {
  assert.equal(profile.profileId, expectedProfileId);
  assert.equal(typeof profile.profileLabel, "string");
  assert.ok(profile.profileLabel.length > 0);
  assert.ok(Array.isArray(profile.domainRules));
  assert.equal(profile.domainRules.length, STARTER_DOMAIN_IDS.length);

  const domainIds = profile.domainRules.map((rule) => rule.domainId);
  assert.deepEqual(domainIds, [...STARTER_DOMAIN_IDS]);

  for (const domainRule of profile.domainRules) {
    assert.equal(typeof domainRule.label, "string");
    assert.ok(Array.isArray(domainRule.filePatterns));
    assert.ok(domainRule.filePatterns.length > 0);
    assert.ok(Array.isArray(domainRule.operationTypes));
    assert.ok(domainRule.operationTypes.length > 0);
    assert.ok(AUTONOMY_LEVELS.includes(domainRule.autonomyLevel));
    assert.equal(typeof domainRule.justification, "string");
    assert.ok(domainRule.justification.length > 0);
  }
}

function buildAuthorization(overrides = {}) {
  return {
    authorizationId: "loto_001",
    domainId: "pricing_quote_logic",
    authorizedBy: "architect",
    authorizedAt: T0,
    reason: "Revenue-impacting change needs explicit lockout authorization.",
    scope: {
      scopeType: "SESSION",
      sessionId: "wave4_s01",
    },
    conditions: ["operator-present"],
    chainRef: "chain_loto_001",
    ...overrides,
  };
}

function buildPermit(overrides = {}) {
  return {
    permitId: "permit_001",
    sessionId: "wave4_s01",
    requestedDomains: ["pricing_quote_logic"],
    scopeJustification: "Requested pricing adjustment for approved scope.",
    riskAssessment: "Medium risk with bounded blast radius.",
    rollbackPlan: "Revert pricing rule set to prior snapshot.",
    operatorDecision: "GRANTED",
    chainRef: "chain_permit_001",
    ...overrides,
  };
}

test("ControlRodMode v2 locks exactly three autonomy levels and permit decisions", () => {
  assert.deepEqual([...AUTONOMY_LEVELS], ["FULL_AUTO", "SUPERVISED", "HARD_STOP"]);
  assert.deepEqual([...STARTER_PROFILE_IDS], ["conservative", "balanced", "velocity"]);
  assert.deepEqual([...PERMIT_DECISIONS], ["GRANTED", "DENIED", "CONDITIONAL"]);
  assert.deepEqual([...LOTO_SCOPE_TYPES], ["SESSION", "EXPIRY"]);
});

test("ControlRodMode resolves conservative preset to deterministic normalized snapshot", () => {
  const mode = new ControlRodMode();
  const profile = mode.resolveProfile("conservative");

  assertNormalizedProfile(profile, "conservative");
  assert.equal(mode.listStarterProfileIds().includes("conservative"), true);
});

test("ControlRodMode resolves balanced preset to deterministic normalized snapshot", () => {
  const mode = new ControlRodMode();
  const profile = mode.resolveProfile("balanced");

  assertNormalizedProfile(profile, "balanced");
});

test("ControlRodMode resolves velocity preset to deterministic normalized snapshot", () => {
  const mode = new ControlRodMode();
  const profile = mode.resolveProfile("velocity");

  assertNormalizedProfile(profile, "velocity");
});

test("ControlRodMode accepts valid LOTO authorization", () => {
  const mode = new ControlRodMode();
  const authorization = mode.validateLotoAuthorization(buildAuthorization());

  assert.equal(authorization.authorizationId, "loto_001");
  assert.equal(authorization.domainId, "pricing_quote_logic");
  assert.equal(authorization.scope.scopeType, "SESSION");
  assert.equal(authorization.scope.sessionId, "wave4_s01");
});

test("ControlRodMode rejects malformed LOTO authorization deterministically", () => {
  const mode = new ControlRodMode();

  expectValidationError(
    () => mode.validateLotoAuthorization(buildAuthorization({ scope: undefined })),
    "INVALID_FIELD",
    "'scope' must be an object"
  );

  expectValidationError(
    () =>
      mode.validateLotoAuthorization(
        buildAuthorization({
          scope: { scopeType: "WINDOW", sessionId: "wave4_s01" },
        })
      ),
    "INVALID_FIELD",
    "'scope.scopeType' must be one of: SESSION, EXPIRY"
  );
});

test("ControlRodMode permit validation supports granted and conditional paths", () => {
  const mode = new ControlRodMode();

  const granted = mode.validatePermit(buildPermit({ operatorDecision: "GRANTED" }));
  assert.equal(granted.operatorDecision, "GRANTED");

  const conditional = mode.validatePermit(
    buildPermit({
      operatorDecision: "CONDITIONAL",
      conditions: ["dry-run-first", "operator-confirm-before-apply"],
    })
  );
  assert.equal(conditional.operatorDecision, "CONDITIONAL");
  assert.deepEqual(conditional.conditions, [
    "dry-run-first",
    "operator-confirm-before-apply",
  ]);
});

test("ControlRodMode rejects conditional permit without conditions", () => {
  const mode = new ControlRodMode();

  expectValidationError(
    () =>
      mode.validatePermit(
        buildPermit({
          operatorDecision: "CONDITIONAL",
          conditions: [],
        })
      ),
    "INVALID_FIELD",
    "'conditions' must be a non-empty array for CONDITIONAL permits"
  );
});

test("ControlRodMode HARD_STOP gate behaves deterministically for granted, denied, and conditional permits", () => {
  const mode = new ControlRodMode();
  const profile = mode.resolveProfile("conservative");

  const granted = mode.evaluateHardStopGate({
    profile,
    domainId: "pricing_quote_logic",
    sessionId: "wave4_s01",
    evaluatedAt: T1,
    authorization: buildAuthorization(),
    permit: buildPermit({ operatorDecision: "GRANTED" }),
  });

  assert.equal(granted.autonomyLevel, "HARD_STOP");
  assert.equal(granted.statusCode, "PERMIT_GRANTED");
  assert.equal(granted.mayProceed, true);
  assert.equal(granted.constrained, false);

  const denied = mode.evaluateHardStopGate({
    profile,
    domainId: "pricing_quote_logic",
    sessionId: "wave4_s01",
    evaluatedAt: T1,
    authorization: buildAuthorization(),
    permit: buildPermit({ operatorDecision: "DENIED" }),
  });

  assert.equal(denied.statusCode, "PERMIT_DENIED");
  assert.equal(denied.mayProceed, false);

  const conditional = mode.evaluateHardStopGate({
    profile,
    domainId: "pricing_quote_logic",
    sessionId: "wave4_s01",
    evaluatedAt: T1,
    authorization: buildAuthorization(),
    permit: buildPermit({
      operatorDecision: "CONDITIONAL",
      conditions: ["apply-only-in-approved-module"],
    }),
  });

  assert.equal(conditional.statusCode, "PERMIT_CONDITIONAL");
  assert.equal(conditional.mayProceed, true);
  assert.equal(conditional.constrained, true);
});

test("ControlRodMode permit process applies only to HARD_STOP domains", () => {
  const mode = new ControlRodMode();
  const profile = mode.resolveProfile("balanced");

  const decision = mode.evaluateHardStopGate({
    profile,
    domainId: "documentation_comments",
    sessionId: "wave4_s01",
    evaluatedAt: T1,
  });

  assert.equal(decision.autonomyLevel, "FULL_AUTO");
  assert.equal(decision.requiresLoto, false);
  assert.equal(decision.requiresPermit, false);
  assert.equal(decision.statusCode, "NOT_HARD_STOP");
  assert.equal(decision.mayProceed, true);
});

test("ControlRodMode rejects invalid preset id deterministically", () => {
  const mode = new ControlRodMode();

  expectValidationError(
    () => mode.resolveProfile("aggressive"),
    "INVALID_FIELD",
    "'controlRodProfile' preset id must be one of: conservative, balanced, velocity"
  );
});

test("Negative control: ControlRodMode exposes no adaptive or suggestion behavior", () => {
  const mode = new ControlRodMode();
  const methodNames = Object.getOwnPropertyNames(ControlRodMode.prototype).sort();

  assert.deepEqual(methodNames, [
    "constructor",
    "evaluateHardStopGate",
    "listStarterProfileIds",
    "resolveProfile",
    "validateLotoAuthorization",
    "validatePermit",
  ]);
  assert.equal(typeof mode.adaptProfile, "undefined");
  assert.equal(typeof mode.suggestProfile, "undefined");
  assert.equal(typeof mode.learn, "undefined");
});
