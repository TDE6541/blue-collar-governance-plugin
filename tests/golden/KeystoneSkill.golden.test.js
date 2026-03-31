"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { KeystoneSkill, SKILL_ROUTES } = require("../../src/KeystoneSkill");

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

function buildFinding(overrides = {}) {
  return {
    issueRef: "claim:claim_001",
    findingType: "PHANTOM",
    severity: "HIGH",
    pass: "Truthfulness",
    summary: "Claim has no linked evidence.",
    evidenceRefs: ["claim_001"],
    ...overrides,
  };
}

function buildInput(findings) {
  return {
    walkEvaluation: {
      findings,
    },
  };
}

test("KeystoneSkill keeps locked route list", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/keystone"]);
});

test("/keystone returns deterministic clean result when findings are empty", () => {
  const skill = new KeystoneSkill();
  const input = buildInput([]);

  const viewA = skill.renderKeystone(input);
  const viewB = skill.renderKeystone(input);

  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/keystone");
  assert.equal(viewA.keystone, null);
  assert.equal(
    viewA.rationale,
    "no findings available in existing Walk source output; deterministic clean/no-keystone result"
  );
});

test("/keystone returns the single finding when only one finding exists", () => {
  const skill = new KeystoneSkill();
  const input = buildInput([
    buildFinding({
      issueRef: "claim:claim_single",
      severity: "MEDIUM",
      evidenceRefs: ["claim_single", "evidence_single"],
    }),
  ]);

  const view = skill.renderKeystone(input);

  assert.equal(view.route, "/keystone");
  assert.equal(view.keystone.issueRef, "claim:claim_single");
  assert.equal(view.keystone.severity, "MEDIUM");
  assert.deepEqual(view.keystone.evidenceRefs, ["claim_single", "evidence_single"]);
});

test("/keystone selects first finding among highest existing severity", () => {
  const skill = new KeystoneSkill();
  const input = buildInput([
    buildFinding({ issueRef: "claim:low", severity: "LOW" }),
    buildFinding({ issueRef: "claim:high_first", severity: "HIGH" }),
    buildFinding({ issueRef: "claim:medium", severity: "MEDIUM" }),
    buildFinding({ issueRef: "claim:critical", severity: "CRITICAL" }),
    buildFinding({ issueRef: "claim:high_second", severity: "HIGH" }),
  ]);

  const view = skill.renderKeystone(input);

  assert.equal(view.keystone.issueRef, "claim:critical");
  assert.equal(view.keystone.severity, "CRITICAL");
});

test("/keystone preserves source order for same-severity ties", () => {
  const skill = new KeystoneSkill();
  const input = buildInput([
    buildFinding({ issueRef: "claim:first_high", severity: "HIGH" }),
    buildFinding({ issueRef: "claim:second_high", severity: "HIGH" }),
    buildFinding({ issueRef: "claim:medium", severity: "MEDIUM" }),
  ]);

  const view = skill.renderKeystone(input);

  assert.equal(view.keystone.issueRef, "claim:first_high");
  assert.equal(view.keystone.severity, "HIGH");
});

test("/keystone keeps input unchanged and output fields constrained", () => {
  const skill = new KeystoneSkill();
  const input = buildInput([
    buildFinding({ issueRef: "claim:one", severity: "HIGH", evidenceRefs: ["claim_001"] }),
    buildFinding({ issueRef: "claim:two", severity: "MEDIUM", evidenceRefs: ["claim_002"] }),
  ]);
  const snapshot = JSON.parse(JSON.stringify(input));

  const view = skill.renderKeystone(input);

  assert.deepEqual(input, snapshot);
  assert.deepEqual(Object.keys(view).sort(), ["keystone", "rationale", "route"]);
  assert.deepEqual(Object.keys(view.keystone).sort(), [
    "evidenceRefs",
    "findingType",
    "issueRef",
    "pass",
    "severity",
    "summary",
  ]);

  view.keystone.evidenceRefs.push("forbidden_mutation");
  assert.equal(input.walkEvaluation.findings[0].evidenceRefs.includes("forbidden_mutation"), false);

  const forbiddenFields = [
    "score",
    "points",
    "badge",
    "rank",
    "leaderboard",
    "priority",
    "confidence",
    "weight",
    "dependencyMap",
  ];

  for (const field of forbiddenFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(view, field), false);
    assert.equal(Object.prototype.hasOwnProperty.call(view.keystone, field), false);
  }

  assert.equal(/dependency|root cause|recommend/i.test(view.rationale), false);
});

test("KeystoneSkill requires walkEvaluation and keeps render-only method surface", () => {
  const skill = new KeystoneSkill();

  expectValidationError(
    () => skill.renderKeystone({}),
    "ERR_INVALID_INPUT",
    "'walkEvaluation' is required"
  );

  const methodNames = Object.getOwnPropertyNames(KeystoneSkill.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "renderKeystone"]);

  assert.equal(typeof skill.persistSkillState, "undefined");
  assert.equal(typeof skill.saveKeystone, "undefined");
});

