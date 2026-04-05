"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SCAFFOLD_SOURCE,
  STRUCTURAL_ANTI_GOALS,
  STRUCTURAL_DO_NOT_SHIP,
  WORK_ORDER_SCAFFOLD_HOLD_REASONS,
  WORK_ORDER_SCAFFOLD_STATUSES,
  WorkOrderScaffoldEngine,
} = require("../../src/WorkOrderScaffoldEngine");

const CREATED_AT = "2026-04-05T06:30:00Z";

function buildWorkOrderIntake(overrides = {}) {
  return {
    intakeId: "work_order_intake_001",
    status: "complete",
    businessName: "Northside Mechanical",
    tradeOrServiceType: "HVAC service and installation",
    serviceArea: "Tulsa metro",
    contactPath: "Call 918-555-0114 or use the service form",
    whatTheyWantBuilt: "A service website with estimate request and scheduling details.",
    exclusions: "Do not add financing or a customer portal yet.",
    customerDataTouchpoints: "Name, phone, email, address, and service request details.",
    quoteBillingBookingExposure: "Quotes and booking now; invoices and payments later.",
    holds: [],
    followUpQuestions: [],
    source: "claude_structured_input",
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

test("WorkOrderScaffoldEngine locks the ready/hold statuses and scaffold HOLD reasons", () => {
  assert.deepEqual([...WORK_ORDER_SCAFFOLD_STATUSES], ["ready", "hold"]);
  assert.deepEqual([...WORK_ORDER_SCAFFOLD_HOLD_REASONS], [
    "INTAKE_MISSING",
    "INTAKE_DEFERRED",
  ]);
});

test("WorkOrderScaffoldEngine generates a real governed scaffold from a complete intake", () => {
  const engine = new WorkOrderScaffoldEngine();
  const scaffold = engine.generate(buildWorkOrderIntake());

  assert.equal(scaffold.scaffoldId, "work_order_scaffold_work_order_intake_001");
  assert.equal(scaffold.intakeRef, "work_order_intake_001");
  assert.equal(scaffold.status, "ready");
  assert.equal(scaffold.source, SCAFFOLD_SOURCE);
  assert.match(scaffold.goal, /Northside Mechanical/);
  assert.match(scaffold.goal, /HVAC service and installation/);
  assert.equal(scaffold.scope.length >= 6, true);
  assert.equal(scaffold.antiGoals.includes(STRUCTURAL_ANTI_GOALS[0]), true);
  assert.equal(scaffold.antiGoals.includes(STRUCTURAL_ANTI_GOALS[1]), true);
  assert.equal(scaffold.antiGoals.includes(STRUCTURAL_ANTI_GOALS[2]), true);
  assert.equal(scaffold.acceptanceCriteria.some((item) => item.includes("Tulsa metro")), true);
  assert.equal(scaffold.doNotShip.includes(STRUCTURAL_DO_NOT_SHIP[0]), true);
  assert.equal(scaffold.doNotShip.includes(STRUCTURAL_DO_NOT_SHIP[1]), true);
  assert.deepEqual(scaffold.holds, []);
});

test("WorkOrderScaffoldEngine propagates missing intake fields into scaffold HOLDs and placeholders", () => {
  const engine = new WorkOrderScaffoldEngine();
  const scaffold = engine.generate(
    buildWorkOrderIntake({
      status: "hold",
      serviceArea: null,
      contactPath: null,
      holds: [
        {
          field: "serviceArea",
          reason: "MISSING_REQUIRED",
          summary: "Missing required intake field: service area.",
        },
        {
          field: "contactPath",
          reason: "MISSING_REQUIRED",
          summary: "Missing required intake field: contact path.",
        },
      ],
      followUpQuestions: [
        { field: "serviceArea", question: "What area do they serve?" },
        {
          field: "contactPath",
          question: "What phone number or contact path should customers use?",
        },
      ],
    })
  );

  assert.equal(scaffold.status, "hold");
  assert.deepEqual(scaffold.holds, [
    {
      field: "serviceArea",
      reason: "INTAKE_MISSING",
      summary: "Scaffold remains blocked until intake field 'service area' is supplied.",
    },
    {
      field: "contactPath",
      reason: "INTAKE_MISSING",
      summary: "Scaffold remains blocked until intake field 'contact path' is supplied.",
    },
  ]);
  assert.equal(scaffold.scope.some((item) => item.includes("[HOLD: serviceArea]")), true);
  assert.equal(scaffold.scope.some((item) => item.includes("[HOLD: contactPath]")), true);
  assert.equal(
    scaffold.acceptanceCriteria.some((item) => item.includes("[HOLD: serviceArea]")),
    true
  );
});

test("WorkOrderScaffoldEngine propagates explicitly deferred intake fields without guessing", () => {
  const engine = new WorkOrderScaffoldEngine();
  const scaffold = engine.generate(
    buildWorkOrderIntake({
      status: "hold",
      quoteBillingBookingExposure: null,
      holds: [
        {
          field: "quoteBillingBookingExposure",
          reason: "EXPLICITLY_DEFERRED",
          summary: "Operator explicitly deferred required intake field: quote, billing, or booking exposure.",
        },
      ],
      followUpQuestions: [
        {
          field: "quoteBillingBookingExposure",
          question: "Will this touch quotes, invoices, payments, or booking?",
        },
      ],
    })
  );

  assert.equal(scaffold.status, "hold");
  assert.deepEqual(scaffold.holds, [
    {
      field: "quoteBillingBookingExposure",
      reason: "INTAKE_DEFERRED",
      summary:
        "Scaffold remains blocked because intake field 'quote, billing, or booking exposure' was explicitly deferred.",
    },
  ]);
  assert.equal(
    scaffold.scope.some((item) => item.includes("[HOLD: quoteBillingBookingExposure]")),
    true
  );
});

test("WorkOrderScaffoldEngine is deterministic, side-effect free, and introduces no protection logic", () => {
  const engine = new WorkOrderScaffoldEngine();
  const intake = buildWorkOrderIntake();

  const first = engine.generate(intake);
  first.scope[0] = "mutated";
  first.holds.push({ field: "bad", reason: "INTAKE_MISSING", summary: "bad" });

  const second = engine.generate(intake);

  assert.notEqual(second.scope[0], "mutated");
  assert.deepEqual(second.holds, []);
  assert.equal(intake.businessName, "Northside Mechanical");

  const forbiddenFields = [
    "protectedDomains",
    "controlRodHint",
    "profileHint",
    "protectionDefaults",
    "executionPlan",
    "promptBlob",
  ];

  for (const field of forbiddenFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(second, field), false);
  }

  const methodNames = Object.getOwnPropertyNames(WorkOrderScaffoldEngine.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "generate"]);
  assert.equal(typeof engine.createSessionBrief, "undefined");
  assert.equal(typeof engine.applyProtectionDefaults, "undefined");
  assert.equal(typeof engine.execute, "undefined");
  assert.equal(typeof engine.generateCode, "undefined");
});

test("WorkOrderScaffoldEngine rejects contradictory complete intake input", () => {
  const engine = new WorkOrderScaffoldEngine();

  expectValidationError(
    () =>
      engine.generate(
        buildWorkOrderIntake({
          status: "complete",
          serviceArea: null,
          holds: [],
        })
      ),
    "INVALID_FIELD",
    "'status' cannot be 'complete' when required intake fields remain unresolved"
  );
});