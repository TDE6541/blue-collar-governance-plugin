"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { ChangeOrderSkill, SKILL_ROUTES } = require("../../src/ChangeOrderSkill");

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

function sampleChangeOrder(overrides = {}) {
  return {
    changeOrderId: "co_001",
    status: "DEFERRED",
    decisionReason: "Awaiting operator decision.",
    decisionBy: "ai",
    decidedAt: "2026-03-31T02:10:00Z",
    sourceRefs: ["session_brief:wave4_s01", "callout:callout_drift_001"],
    evidenceRefs: ["chain:buddy_chain_wave4_s01_001", "receipt:wave4_s01"],
    ...overrides,
  };
}

function sampleInput(changeOrders) {
  return {
    changeOrders,
  };
}

test("ChangeOrderSkill keeps locked route list", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/change-order"]);
});

test("/change-order returns deterministic snapshot output when there are zero records", () => {
  const skill = new ChangeOrderSkill();
  const input = sampleInput([]);

  const viewA = skill.renderChangeOrder(input);
  const viewB = skill.renderChangeOrder(input);

  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/change-order");
  assert.equal(viewA.changeOrderCount, 0);
  assert.deepEqual(viewA.changeOrders, []);
  assert.equal(viewA.snapshotState, "no change orders in current snapshot");
  assert.equal(/no drift|nothing changed|all clear/i.test(JSON.stringify(viewA)), false);
});

test("/change-order renders one existing record from snapshot truth", () => {
  const skill = new ChangeOrderSkill();
  const view = skill.renderChangeOrder(sampleInput([sampleChangeOrder()]));

  assert.equal(view.route, "/change-order");
  assert.equal(view.changeOrderCount, 1);
  assert.equal(view.changeOrders[0].changeOrderId, "co_001");
  assert.equal(view.changeOrders[0].status, "DEFERRED");
  assert.equal(view.changeOrders[0].decisionBy, "ai");
});

test("/change-order preserves source order and input immutability", () => {
  const skill = new ChangeOrderSkill();
  const input = sampleInput([
    sampleChangeOrder({ changeOrderId: "co_a", status: "DEFERRED" }),
    sampleChangeOrder({ changeOrderId: "co_b", status: "APPROVED", decisionBy: "architect" }),
    sampleChangeOrder({ changeOrderId: "co_c", status: "REJECTED", decisionBy: "architect" }),
  ]);
  const snapshot = JSON.parse(JSON.stringify(input));

  const view = skill.renderChangeOrder(input);

  assert.deepEqual(input, snapshot);
  assert.deepEqual(
    view.changeOrders.map((entry) => entry.changeOrderId),
    ["co_a", "co_b", "co_c"]
  );
});

test("/change-order output fields stay constrained and language stays non-action", () => {
  const skill = new ChangeOrderSkill();
  const view = skill.renderChangeOrder(sampleInput([sampleChangeOrder()]));

  assert.deepEqual(Object.keys(view).sort(), [
    "changeOrderCount",
    "changeOrders",
    "renderNote",
    "route",
    "snapshotState",
  ]);

  assert.deepEqual(Object.keys(view.changeOrders[0]).sort(), [
    "changeOrderId",
    "decidedAt",
    "decisionBy",
    "decisionReason",
    "evidenceRefs",
    "sourceRefs",
    "status",
  ]);

  const forbiddenFields = [
    "recommended",
    "suggestion",
    "priority",
    "ranking",
    "score",
    "weight",
    "decisionAction",
    "workflowHealth",
  ];

  for (const field of forbiddenFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(view, field), false);
    assert.equal(Object.prototype.hasOwnProperty.call(view.changeOrders[0], field), false);
  }

  assert.equal(
    /recommend|suggest|rank|priority|score|weight|decide now|open change order|create change order/i.test(
      JSON.stringify(view)
    ),
    false
  );
});

test("/change-order requires changeOrders and keeps render-only method surface", () => {
  const skill = new ChangeOrderSkill();

  expectValidationError(
    () => skill.renderChangeOrder({}),
    "ERR_INVALID_INPUT",
    "'changeOrders' is required"
  );

  const methodNames = Object.getOwnPropertyNames(ChangeOrderSkill.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "renderChangeOrder"]);

  assert.equal(typeof skill.persistRouteState, "undefined");
  assert.equal(typeof skill.saveChangeOrderSnapshot, "undefined");

  const source = fs.readFileSync(path.join(__dirname, "../../src/ChangeOrderSkill.js"), "utf8");
  assert.equal(source.includes("createFromDrift("), false);
  assert.equal(source.includes("decide("), false);
});
