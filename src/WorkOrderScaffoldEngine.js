"use strict";

const WORK_ORDER_SCAFFOLD_STATUSES = Object.freeze(["ready", "hold"]);
const WORK_ORDER_SCAFFOLD_HOLD_REASONS = Object.freeze([
  "INTAKE_MISSING",
  "INTAKE_DEFERRED",
]);
const WORK_ORDER_INTAKE_STATUSES = new Set(["complete", "hold"]);
const WORK_ORDER_INTAKE_HOLD_REASONS = new Set([
  "MISSING_REQUIRED",
  "EXPLICITLY_DEFERRED",
]);
const REQUIRED_INTAKE_FIELDS = Object.freeze([
  "businessName",
  "tradeOrServiceType",
  "serviceArea",
  "contactPath",
  "whatTheyWantBuilt",
  "customerDataTouchpoints",
  "quoteBillingBookingExposure",
]);
const STRUCTURAL_ANTI_GOALS = Object.freeze([
  "Do not begin execution from this scaffold alone.",
  "Do not silently shift from planning to implementation.",
  "Do not add features, integrations, or scope beyond what is explicitly listed.",
]);
const STRUCTURAL_DO_NOT_SHIP = Object.freeze([
  "Ship is blocked if any INTAKE_MISSING HOLD remains unresolved.",
  "Ship is blocked if scope items were added that are not traced to intake.",
  "Ship is blocked if this scaffold is treated as an execution trigger.",
]);
const SCAFFOLD_SOURCE = "work_order_scaffold_engine";
const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const INTAKE_FIELD_LABELS = Object.freeze({
  businessName: "business name",
  tradeOrServiceType: "trade or service type",
  serviceArea: "service area",
  contactPath: "contact path",
  whatTheyWantBuilt: "what they want built",
  customerDataTouchpoints: "customer-data touchpoints",
  quoteBillingBookingExposure: "quote, billing, or booking exposure",
});

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIso8601Timestamp(value) {
  if (typeof value !== "string" || !ISO_8601_PATTERN.test(value)) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function assertRequiredString(input, fieldName) {
  if (typeof input[fieldName] !== "string" || input[fieldName].trim() === "") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a non-empty string`
    );
  }
}

function normalizeNullableString(input, fieldName) {
  if (input[fieldName] === undefined || input[fieldName] === null) {
    return null;
  }

  if (typeof input[fieldName] !== "string") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a string or null when provided`
    );
  }

  const trimmed = input[fieldName].trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeIntakeHolds(value) {
  if (!Array.isArray(value)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'holds' must be an array of intake hold objects"
    );
  }

  const allowedFields = new Set(REQUIRED_INTAKE_FIELDS);
  const holds = [];
  const seen = new Set();

  for (const hold of value) {
    if (!isPlainObject(hold)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'holds' must contain only intake hold objects"
      );
    }

    assertRequiredString(hold, "field");
    assertRequiredString(hold, "reason");
    assertRequiredString(hold, "summary");

    if (!allowedFields.has(hold.field)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'holds.field' must be one of: ${REQUIRED_INTAKE_FIELDS.join(", ")}`
      );
    }

    if (!WORK_ORDER_INTAKE_HOLD_REASONS.has(hold.reason)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'holds.reason' must be one of: MISSING_REQUIRED, EXPLICITLY_DEFERRED"
      );
    }

    if (seen.has(hold.field)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'holds' cannot contain duplicate field '${hold.field}'`
      );
    }

    seen.add(hold.field);
    holds.push({
      field: hold.field,
      reason: hold.reason,
      summary: hold.summary.trim(),
    });
  }

  return holds;
}

function placeholder(fieldName) {
  return `[HOLD: ${fieldName}]`;
}

function valueOrPlaceholder(value, fieldName) {
  return value === null ? placeholder(fieldName) : value;
}

function buildScaffoldHold(fieldName, reason) {
  const label = INTAKE_FIELD_LABELS[fieldName];

  if (reason === "INTAKE_DEFERRED") {
    return {
      field: fieldName,
      reason,
      summary: `Scaffold remains blocked because intake field '${label}' was explicitly deferred.`,
    };
  }

  return {
    field: fieldName,
    reason: "INTAKE_MISSING",
    summary: `Scaffold remains blocked until intake field '${label}' is supplied.`,
  };
}

function cloneHold(hold) {
  return {
    field: hold.field,
    reason: hold.reason,
    summary: hold.summary,
  };
}

function normalizeWorkOrderIntake(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'workOrderIntake' must be an object"
    );
  }

  assertRequiredString(input, "intakeId");
  assertRequiredString(input, "status");
  assertRequiredString(input, "source");
  assertRequiredString(input, "createdAt");

  if (!WORK_ORDER_INTAKE_STATUSES.has(input.status)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'status' must be one of: complete, hold"
    );
  }

  if (!isIso8601Timestamp(input.createdAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'createdAt' must be an ISO 8601 timestamp"
    );
  }

  const normalized = {
    intakeId: input.intakeId.trim(),
    status: input.status,
    businessName: normalizeNullableString(input, "businessName"),
    tradeOrServiceType: normalizeNullableString(input, "tradeOrServiceType"),
    serviceArea: normalizeNullableString(input, "serviceArea"),
    contactPath: normalizeNullableString(input, "contactPath"),
    whatTheyWantBuilt: normalizeNullableString(input, "whatTheyWantBuilt"),
    exclusions: normalizeNullableString(input, "exclusions"),
    customerDataTouchpoints: normalizeNullableString(input, "customerDataTouchpoints"),
    quoteBillingBookingExposure: normalizeNullableString(
      input,
      "quoteBillingBookingExposure"
    ),
    source: input.source.trim(),
    createdAt: input.createdAt,
    holds: normalizeIntakeHolds(input.holds),
  };

  const holdByField = new Map(normalized.holds.map((hold) => [hold.field, hold]));
  const scaffoldHolds = [];

  for (const fieldName of REQUIRED_INTAKE_FIELDS) {
    const value = normalized[fieldName];
    const intakeHold = holdByField.get(fieldName);

    if (value !== null) {
      if (intakeHold) {
        throw makeValidationError(
          "INVALID_FIELD",
          `'holds' cannot include '${fieldName}' when that field already has a value`
        );
      }
      continue;
    }

    const nextReason =
      intakeHold && intakeHold.reason === "EXPLICITLY_DEFERRED"
        ? "INTAKE_DEFERRED"
        : "INTAKE_MISSING";
    scaffoldHolds.push(buildScaffoldHold(fieldName, nextReason));
  }

  if (normalized.status === "complete" && scaffoldHolds.length > 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'status' cannot be 'complete' when required intake fields remain unresolved"
    );
  }

  if (normalized.status === "hold" && scaffoldHolds.length === 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'status' cannot be 'hold' when all required intake fields are resolved"
    );
  }

  return {
    normalized,
    scaffoldHolds,
  };
}

function buildGoal(intake) {
  return [
    "Plan a governed build for",
    valueOrPlaceholder(intake.businessName, "businessName"),
    "as a",
    valueOrPlaceholder(intake.tradeOrServiceType, "tradeOrServiceType"),
    "business serving",
    valueOrPlaceholder(intake.serviceArea, "serviceArea"),
    "with primary requested work:",
    valueOrPlaceholder(intake.whatTheyWantBuilt, "whatTheyWantBuilt"),
  ].join(" ");
}

function buildScope(intake) {
  return [
    `Business and trade in scope: ${valueOrPlaceholder(
      intake.businessName,
      "businessName"
    )} as ${valueOrPlaceholder(
      intake.tradeOrServiceType,
      "tradeOrServiceType"
    )}.`,
    `Service area in scope: ${valueOrPlaceholder(
      intake.serviceArea,
      "serviceArea"
    )}.`,
    `Primary customer contact path in scope: ${valueOrPlaceholder(
      intake.contactPath,
      "contactPath"
    )}.`,
    `Requested build in scope: ${valueOrPlaceholder(
      intake.whatTheyWantBuilt,
      "whatTheyWantBuilt"
    )}.`,
    `Customer-data touchpoints in scope: ${valueOrPlaceholder(
      intake.customerDataTouchpoints,
      "customerDataTouchpoints"
    )}.`,
    `Quote, billing, and booking exposure in scope: ${valueOrPlaceholder(
      intake.quoteBillingBookingExposure,
      "quoteBillingBookingExposure"
    )}.`,
  ];
}

function buildAntiGoals(intake) {
  const antiGoals = [...STRUCTURAL_ANTI_GOALS];

  antiGoals.push(
    `Do not assume customer-data handling beyond ${valueOrPlaceholder(
      intake.customerDataTouchpoints,
      "customerDataTouchpoints"
    )}.`
  );
  antiGoals.push(
    `Do not assume quote, billing, or booking work beyond ${valueOrPlaceholder(
      intake.quoteBillingBookingExposure,
      "quoteBillingBookingExposure"
    )}.`
  );

  if (intake.exclusions) {
    antiGoals.push(`Do not include the explicitly excluded work: ${intake.exclusions}.`);
  }

  return antiGoals;
}

function buildAcceptanceCriteria(intake) {
  const acceptanceCriteria = [
    `The scaffold goal names ${valueOrPlaceholder(
      intake.businessName,
      "businessName"
    )} as a ${valueOrPlaceholder(
      intake.tradeOrServiceType,
      "tradeOrServiceType"
    )} build target and states the requested work as ${valueOrPlaceholder(
      intake.whatTheyWantBuilt,
      "whatTheyWantBuilt"
    )}.`,
    `The scaffold scope explicitly covers service area ${valueOrPlaceholder(
      intake.serviceArea,
      "serviceArea"
    )} and customer contact path ${valueOrPlaceholder(
      intake.contactPath,
      "contactPath"
    )}.`,
    `The scaffold scope explicitly states customer-data touchpoints as ${valueOrPlaceholder(
      intake.customerDataTouchpoints,
      "customerDataTouchpoints"
    )}.`,
    `The scaffold scope explicitly states quote, billing, and booking exposure as ${valueOrPlaceholder(
      intake.quoteBillingBookingExposure,
      "quoteBillingBookingExposure"
    )}.`,
    "The scaffold remains planning-only and does not start execution.",
  ];

  if (intake.exclusions) {
    acceptanceCriteria.push(
      `The scaffold anti-goals explicitly exclude ${intake.exclusions}.`
    );
  }

  return acceptanceCriteria;
}

function buildDoNotShip(intake) {
  const doNotShip = [...STRUCTURAL_DO_NOT_SHIP];

  if (intake.exclusions) {
    doNotShip.push(
      `Ship is blocked if explicitly excluded work is reintroduced without updated intake trace: ${intake.exclusions}.`
    );
  }

  return doNotShip;
}

class WorkOrderScaffoldEngine {
  generate(workOrderIntake) {
    const { normalized, scaffoldHolds } = normalizeWorkOrderIntake(workOrderIntake);
    const status = scaffoldHolds.length === 0 ? "ready" : "hold";

    return {
      scaffoldId: `work_order_scaffold_${normalized.intakeId}`,
      intakeRef: normalized.intakeId,
      status,
      goal: buildGoal(normalized),
      scope: buildScope(normalized),
      antiGoals: buildAntiGoals(normalized),
      acceptanceCriteria: buildAcceptanceCriteria(normalized),
      doNotShip: buildDoNotShip(normalized),
      holds: scaffoldHolds.map(cloneHold),
      source: SCAFFOLD_SOURCE,
      createdAt: normalized.createdAt,
    };
  }
}

module.exports = {
  REQUIRED_INTAKE_FIELDS,
  STRUCTURAL_ANTI_GOALS,
  STRUCTURAL_DO_NOT_SHIP,
  SCAFFOLD_SOURCE,
  WORK_ORDER_SCAFFOLD_HOLD_REASONS,
  WORK_ORDER_SCAFFOLD_STATUSES,
  WorkOrderScaffoldEngine,
};