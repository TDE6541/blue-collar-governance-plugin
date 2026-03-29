"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { SessionReceipt } = require("../../src/SessionReceipt");

const CREATED_AT = "2026-03-29T14:10:00Z";

function buildReceipt(overrides = {}) {
  return {
    receiptId: "receipt_wave1_001",
    briefRef: "brief_wave1_001",
    plannedWork: [
      "Implement SessionBrief runtime.",
      "Implement SessionReceipt runtime.",
      "Add Block C golden tests.",
    ],
    completedWork: [
      "Implement SessionBrief runtime.",
      "Implement SessionReceipt runtime.",
      "Add Block C golden tests.",
    ],
    untouchedWork: [],
    holdsRaised: [],
    approvedDrift: [],
    excludedWork: ["Block D integration/proof flow."],
    artifactsChanged: [
      "src/SessionBrief.js",
      "src/SessionReceipt.js",
      "tests/golden/SessionBrief.golden.test.js",
      "tests/golden/SessionReceipt.golden.test.js",
    ],
    outcome: "complete",
    signoffRequired: true,
    summary: "Block C runtime completed with a clean as-built record.",
    createdBy: "ai",
    createdAt: CREATED_AT,
    ...overrides,
  };
}

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

test("SessionReceipt.createReceipt stores valid post-session as-built record", () => {
  const receipts = new SessionReceipt();
  const receipt = receipts.createReceipt(buildReceipt());

  assert.equal(receipt.receiptId, "receipt_wave1_001");
  assert.equal(receipt.outcome, "complete");
  assert.deepEqual(receipt.excludedWork, ["Block D integration/proof flow."]);
});

test("SessionReceipt deterministic validation for approvedDrift merged into plannedWork", () => {
  const receipts = new SessionReceipt();

  expectValidationError(
    () =>
      receipts.createReceipt(
        buildReceipt({ approvedDrift: ["Implement SessionBrief runtime."] })
      ),
    "INVALID_RECEIPT_RULE",
    "'approvedDrift' items must not be merged into 'plannedWork'"
  );

  expectValidationError(
    () =>
      receipts.createReceipt(
        buildReceipt({ approvedDrift: ["Implement SessionBrief runtime."] })
      ),
    "INVALID_RECEIPT_RULE",
    "'approvedDrift' items must not be merged into 'plannedWork'"
  );
});

test("SessionReceipt requires untouchedWork and excludedWork to remain distinct", () => {
  const receipts = new SessionReceipt();

  expectValidationError(
    () =>
      receipts.createReceipt(
        buildReceipt({
          untouchedWork: ["Block D integration/proof flow."],
          excludedWork: ["Block D integration/proof flow."],
        })
      ),
    "INVALID_RECEIPT_RULE",
    "'untouchedWork' and 'excludedWork' must remain distinct lists"
  );
});

test("SessionReceipt.summarizeAsBuilt reports incomplete planned and unplanned completed work", () => {
  const receipts = new SessionReceipt();
  receipts.createReceipt(
    buildReceipt({
      outcome: "partial",
      completedWork: [
        "Implement SessionBrief runtime.",
        "Add extra unplanned note.",
      ],
      untouchedWork: ["Add Block C golden tests."],
      approvedDrift: [],
      summary: "Scope partially completed with one unplanned completion.",
    })
  );

  const summary = receipts.summarizeAsBuilt("receipt_wave1_001");
  assert.deepEqual(summary.plannedButIncomplete, ["Implement SessionReceipt runtime."]);
  assert.deepEqual(summary.unplannedCompleted, ["Add extra unplanned note."]);
  assert.equal(summary.outcome, "partial");
  assert.equal(summary.signoffRequired, true);
});

test("SessionReceipt.summarizeAsBuilt treats approved drift as planned exception", () => {
  const receipts = new SessionReceipt();
  receipts.createReceipt(
    buildReceipt({
      outcome: "complete_with_holds",
      holdsRaised: ["hold_wave1_009"],
      approvedDrift: ["Add receipt verification matrix."],
      completedWork: [
        "Implement SessionBrief runtime.",
        "Implement SessionReceipt runtime.",
        "Add Block C golden tests.",
        "Add receipt verification matrix.",
      ],
      summary: "Core work complete with one approved extension and active hold trail.",
    })
  );

  const summary = receipts.summarizeAsBuilt("receipt_wave1_001");
  assert.deepEqual(summary.unplannedCompleted, []);
  assert.deepEqual(summary.approvedDrift, ["Add receipt verification matrix."]);
  assert.deepEqual(summary.holdsRaised, ["hold_wave1_009"]);
  assert.equal(summary.outcome, "complete_with_holds");
});
