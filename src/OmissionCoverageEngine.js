"use strict";

const PROFILE_PACK_EXPECTED_ITEMS = Object.freeze({
  pricing_quote_change: Object.freeze([
    "REQUEST_CAPTURED",
    "QUOTE_CHANGE_APPLIED",
    "EXCLUSIONS_STATED",
    "BLOCKED_ITEMS_RECORDED",
    "UNRESOLVED_DECISIONS_CAPTURED",
    "VERIFICATION_ARTIFACTS_PRESENT",
    "RECEIPT_COMPLETE",
  ]),
  form_customer_data_flow: Object.freeze([
    "REQUEST_CAPTURED",
    "CUSTOMER_DATA_FLOW_CAPTURED",
    "EXCLUSIONS_STATED",
    "BLOCKED_ITEMS_RECORDED",
    "UNRESOLVED_DECISIONS_CAPTURED",
    "VERIFICATION_ARTIFACTS_PRESENT",
    "RECEIPT_COMPLETE",
  ]),
  protected_destructive_operation: Object.freeze([
    "REQUEST_CAPTURED",
    "PROTECTED_OPERATION_OUTCOME_CAPTURED",
    "EXCLUSIONS_STATED",
    "BLOCKED_ITEMS_RECORDED",
    "UNRESOLVED_DECISIONS_CAPTURED",
    "VERIFICATION_ARTIFACTS_PRESENT",
    "RECEIPT_COMPLETE",
  ]),
});

const PROFILE_PACKS = Object.freeze(Object.keys(PROFILE_PACK_EXPECTED_ITEMS));

const EXPECTED_ITEM_DESCRIPTIONS = Object.freeze({
  REQUEST_CAPTURED: "requested change is explicitly captured",
  QUOTE_CHANGE_APPLIED: "quote change artifact is present",
  CUSTOMER_DATA_FLOW_CAPTURED: "customer-data flow artifact is present",
  PROTECTED_OPERATION_OUTCOME_CAPTURED:
    "protected/destructive operation outcome is recorded",
  EXCLUSIONS_STATED: "exclusions are stated where relevant",
  BLOCKED_ITEMS_RECORDED: "blocked items are recorded when encountered",
  UNRESOLVED_DECISIONS_CAPTURED:
    "unresolved operator decisions are captured",
  VERIFICATION_ARTIFACTS_PRESENT: "verification artifacts are present",
  RECEIPT_COMPLETE: "receipt completeness fields are present",
});

const MISSING_ITEM_CODE_BY_EXPECTED_ITEM = Object.freeze({
  REQUEST_CAPTURED: "MISSING_REQUEST_CAPTURE",
  QUOTE_CHANGE_APPLIED: "MISSING_QUOTE_CHANGE_ARTIFACT",
  CUSTOMER_DATA_FLOW_CAPTURED: "MISSING_CUSTOMER_DATA_FLOW_ARTIFACT",
  PROTECTED_OPERATION_OUTCOME_CAPTURED: "MISSING_OPERATION_OUTCOME_RECORD",
  EXCLUSIONS_STATED: "MISSING_EXCLUSIONS_STATEMENT",
  BLOCKED_ITEMS_RECORDED: "MISSING_BLOCKED_ITEMS_RECORD",
  UNRESOLVED_DECISIONS_CAPTURED: "MISSING_UNRESOLVED_DECISIONS_RECORD",
  VERIFICATION_ARTIFACTS_PRESENT: "MISSING_VERIFICATION_ARTIFACT",
  RECEIPT_COMPLETE: "MISSING_RECEIPT_COMPLETENESS",
});

const MISSING_ITEM_CODES = Object.freeze([
  ...new Set(Object.values(MISSING_ITEM_CODE_BY_EXPECTED_ITEM)),
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

function assertRequiredString(input, fieldName) {
  if (typeof input[fieldName] !== "string" || input[fieldName].trim() === "") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a non-empty string`
    );
  }
}

function assertStringArray(value, fieldName, allowEmpty = false) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be ${allowEmpty ? "an array" : "a non-empty array"} of strings`
    );
  }

  if (value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be ${allowEmpty ? "an array" : "a non-empty array"} of strings`
    );
  }
}

function normalizeEvaluationInput(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "omission coverage input must be an object"
    );
  }

  assertRequiredString(input, "profilePack");
  assertRequiredString(input, "sessionId");

  if (!PROFILE_PACKS.includes(input.profilePack)) {
    throw makeValidationError(
      "INVALID_PROFILE_PACK",
      `'profilePack' must be one of: ${PROFILE_PACKS.join(", ")}`
    );
  }

  assertStringArray(input.observedExpectedItems, "observedExpectedItems", true);
  assertStringArray(input.observationRefs, "observationRefs", false);

  for (const expectedItem of input.observedExpectedItems) {
    if (!Object.prototype.hasOwnProperty.call(EXPECTED_ITEM_DESCRIPTIONS, expectedItem)) {
      throw makeValidationError(
        "INVALID_EXPECTED_ITEM",
        `'observedExpectedItems' contains unsupported item '${expectedItem}'`
      );
    }
  }

  return {
    profilePack: input.profilePack,
    sessionId: input.sessionId,
    observedExpectedItems: [...new Set(input.observedExpectedItems)],
    observationRefs: [...new Set(input.observationRefs)],
  };
}

function buildFinding(profilePack, missingExpectedItem, observationRefs) {
  return {
    profilePack,
    missingExpectedItem,
    missingItemCode: MISSING_ITEM_CODE_BY_EXPECTED_ITEM[missingExpectedItem],
    summary: `Missing expected output for '${profilePack}': ${EXPECTED_ITEM_DESCRIPTIONS[missingExpectedItem]}.`,
    evidenceRefs: [...observationRefs],
  };
}

class OmissionCoverageEngine {
  evaluate(input) {
    const normalizedInput = normalizeEvaluationInput(input);
    const requiredExpectedItems = PROFILE_PACK_EXPECTED_ITEMS[normalizedInput.profilePack];
    const observedSet = new Set(normalizedInput.observedExpectedItems);
    const findings = [];

    for (const expectedItem of requiredExpectedItems) {
      if (!observedSet.has(expectedItem)) {
        findings.push(
          buildFinding(
            normalizedInput.profilePack,
            expectedItem,
            normalizedInput.observationRefs
          )
        );
      }
    }

    return {
      profilePack: normalizedInput.profilePack,
      sessionId: normalizedInput.sessionId,
      findings,
    };
  }
}

module.exports = {
  OmissionCoverageEngine,
  PROFILE_PACKS,
  PROFILE_PACK_EXPECTED_ITEMS,
  MISSING_ITEM_CODE_BY_EXPECTED_ITEM,
  MISSING_ITEM_CODES,
};
