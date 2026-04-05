"use strict";

const { ControlRodMode, STARTER_DOMAIN_IDS } = require("./ControlRodMode");

const WORK_ORDER_POSTURE_STATUSES = Object.freeze(["ready", "hold"]);
const WORK_ORDER_POSTURE_HOLD_REASONS = Object.freeze([
  "INTAKE_MISSING",
  "INTAKE_DEFERRED",
]);
const WORK_ORDER_POSTURE_PROTECTION_BASIS = Object.freeze([
  "doctrine",
  "doctrine_with_evidence",
]);
const WORK_ORDER_POSTURE_SOURCE = "work_order_posture_engine";
const WORK_ORDER_POSTURE_RECOMMENDED_PROFILE_ID = "conservative";
const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const REQUIRED_INTAKE_FIELDS = Object.freeze([
  "businessName",
  "tradeOrServiceType",
  "serviceArea",
  "contactPath",
  "whatTheyWantBuilt",
  "customerDataTouchpoints",
  "quoteBillingBookingExposure",
]);

const INTAKE_HOLD_REASON_SET = new Set(["MISSING_REQUIRED", "EXPLICITLY_DEFERRED"]);
const INTAKE_STATUS_SET = new Set(["complete", "hold"]);

const INTAKE_FIELD_LABELS = Object.freeze({
  businessName: "business name",
  tradeOrServiceType: "trade or service type",
  serviceArea: "service area",
  contactPath: "contact path",
  whatTheyWantBuilt: "what they want built",
  customerDataTouchpoints: "customer-data touchpoints",
  quoteBillingBookingExposure: "quote, billing, or booking exposure",
});

const DEFAULT_RATIONALES = Object.freeze({
  database_schema:
    "Database schema stays HARD_STOP by doctrine in the Work Order pilot.",
  protected_destructive_ops:
    "Protected / destructive ops stay HARD_STOP by doctrine in the Work Order pilot.",
  auth_security_surfaces:
    "Auth / security surfaces stay HARD_STOP by doctrine in the Work Order pilot.",
  existing_file_modification:
    "Existing file modification stays SUPERVISED under the Work Order pilot default conservative posture.",
  new_file_creation:
    "New file creation stays SUPERVISED under the Work Order pilot default conservative posture.",
  ui_styling_content:
    "UI / styling / content stays SUPERVISED under the Work Order pilot default conservative posture.",
  documentation_comments:
    "Documentation / comments stay FULL_AUTO under the Work Order pilot default conservative posture.",
  test_files:
    "Test files stay SUPERVISED under the Work Order pilot default conservative posture.",
});

const OVERRIDE_INSTRUCTIONS = Object.freeze([
  "Review this default conservative posture map with the operator before any build starts.",
  "Ask whether the customer-data and quote/billing/booking protections look right for this Work Order.",
  "If the operator wants changes, capture them as proposed overrides for later build setup, but do not apply them in this step.",
]);

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

    if (!INTAKE_HOLD_REASON_SET.has(hold.reason)) {
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

function cloneStringArray(values) {
  return [...values];
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

  if (!INTAKE_STATUS_SET.has(input.status)) {
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
  const unresolvedRequiredFields = [];

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

    unresolvedRequiredFields.push(fieldName);
  }

  if (normalized.status === "complete" && unresolvedRequiredFields.length > 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'status' cannot be 'complete' when required intake fields remain unresolved"
    );
  }

  if (normalized.status === "hold" && unresolvedRequiredFields.length === 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'status' cannot be 'hold' when all required intake fields are resolved"
    );
  }

  return {
    normalized,
    holdByField,
  };
}

function buildProfileRationale(postureHolds) {
  if (postureHolds.length > 0) {
    return "The Work Order pilot always defaults to the conservative profile in v1. One or more governance-exposure fields are unconfirmed, so the map stays on doctrinal defaults and surfaces HOLDs for operator review without changing autonomy levels.";
  }

  return "The Work Order pilot always defaults to the conservative profile in v1. Intake evidence makes customer-data and quote/billing/booking protections more visible, but it does not change the 10-domain autonomy map.";
}

function buildPostureHold(fieldName, reason) {
  const label = INTAKE_FIELD_LABELS[fieldName];

  if (reason === "INTAKE_DEFERRED") {
    return {
      field: fieldName,
      reason,
      summary: `Posture evidence is incomplete because intake field '${label}' was explicitly deferred.`,
    };
  }

  return {
    field: fieldName,
    reason: "INTAKE_MISSING",
    summary: `Posture evidence is incomplete until intake field '${label}' is supplied.`,
  };
}

function buildCustomerDataEntry(rule, intake) {
  if (intake.customerDataTouchpoints !== null) {
    return {
      domainId: rule.domainId,
      domainLabel: rule.label,
      autonomyLevel: rule.autonomyLevel,
      rationale: `Customer-data touchpoints were explicitly identified as ${intake.customerDataTouchpoints}. Customer data / PII remains HARD_STOP under the default conservative posture.`,
      intakeEvidence: ["customerDataTouchpoints"],
      protectionBasis: "doctrine_with_evidence",
      isDefault: false,
    };
  }

  return {
    domainId: rule.domainId,
    domainLabel: rule.label,
    autonomyLevel: rule.autonomyLevel,
    rationale:
      "Customer-data touchpoints are unconfirmed in intake. Customer data / PII stays HARD_STOP by doctrine until the operator reviews it.",
    intakeEvidence: [],
    protectionBasis: "doctrine",
    isDefault: true,
  };
}

function buildPricingEntry(rule, intake) {
  if (intake.quoteBillingBookingExposure !== null) {
    return {
      domainId: rule.domainId,
      domainLabel: rule.label,
      autonomyLevel: rule.autonomyLevel,
      rationale: `Quote, billing, or booking exposure was explicitly identified as ${intake.quoteBillingBookingExposure}. Pricing / quote logic remains HARD_STOP under the default conservative posture.`,
      intakeEvidence: ["quoteBillingBookingExposure"],
      protectionBasis: "doctrine_with_evidence",
      isDefault: false,
    };
  }

  return {
    domainId: rule.domainId,
    domainLabel: rule.label,
    autonomyLevel: rule.autonomyLevel,
    rationale:
      "Quote, billing, or booking exposure is unconfirmed in intake. Pricing / quote logic stays HARD_STOP by doctrine until the operator reviews it.",
    intakeEvidence: [],
    protectionBasis: "doctrine",
    isDefault: true,
  };
}

function buildDefaultEntry(rule) {
  return {
    domainId: rule.domainId,
    domainLabel: rule.label,
    autonomyLevel: rule.autonomyLevel,
    rationale: DEFAULT_RATIONALES[rule.domainId],
    intakeEvidence: [],
    protectionBasis: "doctrine",
    isDefault: true,
  };
}

function buildDomainPosture(rule, intake) {
  if (rule.domainId === "customer_data_pii") {
    return buildCustomerDataEntry(rule, intake);
  }

  if (rule.domainId === "pricing_quote_logic") {
    return buildPricingEntry(rule, intake);
  }

  return buildDefaultEntry(rule);
}

class WorkOrderPostureEngine {
  generate(workOrderIntake) {
    const { normalized, holdByField } = normalizeWorkOrderIntake(workOrderIntake);
    const controlRodMode = new ControlRodMode();
    const profile = controlRodMode.resolveProfile(
      WORK_ORDER_POSTURE_RECOMMENDED_PROFILE_ID
    );

    const postureHolds = [];
    for (const fieldName of [
      "customerDataTouchpoints",
      "quoteBillingBookingExposure",
    ]) {
      if (normalized[fieldName] !== null) {
        continue;
      }

      const intakeHold = holdByField.get(fieldName);
      const reason =
        intakeHold && intakeHold.reason === "EXPLICITLY_DEFERRED"
          ? "INTAKE_DEFERRED"
          : "INTAKE_MISSING";
      postureHolds.push(buildPostureHold(fieldName, reason));
    }

    const domainPosture = profile.domainRules.map((rule) =>
      buildDomainPosture(rule, normalized)
    );

    const protectedDomains = domainPosture
      .filter((entry) => entry.autonomyLevel === "HARD_STOP")
      .map((entry) => entry.domainId);
    const supervisedDomains = domainPosture
      .filter((entry) => entry.autonomyLevel === "SUPERVISED")
      .map((entry) => entry.domainId);
    const permissiveDomains = domainPosture
      .filter((entry) => entry.autonomyLevel === "FULL_AUTO")
      .map((entry) => entry.domainId);

    if (domainPosture.length !== STARTER_DOMAIN_IDS.length) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'domainPosture' must cover the full 10-domain starter baseline"
      );
    }

    return {
      postureId: `work_order_posture_${normalized.intakeId}`,
      intakeRef: normalized.intakeId,
      status: postureHolds.length === 0 ? "ready" : "hold",
      recommendedProfileId: WORK_ORDER_POSTURE_RECOMMENDED_PROFILE_ID,
      profileRationale: buildProfileRationale(postureHolds),
      domainPosture,
      protectedDomains,
      supervisedDomains,
      permissiveDomains,
      overrideInstructions: cloneStringArray(OVERRIDE_INSTRUCTIONS),
      holds: postureHolds.map(cloneHold),
      source: WORK_ORDER_POSTURE_SOURCE,
      createdAt: normalized.createdAt,
    };
  }
}

module.exports = {
  OVERRIDE_INSTRUCTIONS,
  WORK_ORDER_POSTURE_HOLD_REASONS,
  WORK_ORDER_POSTURE_PROTECTION_BASIS,
  WORK_ORDER_POSTURE_RECOMMENDED_PROFILE_ID,
  WORK_ORDER_POSTURE_SOURCE,
  WORK_ORDER_POSTURE_STATUSES,
  WorkOrderPostureEngine,
};