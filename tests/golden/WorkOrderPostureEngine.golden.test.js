"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { STARTER_DOMAIN_IDS } = require("../../src/ControlRodMode");
const {
  OVERRIDE_INSTRUCTIONS,
  WORK_ORDER_POSTURE_HOLD_REASONS,
  WORK_ORDER_POSTURE_PROTECTION_BASIS,
  WORK_ORDER_POSTURE_RECOMMENDED_PROFILE_ID,
  WORK_ORDER_POSTURE_SOURCE,
  WORK_ORDER_POSTURE_STATUSES,
  WorkOrderPostureEngine,
} = require("../../src/WorkOrderPostureEngine");

const CREATED_AT = "2026-04-05T12:10:00Z";

function buildIntake(overrides = {}) {
  return {
    intakeId: "work_order_intake_001",
    status: "complete",
    businessName: "Northside Mechanical",
    tradeOrServiceType: "HVAC service and installation",
    serviceArea: "Tulsa metro",
    contactPath: "Call 918-555-0114 or use the service form",
    whatTheyWantBuilt: "A service website with estimate request and scheduling details.",
    exclusions: "Do not add financing, login, or a customer portal yet.",
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

function autonomyMap(posture) {
  return Object.fromEntries(
    posture.domainPosture.map((entry) => [entry.domainId, entry.autonomyLevel])
  );
}

function findDomain(posture, domainId) {
  return posture.domainPosture.find((entry) => entry.domainId === domainId);
}

test("WorkOrderPostureEngine locks statuses, HOLD reasons, protection basis, and profile recommendation", () => {
  assert.deepEqual([...WORK_ORDER_POSTURE_STATUSES], ["ready", "hold"]);
  assert.deepEqual([...WORK_ORDER_POSTURE_HOLD_REASONS], [
    "INTAKE_MISSING",
    "INTAKE_DEFERRED",
  ]);
  assert.deepEqual([...WORK_ORDER_POSTURE_PROTECTION_BASIS], [
    "doctrine",
    "doctrine_with_evidence",
  ]);
  assert.equal(WORK_ORDER_POSTURE_RECOMMENDED_PROFILE_ID, "conservative");
});

test("WorkOrderPostureEngine returns a visible protection map for a complete intake", () => {
  const engine = new WorkOrderPostureEngine();
  const posture = engine.generate(buildIntake());

  assert.equal(posture.postureId, "work_order_posture_work_order_intake_001");
  assert.equal(posture.intakeRef, "work_order_intake_001");
  assert.equal(posture.status, "ready");
  assert.equal(posture.recommendedProfileId, "conservative");
  assert.equal(posture.source, WORK_ORDER_POSTURE_SOURCE);
  assert.match(posture.profileRationale, /always defaults to the conservative profile/);
  assert.deepEqual(
    posture.domainPosture.map((entry) => entry.domainId),
    [...STARTER_DOMAIN_IDS]
  );
  assert.deepEqual(posture.protectedDomains, [
    "pricing_quote_logic",
    "customer_data_pii",
    "database_schema",
    "protected_destructive_ops",
    "auth_security_surfaces",
  ]);
  assert.deepEqual(posture.supervisedDomains, [
    "existing_file_modification",
    "new_file_creation",
    "ui_styling_content",
    "test_files",
  ]);
  assert.deepEqual(posture.permissiveDomains, ["documentation_comments"]);
  assert.deepEqual(posture.overrideInstructions, [...OVERRIDE_INSTRUCTIONS]);
  assert.deepEqual(posture.holds, []);

  const customer = findDomain(posture, "customer_data_pii");
  assert.equal(customer.autonomyLevel, "HARD_STOP");
  assert.equal(customer.protectionBasis, "doctrine_with_evidence");
  assert.deepEqual(customer.intakeEvidence, ["customerDataTouchpoints"]);
  assert.equal(customer.isDefault, false);

  const pricing = findDomain(posture, "pricing_quote_logic");
  assert.equal(pricing.autonomyLevel, "HARD_STOP");
  assert.equal(pricing.protectionBasis, "doctrine_with_evidence");
  assert.deepEqual(pricing.intakeEvidence, ["quoteBillingBookingExposure"]);
  assert.equal(pricing.isDefault, false);
});

test("WorkOrderPostureEngine changes rationale, evidence, and HOLDs only for the two governance-exposure fields", () => {
  const engine = new WorkOrderPostureEngine();
  const posture = engine.generate(
    buildIntake({
      status: "hold",
      customerDataTouchpoints: null,
      quoteBillingBookingExposure: null,
      holds: [
        {
          field: "customerDataTouchpoints",
          reason: "MISSING_REQUIRED",
          summary: "Missing required intake field: customer-data touchpoints.",
        },
        {
          field: "quoteBillingBookingExposure",
          reason: "EXPLICITLY_DEFERRED",
          summary:
            "Operator explicitly deferred required intake field: quote, billing, or booking exposure.",
        },
      ],
    })
  );

  assert.equal(posture.status, "hold");
  assert.deepEqual(posture.holds, [
    {
      field: "customerDataTouchpoints",
      reason: "INTAKE_MISSING",
      summary:
        "Posture evidence is incomplete until intake field 'customer-data touchpoints' is supplied.",
    },
    {
      field: "quoteBillingBookingExposure",
      reason: "INTAKE_DEFERRED",
      summary:
        "Posture evidence is incomplete because intake field 'quote, billing, or booking exposure' was explicitly deferred.",
    },
  ]);

  const customer = findDomain(posture, "customer_data_pii");
  assert.equal(customer.autonomyLevel, "HARD_STOP");
  assert.equal(customer.protectionBasis, "doctrine");
  assert.deepEqual(customer.intakeEvidence, []);
  assert.equal(customer.isDefault, true);
  assert.match(customer.rationale, /unconfirmed in intake/);

  const pricing = findDomain(posture, "pricing_quote_logic");
  assert.equal(pricing.autonomyLevel, "HARD_STOP");
  assert.equal(pricing.protectionBasis, "doctrine");
  assert.deepEqual(pricing.intakeEvidence, []);
  assert.equal(pricing.isDefault, true);
  assert.match(pricing.rationale, /unconfirmed in intake/);

  const schema = findDomain(posture, "database_schema");
  assert.equal(schema.autonomyLevel, "HARD_STOP");
  assert.equal(schema.protectionBasis, "doctrine");
  assert.deepEqual(schema.intakeEvidence, []);
  assert.equal(schema.isDefault, true);
});

test("WorkOrderPostureEngine keeps the same 10-domain autonomy map and conservative recommendation across intake combinations", () => {
  const engine = new WorkOrderPostureEngine();
  const complete = engine.generate(buildIntake());
  const missingCustomer = engine.generate(
    buildIntake({
      status: "hold",
      customerDataTouchpoints: null,
      holds: [
        {
          field: "customerDataTouchpoints",
          reason: "MISSING_REQUIRED",
          summary: "Missing required intake field: customer-data touchpoints.",
        },
      ],
    })
  );
  const missingPricing = engine.generate(
    buildIntake({
      status: "hold",
      quoteBillingBookingExposure: null,
      holds: [
        {
          field: "quoteBillingBookingExposure",
          reason: "MISSING_REQUIRED",
          summary: "Missing required intake field: quote, billing, or booking exposure.",
        },
      ],
    })
  );

  const expectedMap = {
    pricing_quote_logic: "HARD_STOP",
    customer_data_pii: "HARD_STOP",
    database_schema: "HARD_STOP",
    protected_destructive_ops: "HARD_STOP",
    auth_security_surfaces: "HARD_STOP",
    existing_file_modification: "SUPERVISED",
    new_file_creation: "SUPERVISED",
    ui_styling_content: "SUPERVISED",
    documentation_comments: "FULL_AUTO",
    test_files: "SUPERVISED",
  };

  for (const posture of [complete, missingCustomer, missingPricing]) {
    assert.equal(posture.recommendedProfileId, "conservative");
    assert.deepEqual(autonomyMap(posture), expectedMap);
    assert.deepEqual(posture.protectedDomains, complete.protectedDomains);
    assert.deepEqual(posture.supervisedDomains, complete.supervisedDomains);
    assert.deepEqual(posture.permissiveDomains, complete.permissiveDomains);
  }
});

test("WorkOrderPostureEngine ignores exclusions and exposes no hidden rod or execution behavior", () => {
  const engine = new WorkOrderPostureEngine();
  const baseInput = buildIntake();
  const withExclusions = buildIntake({
    exclusions:
      "Do not add auth, login, passwords, account recovery, or security changes yet.",
  });

  const first = engine.generate(baseInput);
  first.domainPosture[0].rationale = "mutated";
  first.holds.push({
    field: "customerDataTouchpoints",
    reason: "INTAKE_MISSING",
    summary: "bad",
  });

  const second = engine.generate(baseInput);
  const third = engine.generate(withExclusions);

  assert.notEqual(second.domainPosture[0].rationale, "mutated");
  assert.deepEqual(second.holds, []);
  assert.deepEqual(second, third);

  const methodNames = Object.getOwnPropertyNames(WorkOrderPostureEngine.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "generate"]);
  assert.equal(typeof engine.deriveProfile, "undefined");
  assert.equal(typeof engine.selectProfile, "undefined");
  assert.equal(typeof engine.applyOverride, "undefined");
  assert.equal(typeof engine.writeSettings, "undefined");
  assert.equal(typeof engine.startSession, "undefined");
  assert.equal(typeof engine.execute, "undefined");
  assert.equal(typeof engine.learnFromWorkOrders, "undefined");
});

test("WorkOrderPostureEngine rejects contradictory complete intake input", () => {
  const engine = new WorkOrderPostureEngine();

  expectValidationError(
    () =>
      engine.generate(
        buildIntake({
          status: "complete",
          customerDataTouchpoints: null,
          holds: [],
        })
      ),
    "INVALID_FIELD",
    "'status' cannot be 'complete' when required intake fields remain unresolved"
  );
});