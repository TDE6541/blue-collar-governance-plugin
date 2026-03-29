"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  OmissionCoverageEngine,
  PROFILE_PACKS,
  PROFILE_PACK_EXPECTED_ITEMS,
  MISSING_ITEM_CODE_BY_EXPECTED_ITEM,
} = require("../../src/OmissionCoverageEngine");

function expectedItemsForPack(profilePack) {
  return [...PROFILE_PACK_EXPECTED_ITEMS[profilePack]];
}

function buildInput(profilePack, overrides = {}) {
  return {
    profilePack,
    sessionId: "wave2_s11",
    observedExpectedItems: expectedItemsForPack(profilePack),
    observationRefs: ["receipt_wave2_s11", "verification_wave2_s11"],
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

test("OmissionCoverageEngine locks Block C1 profile packs to exactly three", () => {
  assert.deepEqual([...PROFILE_PACKS].sort(), [
    "form_customer_data_flow",
    "pricing_quote_change",
    "protected_destructive_operation",
  ]);
});

test("OmissionCoverageEngine reports missing pricing quote output deterministically", () => {
  const engine = new OmissionCoverageEngine();
  const observedExpectedItems = expectedItemsForPack("pricing_quote_change").filter(
    (item) => item !== "QUOTE_CHANGE_APPLIED"
  );

  const result = engine.evaluate(
    buildInput("pricing_quote_change", { observedExpectedItems })
  );

  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].profilePack, "pricing_quote_change");
  assert.equal(result.findings[0].missingExpectedItem, "QUOTE_CHANGE_APPLIED");
  assert.equal(
    result.findings[0].missingItemCode,
    MISSING_ITEM_CODE_BY_EXPECTED_ITEM.QUOTE_CHANGE_APPLIED
  );
});

test("OmissionCoverageEngine reports missing form data-flow output deterministically", () => {
  const engine = new OmissionCoverageEngine();
  const observedExpectedItems = expectedItemsForPack("form_customer_data_flow").filter(
    (item) => item !== "CUSTOMER_DATA_FLOW_CAPTURED"
  );

  const result = engine.evaluate(
    buildInput("form_customer_data_flow", { observedExpectedItems })
  );

  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].profilePack, "form_customer_data_flow");
  assert.equal(
    result.findings[0].missingExpectedItem,
    "CUSTOMER_DATA_FLOW_CAPTURED"
  );
  assert.equal(
    result.findings[0].missingItemCode,
    MISSING_ITEM_CODE_BY_EXPECTED_ITEM.CUSTOMER_DATA_FLOW_CAPTURED
  );
});

test("OmissionCoverageEngine reports missing protected/destructive operation output deterministically", () => {
  const engine = new OmissionCoverageEngine();
  const observedExpectedItems = expectedItemsForPack(
    "protected_destructive_operation"
  ).filter((item) => item !== "PROTECTED_OPERATION_OUTCOME_CAPTURED");

  const result = engine.evaluate(
    buildInput("protected_destructive_operation", { observedExpectedItems })
  );

  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].profilePack, "protected_destructive_operation");
  assert.equal(
    result.findings[0].missingExpectedItem,
    "PROTECTED_OPERATION_OUTCOME_CAPTURED"
  );
  assert.equal(
    result.findings[0].missingItemCode,
    MISSING_ITEM_CODE_BY_EXPECTED_ITEM.PROTECTED_OPERATION_OUTCOME_CAPTURED
  );
});

test("Negative control: clean pricing profile returns zero findings", () => {
  const engine = new OmissionCoverageEngine();

  const result = engine.evaluate(buildInput("pricing_quote_change"));

  assert.equal(result.findings.length, 0);
});

test("Negative control: clean form profile returns zero findings", () => {
  const engine = new OmissionCoverageEngine();

  const result = engine.evaluate(buildInput("form_customer_data_flow"));

  assert.equal(result.findings.length, 0);
});

test("Negative control: clean protected/destructive profile returns zero findings", () => {
  const engine = new OmissionCoverageEngine();

  const result = engine.evaluate(buildInput("protected_destructive_operation"));

  assert.equal(result.findings.length, 0);
});

test("Negative control: wrong-pack expected outputs are not evaluated", () => {
  const engine = new OmissionCoverageEngine();

  const result = engine.evaluate(buildInput("pricing_quote_change"));

  assert.equal(result.findings.length, 0);
});

test("OmissionCoverageEngine requires explicit profilePack", () => {
  const engine = new OmissionCoverageEngine();

  expectValidationError(
    () =>
      engine.evaluate({
        sessionId: "wave2_s11",
        observedExpectedItems: [],
        observationRefs: ["receipt_wave2_s11"],
      }),
    "INVALID_FIELD",
    "'profilePack' must be a non-empty string"
  );
});

test("OmissionCoverageEngine rejects unknown profile packs deterministically", () => {
  const engine = new OmissionCoverageEngine();

  expectValidationError(
    () =>
      engine.evaluate(
        buildInput("pricing_quote_change", {
          profilePack: "unknown_pack",
        })
      ),
    "INVALID_PROFILE_PACK",
    "'profilePack' must be one of: pricing_quote_change, form_customer_data_flow, protected_destructive_operation"
  );
});

test("Negative control: findings include no score/confidence/rank or board/grouping fields", () => {
  const engine = new OmissionCoverageEngine();
  const observedExpectedItems = expectedItemsForPack("pricing_quote_change").filter(
    (item) => item !== "QUOTE_CHANGE_APPLIED"
  );

  const result = engine.evaluate(
    buildInput("pricing_quote_change", { observedExpectedItems })
  );

  assert.equal(result.findings.length, 1);

  const finding = result.findings[0];
  const forbiddenFields = [
    "confidence",
    "score",
    "rank",
    "priority",
    "anomaly",
    "prediction",
    "boardGroup",
    "boardColumn",
    "boardLane",
  ];

  for (const field of forbiddenFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(finding, field), false);
  }
});

test("Negative control: runtime exposes no persistence/write behavior", () => {
  const engine = new OmissionCoverageEngine();
  const methodNames = Object.getOwnPropertyNames(OmissionCoverageEngine.prototype).sort();

  assert.deepEqual(methodNames, ["constructor", "evaluate"]);
  assert.equal(typeof engine.upsertEntry, "undefined");
  assert.equal(typeof engine.persist, "undefined");
});
