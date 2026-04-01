"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { CalloutSkill, SKILL_ROUTES } = require("../../src/CalloutSkill");

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

function sampleCallout(overrides = {}) {
  return {
    calloutId: "buddy_callout_wave4_s01_001",
    sessionId: "wave4_s01",
    buddyId: "buddy_wave4_v1",
    calloutType: "DRIFT",
    urgency: "WARN",
    summary: "Scope drift observed in active session path.",
    detectedAt: "2026-03-30T23:05:00Z",
    sourceRefs: ["scope_guard:eval_001"],
    evidenceRefs: ["receipt:wave4_s01"],
    chainEntryRef: "buddy_chain_wave4_s01_001",
    ...overrides,
  };
}

function sampleInput(callouts) {
  return {
    callouts,
  };
}

test("CalloutSkill keeps locked route list", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/callout"]);
});

test("/callout returns deterministic snapshot output when there are zero callouts", () => {
  const skill = new CalloutSkill();
  const input = sampleInput([]);

  const viewA = skill.renderCallout(input);
  const viewB = skill.renderCallout(input);

  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/callout");
  assert.equal(viewA.calloutCount, 0);
  assert.deepEqual(viewA.callouts, []);
  assert.equal(viewA.snapshotState, "no callouts in current snapshot");
  assert.equal(
    /all clear|no issues detected|watcher healthy|session paused|safety stop/i.test(
      JSON.stringify(viewA)
    ),
    false
  );
});

test("/callout renders one callout from existing snapshot fields", () => {
  const skill = new CalloutSkill();
  const view = skill.renderCallout(sampleInput([sampleCallout()]));

  assert.equal(view.route, "/callout");
  assert.equal(view.calloutCount, 1);
  assert.equal(view.callouts[0].calloutId, "buddy_callout_wave4_s01_001");
  assert.equal(view.callouts[0].calloutType, "DRIFT");
  assert.equal(view.callouts[0].urgency, "WARN");
});

test("/callout preserves source order and input immutability", () => {
  const skill = new CalloutSkill();
  const input = sampleInput([
    sampleCallout({ calloutId: "callout_a", calloutType: "DRIFT", urgency: "WARN" }),
    sampleCallout({ calloutId: "callout_b", calloutType: "VIOLATION", urgency: "HALT" }),
    sampleCallout({ calloutId: "callout_c", calloutType: "PHANTOM", urgency: "WARN" }),
  ]);
  const snapshot = JSON.parse(JSON.stringify(input));

  const view = skill.renderCallout(input);

  assert.deepEqual(input, snapshot);
  assert.deepEqual(
    view.callouts.map((entry) => entry.calloutId),
    ["callout_a", "callout_b", "callout_c"]
  );
});

test("/callout output fields stay constrained and language stays non-action", () => {
  const skill = new CalloutSkill();
  const view = skill.renderCallout(sampleInput([sampleCallout()]));

  assert.deepEqual(Object.keys(view).sort(), [
    "calloutCount",
    "callouts",
    "renderNote",
    "route",
    "snapshotState",
  ]);

  assert.deepEqual(Object.keys(view.callouts[0]).sort(), [
    "buddyId",
    "calloutId",
    "calloutType",
    "chainEntryRef",
    "detectedAt",
    "evidenceRefs",
    "sessionId",
    "sourceRefs",
    "summary",
    "urgency",
  ]);

  const forbiddenFields = [
    "recommendation",
    "suggestion",
    "priority",
    "ranking",
    "score",
    "weight",
    "actionHint",
    "watcherHealth",
  ];

  for (const field of forbiddenFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(view, field), false);
    assert.equal(Object.prototype.hasOwnProperty.call(view.callouts[0], field), false);
  }

  assert.equal(
    /raise|clear|acknowledge|pause|resume|stop|recommend|suggest|rank|priority|score|weight/i.test(
      JSON.stringify(view)
    ),
    false
  );
});

test("/callout requires callouts and keeps render-only method surface", () => {
  const skill = new CalloutSkill();

  expectValidationError(
    () => skill.renderCallout({}),
    "ERR_INVALID_INPUT",
    "'callouts' is required"
  );

  const methodNames = Object.getOwnPropertyNames(CalloutSkill.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "renderCallout"]);

  assert.equal(typeof skill.persistRouteState, "undefined");
  assert.equal(typeof skill.saveCalloutSnapshot, "undefined");

  const source = fs.readFileSync(path.join(__dirname, "../../src/CalloutSkill.js"), "utf8");
  assert.equal(source.includes("checkPresence("), false);
  assert.equal(source.includes("createCallout("), false);
  assert.equal(source.includes("detectDrift("), false);
  assert.equal(source.includes("detectViolation("), false);
  assert.equal(source.includes("detectPhantom("), false);
});
