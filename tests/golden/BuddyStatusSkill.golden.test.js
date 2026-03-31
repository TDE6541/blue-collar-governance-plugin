"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { BuddyStatusSkill, SKILL_ROUTES } = require("../../src/BuddyStatusSkill");

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
    watcherPolicy: {
      deadManTimeoutMinutes: 15,
    },
    callouts,
  };
}

test("BuddyStatusSkill keeps locked route list", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/buddy-status"]);
});

test("/buddy-status returns deterministic snapshot output when there are zero callouts", () => {
  const skill = new BuddyStatusSkill();
  const input = sampleInput([]);

  const viewA = skill.renderBuddyStatus(input);
  const viewB = skill.renderBuddyStatus(input);

  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/buddy-status");
  assert.equal(viewA.calloutCount, 0);
  assert.deepEqual(viewA.callouts, []);
  assert.equal(viewA.snapshotState, "no active callouts in current watcher snapshot");
  assert.equal(
    /all clear|healthy|no issues detected|verified everything/i.test(JSON.stringify(viewA)),
    false
  );
});

test("/buddy-status renders one callout from existing snapshot fields", () => {
  const skill = new BuddyStatusSkill();
  const view = skill.renderBuddyStatus(sampleInput([sampleCallout()]));

  assert.equal(view.route, "/buddy-status");
  assert.equal(view.calloutCount, 1);
  assert.equal(view.watcherPolicy.deadManTimeoutMinutes, 15);
  assert.equal(view.callouts[0].calloutId, "buddy_callout_wave4_s01_001");
  assert.equal(view.callouts[0].calloutType, "DRIFT");
  assert.equal(view.callouts[0].urgency, "WARN");
});

test("/buddy-status preserves callout source order and input immutability", () => {
  const skill = new BuddyStatusSkill();
  const input = sampleInput([
    sampleCallout({ calloutId: "callout_a", calloutType: "DRIFT", urgency: "WARN" }),
    sampleCallout({ calloutId: "callout_b", calloutType: "VIOLATION", urgency: "HALT" }),
    sampleCallout({ calloutId: "callout_c", calloutType: "PHANTOM", urgency: "WARN" }),
  ]);
  const snapshot = JSON.parse(JSON.stringify(input));

  const view = skill.renderBuddyStatus(input);

  assert.deepEqual(input, snapshot);
  assert.deepEqual(
    view.callouts.map((entry) => entry.calloutId),
    ["callout_a", "callout_b", "callout_c"]
  );
});

test("/buddy-status output fields stay constrained and language stays neutral", () => {
  const skill = new BuddyStatusSkill();
  const view = skill.renderBuddyStatus(sampleInput([sampleCallout()]));

  assert.deepEqual(Object.keys(view).sort(), [
    "calloutCount",
    "callouts",
    "renderNote",
    "route",
    "snapshotState",
    "watcherPolicy",
  ]);
  assert.deepEqual(Object.keys(view.watcherPolicy).sort(), ["deadManTimeoutMinutes"]);
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
    "advice",
    "actionHint",
    "healthFlag",
    "statusGrade",
    "orderIndex",
  ];

  for (const field of forbiddenFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(view, field), false);
    assert.equal(Object.prototype.hasOwnProperty.call(view.callouts[0], field), false);
  }

  assert.equal(
    /recommend|suggest|rank|priority|score|weight|you should|all clear|healthy|no issues detected/i.test(
      JSON.stringify(view)
    ),
    false
  );
});

test("/buddy-status requires watcherPolicy and callouts and keeps render-only method surface", () => {
  const skill = new BuddyStatusSkill();

  expectValidationError(
    () => skill.renderBuddyStatus({}),
    "ERR_INVALID_INPUT",
    "'watcherPolicy' is required"
  );

  expectValidationError(
    () => skill.renderBuddyStatus({ watcherPolicy: { deadManTimeoutMinutes: 15 } }),
    "ERR_INVALID_INPUT",
    "'callouts' is required"
  );

  const methodNames = Object.getOwnPropertyNames(BuddyStatusSkill.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "renderBuddyStatus"]);

  assert.equal(typeof skill.persistRouteState, "undefined");
  assert.equal(typeof skill.saveBuddySnapshot, "undefined");

  const source = fs.readFileSync(path.join(__dirname, "../../src/BuddyStatusSkill.js"), "utf8");
  assert.equal(source.includes("checkPresence("), false);
});
