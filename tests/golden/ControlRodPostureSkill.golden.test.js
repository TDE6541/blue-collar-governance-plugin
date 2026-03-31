"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ControlRodPostureSkill,
  SKILL_ROUTES,
} = require("../../src/ControlRodPostureSkill");

function expectValidationError(action, code, message) {
  try {
    action();
    assert.fail("Expected validation error, but no error was thrown");
  } catch (error) {
    assert.equal(error.name, "ValidationError");
    assert.equal(error.code, code);
    assert.equal(error.message, `${code}: ${message}`);
  }
}

function sampleInput() {
  return {
    controlRodProfile: "balanced",
  };
}

test("ControlRodPostureSkill keeps locked route list", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/control-rods"]);
});

test("/control-rods renders deterministic posture visibility and keeps input unchanged", () => {
  const skill = new ControlRodPostureSkill();
  const input = sampleInput();
  const snapshot = JSON.parse(JSON.stringify(input));

  const viewA = skill.renderControlRods(input);
  const viewB = skill.renderControlRods(input);

  assert.deepEqual(input, snapshot);
  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/control-rods");
  assert.deepEqual(viewA.starterProfileIds, ["conservative", "balanced", "velocity"]);
  assert.equal(viewA.profile.profileId, "balanced");
  assert.equal(viewA.profile.profileLabel, "Balanced");
  assert.equal(viewA.summary.domainCount, 10);
  assert.equal(viewA.summary.hardStopCount, 4);
  assert.equal(viewA.summary.supervisedCount, 2);
  assert.equal(viewA.summary.fullAutoCount, 4);
  assert.equal(viewA.domains.length, 10);
  assert.equal(viewA.domains[0].domainId, "pricing_quote_logic");
  assert.equal(viewA.domains[0].autonomyLevel, "SUPERVISED");
});

test("/control-rods requires controlRodProfile", () => {
  const skill = new ControlRodPostureSkill();

  expectValidationError(
    () => skill.renderControlRods({}),
    "ERR_INVALID_INPUT",
    "'controlRodProfile' is required"
  );
});

test("ControlRodPostureSkill method list stays render only", () => {
  const methodNames = Object.getOwnPropertyNames(ControlRodPostureSkill.prototype).sort();

  assert.deepEqual(methodNames, ["constructor", "renderControlRods"]);
});
