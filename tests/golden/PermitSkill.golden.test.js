"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { ControlRodMode } = require("../../src/ControlRodMode");
const { PermitSkill, SKILL_ROUTES } = require("../../src/PermitSkill");

const T0 = "2026-03-31T12:00:00Z";
const T1 = "2026-03-31T12:05:00Z";

function buildAuthorization(overrides = {}) {
  return {
    authorizationId: "loto_permit_001",
    domainId: "pricing_quote_logic",
    authorizedBy: "architect",
    authorizedAt: T0,
    reason: "HARD_STOP gate requires explicit authorization.",
    scope: { scopeType: "SESSION", sessionId: "wave5_permit_s01" },
    chainRef: "chain_loto_permit_001",
    ...overrides,
  };
}

function buildPermit(overrides = {}) {
  return {
    permitId: "permit_wave5_001",
    sessionId: "wave5_permit_s01",
    requestedDomains: ["pricing_quote_logic"],
    scopeJustification: "Bounded domain work for approved session scope.",
    riskAssessment: "Known risk bounded to pricing domain.",
    rollbackPlan: "Revert pricing rules to previous snapshot.",
    operatorDecision: "GRANTED",
    chainRef: "chain_permit_wave5_001",
    ...overrides,
  };
}

function buildInput(overrides = {}) {
  const mode = new ControlRodMode();
  return {
    profile: mode.resolveProfile("conservative"),
    domainId: "pricing_quote_logic",
    sessionId: "wave5_permit_s01",
    evaluatedAt: T1,
    authorization: buildAuthorization(),
    permit: buildPermit(),
    ...overrides,
  };
}

test("PermitSkill keeps locked route list", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/permit"]);
});

test("/permit renders GRANTED gate decision from existing Control Rod truth", () => {
  const skill = new PermitSkill();
  const view = skill.renderPermit(buildInput());

  assert.equal(view.route, "/permit");
  assert.equal(view.evaluated, true);
  assert.equal(view.statusCode, "PERMIT_GRANTED");
  assert.equal(view.permitDecision, "GRANTED");
  assert.equal(view.mayProceed, true);
  assert.equal(view.constrained, false);
});

test("/permit renders DENIED gate decision from existing Control Rod truth", () => {
  const skill = new PermitSkill();
  const view = skill.renderPermit(
    buildInput({
      permit: buildPermit({ operatorDecision: "DENIED" }),
    })
  );

  assert.equal(view.route, "/permit");
  assert.equal(view.evaluated, true);
  assert.equal(view.statusCode, "PERMIT_DENIED");
  assert.equal(view.permitDecision, "DENIED");
  assert.equal(view.mayProceed, false);
});

test("/permit renders CONDITIONAL gate decision from existing Control Rod truth", () => {
  const skill = new PermitSkill();
  const view = skill.renderPermit(
    buildInput({
      permit: buildPermit({
        operatorDecision: "CONDITIONAL",
        conditions: ["operator-present", "single-domain-only"],
      }),
    })
  );

  assert.equal(view.route, "/permit");
  assert.equal(view.evaluated, true);
  assert.equal(view.statusCode, "PERMIT_CONDITIONAL");
  assert.equal(view.permitDecision, "CONDITIONAL");
  assert.equal(view.mayProceed, true);
  assert.equal(view.constrained, true);
  assert.deepEqual(view.conditions, ["operator-present", "single-domain-only"]);
});

test("/permit renders NOT_HARD_STOP path from existing gate truth", () => {
  const skill = new PermitSkill();
  const mode = new ControlRodMode();

  const view = skill.renderPermit({
    profile: mode.resolveProfile("balanced"),
    domainId: "documentation_comments",
    sessionId: "wave5_permit_s01",
    evaluatedAt: T1,
  });

  assert.equal(view.route, "/permit");
  assert.equal(view.evaluated, true);
  assert.equal(view.statusCode, "NOT_HARD_STOP");
  assert.equal(view.requiresLoto, false);
  assert.equal(view.requiresPermit, false);
  assert.equal(view.mayProceed, true);
  assert.equal(view.authorizationRef, null);
  assert.equal(view.permitRef, null);
});

test("/permit returns deterministic no-evaluation output when required input is missing", () => {
  const skill = new PermitSkill();
  const input = buildInput({ domainId: undefined });

  const viewA = skill.renderPermit(input);
  const viewB = skill.renderPermit(input);

  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/permit");
  assert.equal(viewA.evaluated, false);
  assert.equal(viewA.statusCode, null);
  assert.equal(viewA.mayProceed, null);
  assert.equal(
    viewA.evaluationState,
    "no evaluation performed: required permit-gate input missing"
  );
});

test("/permit output fields stay constrained and source input stays unchanged", () => {
  const skill = new PermitSkill();
  const input = buildInput();
  const snapshot = JSON.parse(JSON.stringify(input));

  const view = skill.renderPermit(input);

  assert.deepEqual(input, snapshot);

  assert.deepEqual(Object.keys(view).sort(), [
    "authorizationRef",
    "autonomyLevel",
    "chainRefs",
    "conditions",
    "constrained",
    "domainId",
    "evaluated",
    "evaluatedAt",
    "evaluationState",
    "mayProceed",
    "permitDecision",
    "permitRef",
    "profileId",
    "renderNote",
    "requiresLoto",
    "requiresPermit",
    "route",
    "sessionId",
    "statusCode",
    "summary",
  ]);
});

test("/permit keeps evaluate/render-only method surface", () => {
  const skill = new PermitSkill();

  const methodNames = Object.getOwnPropertyNames(PermitSkill.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "renderPermit"]);

  assert.equal(typeof skill.persistRouteState, "undefined");
  assert.equal(typeof skill.applyRouteMutation, "undefined");

  const source = fs.readFileSync(path.join(__dirname, "../../src/PermitSkill.js"), "utf8");
  assert.equal(source.includes("evaluateHardStopGate("), true);
  assert.equal(source.includes("persistRouteState"), false);
  assert.equal(source.includes("applyRouteMutation"), false);
});


