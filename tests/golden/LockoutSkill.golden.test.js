"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { LockoutSkill, SKILL_ROUTES } = require("../../src/LockoutSkill");

const T0 = "2026-03-31T14:00:00Z";

function buildAuthorization(overrides = {}) {
  return {
    authorizationId: "loto_lockout_001",
    domainId: "protected_destructive_ops",
    authorizedBy: "architect",
    authorizedAt: T0,
    reason: "Explicit lockout authorization for protected destructive operation.",
    scope: { scopeType: "SESSION", sessionId: "wave5_lockout_s01" },
    conditions: ["operator-present", "single-domain-only"],
    chainRef: "chain_loto_lockout_001",
    ...overrides,
  };
}

test("LockoutSkill keeps locked route list", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/lockout"]);
});

test("/lockout renders valid authorization from existing LOTO validation truth", () => {
  const skill = new LockoutSkill();
  const view = skill.renderLockout({ authorization: buildAuthorization() });

  assert.equal(view.route, "/lockout");
  assert.equal(view.evaluated, true);
  assert.equal(view.authorizationValid, true);
  assert.equal(view.authorizationId, "loto_lockout_001");
  assert.equal(view.domainId, "protected_destructive_ops");
  assert.equal(view.authorizedBy, "architect");
  assert.equal(view.authorizedAt, T0);
  assert.equal(view.reason.length > 0, true);
  assert.deepEqual(view.scope, {
    scopeType: "SESSION",
    sessionId: "wave5_lockout_s01",
  });
  assert.deepEqual(view.conditions, ["operator-present", "single-domain-only"]);
  assert.equal(view.chainRef, "chain_loto_lockout_001");
});

test("/lockout renders deterministic no-evaluation view for malformed authorization", () => {
  const skill = new LockoutSkill();

  const viewA = skill.renderLockout({
    authorization: buildAuthorization({
      scope: { scopeType: "SESSION" },
    }),
  });
  const viewB = skill.renderLockout({
    authorization: buildAuthorization({
      scope: { scopeType: "SESSION" },
    }),
  });

  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/lockout");
  assert.equal(viewA.evaluated, false);
  assert.equal(viewA.authorizationValid, null);
  assert.equal(
    viewA.evaluationState,
    "no evaluation performed: authorization input failed validation"
  );
});

test("/lockout returns deterministic no-evaluation output when required input is missing", () => {
  const skill = new LockoutSkill();

  const viewA = skill.renderLockout({});
  const viewB = skill.renderLockout({});

  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/lockout");
  assert.equal(viewA.evaluated, false);
  assert.equal(viewA.authorizationValid, null);
  assert.equal(
    viewA.evaluationState,
    "no evaluation performed: required authorization input missing"
  );
});

test("/lockout output fields stay constrained and source input stays unchanged", () => {
  const skill = new LockoutSkill();
  const input = { authorization: buildAuthorization() };
  const snapshot = JSON.parse(JSON.stringify(input));

  const view = skill.renderLockout(input);

  assert.deepEqual(input, snapshot);
  assert.deepEqual(Object.keys(view).sort(), [
    "authorizationId",
    "authorizationValid",
    "authorizedAt",
    "authorizedBy",
    "chainRef",
    "conditions",
    "domainId",
    "evaluated",
    "evaluationState",
    "reason",
    "renderNote",
    "route",
    "scope",
  ]);
});

test("/lockout keeps evaluate/render-only method surface and no permit coupling", () => {
  const skill = new LockoutSkill();

  const methodNames = Object.getOwnPropertyNames(LockoutSkill.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "renderLockout"]);

  assert.equal(typeof skill.persistRouteState, "undefined");
  assert.equal(typeof skill.applyRouteMutation, "undefined");

  const source = fs.readFileSync(path.join(__dirname, "../../src/LockoutSkill.js"), "utf8");
  assert.equal(source.includes("validateLotoAuthorization("), true);
  assert.equal(source.includes("evaluateHardStopGate("), false);
  assert.equal(source.includes("validatePermit("), false);
  assert.equal(source.includes("queue"), false);
  assert.equal(source.includes("inbox"), false);
  assert.equal(source.includes("ledger"), false);
});
