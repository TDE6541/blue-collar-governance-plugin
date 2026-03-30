"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ControlRodMode,
  AUTONOMY_LEVELS,
  STARTER_PROFILE_IDS,
  STARTER_DOMAIN_IDS,
} = require("../../src/ControlRodMode");

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

test("ControlRodMode v1 locks exactly three autonomy levels and three starter profiles", () => {
  assert.deepEqual([...AUTONOMY_LEVELS], ["FULL_AUTO", "SUPERVISED", "HARD_STOP"]);
  assert.deepEqual([...STARTER_PROFILE_IDS], ["conservative", "balanced", "velocity"]);
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

test("ControlRodMode rejects invalid preset id deterministically", () => {
  const mode = new ControlRodMode();

  expectValidationError(
    () => mode.resolveProfile("aggressive"),
    "INVALID_FIELD",
    "'controlRodProfile' preset id must be one of: conservative, balanced, velocity"
  );

  expectValidationError(
    () => mode.resolveProfile("aggressive"),
    "INVALID_FIELD",
    "'controlRodProfile' preset id must be one of: conservative, balanced, velocity"
  );
});

test("ControlRodMode rejects malformed explicit profile object deterministically", () => {
  const mode = new ControlRodMode();

  expectValidationError(
    () =>
      mode.resolveProfile({
        profileId: "custom_profile",
        profileLabel: "Custom",
      }),
    "INVALID_FIELD",
    "'domainRules' must be a non-empty array"
  );
});

test("ControlRodMode rejects invalid autonomy level deterministically", () => {
  const mode = new ControlRodMode();
  const explicitProfile = mode.resolveProfile("conservative");
  explicitProfile.profileId = "custom_profile";
  explicitProfile.profileLabel = "Custom";
  explicitProfile.domainRules[0] = {
    ...explicitProfile.domainRules[0],
    autonomyLevel: "AUTO",
  };

  expectValidationError(
    () => mode.resolveProfile(explicitProfile),
    "INVALID_FIELD",
    "'autonomyLevel' must be one of: FULL_AUTO, SUPERVISED, HARD_STOP"
  );
});

test("Negative control: ControlRodMode exposes no live-enforcement behavior", () => {
  const mode = new ControlRodMode();
  const methodNames = Object.getOwnPropertyNames(ControlRodMode.prototype).sort();

  assert.deepEqual(methodNames, ["constructor", "listStarterProfileIds", "resolveProfile"]);
  assert.equal(typeof mode.enforce, "undefined");
  assert.equal(typeof mode.authorize, "undefined");
  assert.equal(typeof mode.intervene, "undefined");
});
