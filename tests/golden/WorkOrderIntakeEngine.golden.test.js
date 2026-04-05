"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_INTAKE_SOURCE,
  FOLLOW_UP_QUESTION_BY_FIELD,
  REQUIRED_WORK_ORDER_FIELDS,
  WORK_ORDER_INTAKE_HOLD_REASONS,
  WORK_ORDER_INTAKE_STATUSES,
  WorkOrderIntakeEngine,
} = require("../../src/WorkOrderIntakeEngine");

const CREATED_AT = "2026-04-04T23:30:00Z";

function buildIntake(overrides = {}) {
  return {
    intakeId: "work_order_intake_001",
    createdAt: CREATED_AT,
    businessName: "Northside Mechanical",
    tradeOrServiceType: "HVAC service and installation",
    serviceArea: "Tulsa metro",
    contactPath: "Call 918-555-0114 or use the service form",
    whatTheyWantBuilt: "A service website with estimate request and scheduling details.",
    exclusions: "Do not add financing or a customer portal yet.",
    customerDataTouchpoints: "Name, phone, email, address, and service request details.",
    quoteBillingBookingExposure: "Quotes and booking now; invoices and payments later.",
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

test("WorkOrderIntakeEngine locks the required fields, statuses, and HOLD reasons", () => {
  assert.deepEqual([...REQUIRED_WORK_ORDER_FIELDS], [
    "businessName",
    "tradeOrServiceType",
    "serviceArea",
    "contactPath",
    "whatTheyWantBuilt",
    "customerDataTouchpoints",
    "quoteBillingBookingExposure",
  ]);
  assert.deepEqual([...WORK_ORDER_INTAKE_STATUSES], ["complete", "hold"]);
  assert.deepEqual([...WORK_ORDER_INTAKE_HOLD_REASONS], [
    "MISSING_REQUIRED",
    "EXPLICITLY_DEFERRED",
  ]);
});

test("WorkOrderIntakeEngine returns deterministic HOLDs and follow-up questions for missing required fields", () => {
  const engine = new WorkOrderIntakeEngine();
  const result = engine.evaluate(
    buildIntake({
      serviceArea: null,
      contactPath: null,
      customerDataTouchpoints: null,
      quoteBillingBookingExposure: null,
    })
  );

  assert.equal(result.status, "hold");
  assert.equal(result.normalizedIntake.status, "hold");
  assert.deepEqual(
    result.holds.map((hold) => ({ field: hold.field, reason: hold.reason })),
    [
      { field: "serviceArea", reason: "MISSING_REQUIRED" },
      { field: "contactPath", reason: "MISSING_REQUIRED" },
      { field: "customerDataTouchpoints", reason: "MISSING_REQUIRED" },
      {
        field: "quoteBillingBookingExposure",
        reason: "MISSING_REQUIRED",
      },
    ]
  );
  assert.deepEqual(result.followUpQuestions, [
    { field: "serviceArea", question: FOLLOW_UP_QUESTION_BY_FIELD.serviceArea },
    { field: "contactPath", question: FOLLOW_UP_QUESTION_BY_FIELD.contactPath },
    {
      field: "customerDataTouchpoints",
      question: FOLLOW_UP_QUESTION_BY_FIELD.customerDataTouchpoints,
    },
    {
      field: "quoteBillingBookingExposure",
      question: FOLLOW_UP_QUESTION_BY_FIELD.quoteBillingBookingExposure,
    },
  ]);
  assert.equal(
    result.followUpQuestions[3].question,
    "Will this touch quotes, invoices, payments, or booking?"
  );
});

test("WorkOrderIntakeEngine emits EXPLICITLY_DEFERRED only for explicitly deferred required fields", () => {
  const engine = new WorkOrderIntakeEngine();
  const result = engine.evaluate(
    buildIntake({
      contactPath: null,
      explicitDeferrals: ["contactPath"],
    })
  );

  assert.equal(result.status, "hold");
  assert.deepEqual(result.holds, [
    {
      field: "contactPath",
      reason: "EXPLICITLY_DEFERRED",
      summary: "Operator explicitly deferred required intake field: contact path.",
    },
  ]);
  assert.deepEqual(result.followUpQuestions, [
    {
      field: "contactPath",
      question: "What phone number or contact path should customers use?",
    },
  ]);
});

test("WorkOrderIntakeEngine returns status complete for a fully supplied intake", () => {
  const engine = new WorkOrderIntakeEngine();
  const result = engine.evaluate(buildIntake());

  assert.equal(result.status, "complete");
  assert.equal(result.normalizedIntake.status, "complete");
  assert.equal(result.normalizedIntake.source, DEFAULT_INTAKE_SOURCE);
  assert.equal(result.normalizedIntake.businessName, "Northside Mechanical");
  assert.equal(result.normalizedIntake.exclusions, "Do not add financing or a customer portal yet.");
  assert.deepEqual(result.holds, []);
  assert.deepEqual(result.followUpQuestions, []);
});

test("WorkOrderIntakeEngine is deterministic, side-effect free, and has no execution methods", () => {
  const engine = new WorkOrderIntakeEngine();
  const input = buildIntake();

  const first = engine.evaluate(input);
  first.normalizedIntake.businessName = "mutated";
  first.holds.push({ field: "forbidden", reason: "MISSING_REQUIRED", summary: "bad" });

  const second = engine.evaluate(input);

  assert.equal(second.normalizedIntake.businessName, "Northside Mechanical");
  assert.deepEqual(second.holds, []);
  assert.equal(input.businessName, "Northside Mechanical");

  const methodNames = Object.getOwnPropertyNames(WorkOrderIntakeEngine.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "evaluate"]);
  assert.equal(typeof engine.persist, "undefined");
  assert.equal(typeof engine.createSessionBrief, "undefined");
  assert.equal(typeof engine.generateScaffold, "undefined");
  assert.equal(typeof engine.applyProtectionDefaults, "undefined");
});

test("WorkOrderIntakeEngine rejects contradictory explicit deferral input", () => {
  const engine = new WorkOrderIntakeEngine();

  expectValidationError(
    () =>
      engine.evaluate(
        buildIntake({
          explicitDeferrals: ["serviceArea"],
        })
      ),
    "INVALID_FIELD",
    "'explicitDeferrals' cannot include 'serviceArea' when that field already has a value"
  );
});