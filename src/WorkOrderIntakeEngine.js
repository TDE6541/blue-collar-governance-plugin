"use strict";

const WORK_ORDER_INTAKE_STATUSES = Object.freeze(["complete", "hold"]);
const WORK_ORDER_INTAKE_HOLD_REASONS = Object.freeze([
  "MISSING_REQUIRED",
  "EXPLICITLY_DEFERRED",
]);
const REQUIRED_WORK_ORDER_FIELDS = Object.freeze([
  "businessName",
  "tradeOrServiceType",
  "serviceArea",
  "contactPath",
  "whatTheyWantBuilt",
  "customerDataTouchpoints",
  "quoteBillingBookingExposure",
]);
const OPTIONAL_WORK_ORDER_FIELDS = Object.freeze(["exclusions"]);
const DEFAULT_INTAKE_SOURCE = "claude_structured_input";
const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const REQUIRED_FIELD_LABELS = Object.freeze({
  businessName: "business name",
  tradeOrServiceType: "trade or service type",
  serviceArea: "service area",
  contactPath: "contact path",
  whatTheyWantBuilt: "what they want built",
  customerDataTouchpoints: "customer-data touchpoints",
  quoteBillingBookingExposure: "quote, billing, or booking exposure",
});

const FOLLOW_UP_QUESTION_BY_FIELD = Object.freeze({
  businessName: "What is the business name?",
  tradeOrServiceType: "What trade or service does the business provide?",
  serviceArea: "What area do they serve?",
  contactPath: "What phone number or contact path should customers use?",
  whatTheyWantBuilt: "What do they want built?",
  customerDataTouchpoints: "What customer information or data will this touch?",
  quoteBillingBookingExposure: "Will this touch quotes, invoices, payments, or booking?",
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

function normalizeExplicitDeferrals(value) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'explicitDeferrals' must be an array of required field names when provided"
    );
  }

  const allowedFields = new Set(REQUIRED_WORK_ORDER_FIELDS);
  const normalized = [];
  const seen = new Set();

  for (const fieldName of value) {
    if (typeof fieldName !== "string" || !allowedFields.has(fieldName)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'explicitDeferrals' must contain only required Work Order intake field names"
      );
    }

    if (!seen.has(fieldName)) {
      seen.add(fieldName);
      normalized.push(fieldName);
    }
  }

  return normalized;
}

function cloneHold(hold) {
  return {
    field: hold.field,
    reason: hold.reason,
    summary: hold.summary,
  };
}

function cloneFollowUpQuestion(question) {
  return {
    field: question.field,
    question: question.question,
  };
}

function buildHold(fieldName, reason) {
  const label = REQUIRED_FIELD_LABELS[fieldName];

  if (reason === "EXPLICITLY_DEFERRED") {
    return {
      field: fieldName,
      reason,
      summary: `Operator explicitly deferred required intake field: ${label}.`,
    };
  }

  return {
    field: fieldName,
    reason: "MISSING_REQUIRED",
    summary: `Missing required intake field: ${label}.`,
  };
}

function buildFollowUpQuestion(fieldName) {
  return {
    field: fieldName,
    question: FOLLOW_UP_QUESTION_BY_FIELD[fieldName],
  };
}

function normalizeEvaluationInput(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'workOrderIntake' must be an object"
    );
  }

  assertRequiredString(input, "intakeId");
  assertRequiredString(input, "createdAt");

  if (!isIso8601Timestamp(input.createdAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'createdAt' must be an ISO 8601 timestamp"
    );
  }

  if (input.source !== undefined) {
    assertRequiredString(input, "source");
  }

  const explicitDeferrals = normalizeExplicitDeferrals(input.explicitDeferrals);
  const explicitDeferralSet = new Set(explicitDeferrals);

  const normalized = {
    intakeId: input.intakeId.trim(),
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
    source: input.source === undefined ? DEFAULT_INTAKE_SOURCE : input.source.trim(),
    createdAt: input.createdAt,
  };

  for (const fieldName of explicitDeferralSet) {
    if (normalized[fieldName] !== null) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'explicitDeferrals' cannot include '${fieldName}' when that field already has a value`
      );
    }
  }

  return {
    normalized,
    explicitDeferralSet,
  };
}

class WorkOrderIntakeEngine {
  evaluate(workOrderIntake) {
    const { normalized, explicitDeferralSet } = normalizeEvaluationInput(workOrderIntake);
    const holds = [];
    const followUpQuestions = [];

    for (const fieldName of REQUIRED_WORK_ORDER_FIELDS) {
      if (normalized[fieldName] !== null) {
        continue;
      }

      const reason = explicitDeferralSet.has(fieldName)
        ? "EXPLICITLY_DEFERRED"
        : "MISSING_REQUIRED";
      holds.push(buildHold(fieldName, reason));
      followUpQuestions.push(buildFollowUpQuestion(fieldName));
    }

    const status = holds.length === 0 ? "complete" : "hold";
    const normalizedIntake = {
      intakeId: normalized.intakeId,
      status,
      businessName: normalized.businessName,
      tradeOrServiceType: normalized.tradeOrServiceType,
      serviceArea: normalized.serviceArea,
      contactPath: normalized.contactPath,
      whatTheyWantBuilt: normalized.whatTheyWantBuilt,
      exclusions: normalized.exclusions,
      customerDataTouchpoints: normalized.customerDataTouchpoints,
      quoteBillingBookingExposure: normalized.quoteBillingBookingExposure,
      holds: holds.map(cloneHold),
      followUpQuestions: followUpQuestions.map(cloneFollowUpQuestion),
      source: normalized.source,
      createdAt: normalized.createdAt,
    };

    return {
      status,
      normalizedIntake,
      holds: holds.map(cloneHold),
      followUpQuestions: followUpQuestions.map(cloneFollowUpQuestion),
    };
  }
}

module.exports = {
  DEFAULT_INTAKE_SOURCE,
  FOLLOW_UP_QUESTION_BY_FIELD,
  OPTIONAL_WORK_ORDER_FIELDS,
  REQUIRED_WORK_ORDER_FIELDS,
  WORK_ORDER_INTAKE_HOLD_REASONS,
  WORK_ORDER_INTAKE_STATUSES,
  WorkOrderIntakeEngine,
};