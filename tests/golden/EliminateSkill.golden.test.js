"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { EliminateSkill, SKILL_ROUTES } = require("../../src/EliminateSkill");

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

function buildHold(overrides = {}) {
  return {
    holdId: "hold_wave5_001",
    summary: "Need explicit boundary confirmation before next step.",
    status: "active",
    blocking: true,
    reason: "Protected surface is in scope boundary.",
    impact: "Scope drift risk if boundary is assumed.",
    evidence: ["brief_scope_001", "receipt_scope_001"],
    options: ["narrow scope", "request architect signoff"],
    resolutionPath: "Architect confirmation or narrow scope.",
    ...overrides,
  };
}

function buildAssessment(overrides = {}) {
  return {
    holdId: "hold_wave5_001",
    scarcityState: "TIGHT",
    optionCount: 2,
    rationale: "Active blocking hold indicates tight scarcity pressure.",
    ...overrides,
  };
}

function buildInput(holdSnapshots, assessments) {
  return {
    holdSnapshots,
    scarcityReport: {
      assessments,
    },
  };
}

test("EliminateSkill keeps locked route list", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/eliminate"]);
});

test("/eliminate returns deterministic clean output when no eligible holds are supplied", () => {
  const skill = new EliminateSkill();
  const input = buildInput([], []);

  const viewA = skill.renderEliminate(input);
  const viewB = skill.renderEliminate(input);

  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/eliminate");
  assert.equal(viewA.holdCount, 0);
  assert.deepEqual(viewA.holds, []);
  assert.equal(
    viewA.renderNote,
    "no hold snapshots available in supplied input; deterministic clean/no-eliminate result"
  );
});

test("/eliminate renders one hold with matching scarcity assessment", () => {
  const skill = new EliminateSkill();
  const input = buildInput([buildHold()], [buildAssessment()]);

  const view = skill.renderEliminate(input);

  assert.equal(view.route, "/eliminate");
  assert.equal(view.holdCount, 1);
  assert.equal(view.holds[0].holdId, "hold_wave5_001");
  assert.equal(view.holds[0].status, "active");
  assert.deepEqual(view.holds[0].options, ["narrow scope", "request architect signoff"]);
  assert.equal(view.holds[0].resolutionPath, "Architect confirmation or narrow scope.");
  assert.deepEqual(view.holds[0].scarcityAssessment, {
    scarcityState: "TIGHT",
    optionCount: 2,
    rationale: "Active blocking hold indicates tight scarcity pressure.",
  });
});

test("/eliminate renders null scarcity when no direct holdId match exists", () => {
  const skill = new EliminateSkill();
  const input = buildInput(
    [buildHold({ holdId: "hold_wave5_002" })],
    [buildAssessment({ holdId: "hold_wave5_other" })]
  );

  const view = skill.renderEliminate(input);

  assert.equal(view.holds[0].holdId, "hold_wave5_002");
  assert.equal(view.holds[0].scarcityAssessment, null);
});

test("/eliminate preserves hold source order and input immutability", () => {
  const skill = new EliminateSkill();
  const input = buildInput(
    [
      buildHold({ holdId: "hold_a", status: "proposed" }),
      buildHold({ holdId: "hold_b", status: "active" }),
      buildHold({ holdId: "hold_c", status: "resolved", blocking: false }),
    ],
    [
      buildAssessment({ holdId: "hold_b", scarcityState: "CRITICAL", optionCount: 1 }),
      buildAssessment({ holdId: "hold_a", scarcityState: "WATCH", optionCount: 2 }),
      buildAssessment({ holdId: "hold_c", scarcityState: "CLEAR", optionCount: 2 }),
    ]
  );
  const snapshot = JSON.parse(JSON.stringify(input));

  const view = skill.renderEliminate(input);

  assert.deepEqual(input, snapshot);
  assert.deepEqual(
    view.holds.map((hold) => hold.holdId),
    ["hold_a", "hold_b", "hold_c"]
  );
});

test("/eliminate output fields stay constrained and language stays non-advisory", () => {
  const skill = new EliminateSkill();
  const view = skill.renderEliminate(buildInput([buildHold()], [buildAssessment()]));

  assert.deepEqual(Object.keys(view).sort(), ["holdCount", "holds", "renderNote", "route"]);
  assert.deepEqual(Object.keys(view.holds[0]).sort(), [
    "blocking",
    "evidence",
    "holdId",
    "impact",
    "options",
    "reason",
    "resolutionPath",
    "scarcityAssessment",
    "status",
    "summary",
  ]);

  const forbiddenFields = [
    "recommended",
    "bestOption",
    "preferredOption",
    "topOption",
    "priority",
    "ranking",
    "score",
    "weight",
    "prunedOptions",
  ];

  for (const field of forbiddenFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(view, field), false);
    assert.equal(Object.prototype.hasOwnProperty.call(view.holds[0], field), false);
  }

  assert.equal(
    /recommend|best option|preferred|top option|rank|priority|score|weight|you should/i.test(
      JSON.stringify(view)
    ),
    false
  );
});

test("/eliminate requires holdSnapshots and scarcityReport and stays render only", () => {
  const skill = new EliminateSkill();

  expectValidationError(
    () => skill.renderEliminate({}),
    "ERR_INVALID_INPUT",
    "'holdSnapshots' is required"
  );

  expectValidationError(
    () => skill.renderEliminate({ holdSnapshots: [] }),
    "ERR_INVALID_INPUT",
    "'scarcityReport' is required"
  );

  const methodNames = Object.getOwnPropertyNames(EliminateSkill.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "renderEliminate"]);

  assert.equal(typeof skill.persistRouteState, "undefined");
  assert.equal(typeof skill.saveEliminateSnapshot, "undefined");
});

