"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { RedTagSkill, SKILL_ROUTES } = require("../../src/RedTagSkill");

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

function buildInterlock(overrides = {}) {
  return {
    interlockId: "interlock_wave5_red_tag_001",
    actionCategory: "protected_surface_change",
    defaultOutcome: "require_authorization",
    requiresExplicitAuthorization: true,
    protectedTargets: ["README.md", "CLAUDE.md"],
    operatorPrompt: "Protected canon surface touched.",
    rationale: "Protected surfaces require explicit authorization.",
    evidence: ["safety:canonical_front_door"],
    createdBy: "architect",
    createdAt: "2026-03-31T12:00:00Z",
    ...overrides,
  };
}

function buildInput(overrides = {}) {
  return {
    interlocks: [buildInterlock()],
    interlockId: "interlock_wave5_red_tag_001",
    actionCategory: "protected_surface_change",
    targets: ["README.md"],
    operatorAuthorized: false,
    ...overrides,
  };
}

test("RedTagSkill keeps locked route list", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/red-tag"]);
});

test("/red-tag renders blocked decision from existing interlock truth", () => {
  const skill = new RedTagSkill();
  const view = skill.renderRedTag(buildInput());

  assert.equal(view.route, "/red-tag");
  assert.equal(view.evaluated, true);
  assert.equal(view.triggered, true);
  assert.equal(view.decision, "require_authorization");
  assert.equal(view.requiresAuthorization, true);
  assert.equal(view.mayProceed, false);
  assert.deepEqual(view.protectedTargetHits, ["README.md"]);
});

test("/red-tag renders non-triggered decision from existing interlock truth", () => {
  const skill = new RedTagSkill();
  const view = skill.renderRedTag(
    buildInput({
      actionCategory: "external_side_effect",
      targets: ["src/OpenItemsBoard.js"],
    })
  );

  assert.equal(view.route, "/red-tag");
  assert.equal(view.evaluated, true);
  assert.equal(view.triggered, false);
  assert.equal(view.decision, null);
  assert.equal(view.mayProceed, true);
  assert.deepEqual(view.protectedTargetHits, []);
});

test("/red-tag returns deterministic no-evaluation output when required input is missing", () => {
  const skill = new RedTagSkill();
  const input = buildInput({ targets: undefined });

  const viewA = skill.renderRedTag(input);
  const viewB = skill.renderRedTag(input);

  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/red-tag");
  assert.equal(viewA.evaluated, false);
  assert.equal(viewA.decision, null);
  assert.equal(viewA.requiresAuthorization, null);
  assert.equal(viewA.mayProceed, null);
  assert.equal(
    viewA.evaluationState,
    "no evaluation performed: required action/target input missing"
  );
});

test("/red-tag output fields stay constrained and source input stays unchanged", () => {
  const skill = new RedTagSkill();
  const input = buildInput();
  const snapshot = JSON.parse(JSON.stringify(input));

  const view = skill.renderRedTag(input);

  assert.deepEqual(input, snapshot);

  assert.deepEqual(Object.keys(view).sort(), [
    "actionCategory",
    "decision",
    "evaluated",
    "evaluationState",
    "evidence",
    "interlockId",
    "mayProceed",
    "operatorPrompt",
    "protectedTargetHits",
    "rationale",
    "renderNote",
    "requiresAuthorization",
    "route",
    "targets",
    "triggered",
  ]);
});

test("/red-tag validates input and keeps evaluate/render-only method surface", () => {
  const skill = new RedTagSkill();

  expectValidationError(
    () => skill.renderRedTag({}),
    "ERR_INVALID_INPUT",
    "'interlocks' is required"
  );

  expectValidationError(
    () =>
      skill.renderRedTag({
        interlocks: [buildInterlock()],
        targets: ["README.md", ""],
      }),
    "ERR_INVALID_INPUT",
    "'targets' must be an array of non-empty strings"
  );

  const methodNames = Object.getOwnPropertyNames(RedTagSkill.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "renderRedTag"]);

  assert.equal(typeof skill.persistRouteState, "undefined");
  assert.equal(typeof skill.applyRouteMutation, "undefined");

  const source = fs.readFileSync(path.join(__dirname, "../../src/RedTagSkill.js"), "utf8");
  assert.equal(source.includes("evaluateAction("), true);
  assert.equal(source.includes("createInterlock("), false);
  assert.equal(source.includes("checkPresence("), false);
  assert.equal(source.includes("createCallout("), false);
});
