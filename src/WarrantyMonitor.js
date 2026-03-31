"use strict";

const { TRUST_LEVELS, DECISION_TYPES } = require("./OperatorTrustLedger");

const TRUST_LEVEL_SET = new Set(TRUST_LEVELS);
const DECISION_TYPE_SET = new Set(DECISION_TYPES);
const WARRANTY_STATES = Object.freeze(["HEALTHY", "WATCH", "DEGRADED", "EXPIRED"]);
const WARRANTY_STATE_SET = new Set(WARRANTY_STATES);

const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

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

function assertRequiredBoolean(input, fieldName) {
  if (typeof input[fieldName] !== "boolean") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a boolean`
    );
  }
}

function assertStringArray(values, fieldName, { nonEmpty = false } = {}) {
  if (
    !Array.isArray(values) ||
    values.some((entry) => typeof entry !== "string" || entry.trim() === "")
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an array of non-empty strings`
    );
  }

  if (nonEmpty && values.length === 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a non-empty array of strings`
    );
  }
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function normalizeDecisionHistoryEntry(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'decisionHistory' entries must be objects"
    );
  }

  assertRequiredString(input, "decisionType");

  if (!DECISION_TYPE_SET.has(input.decisionType)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'decisionType' must be one of: ${DECISION_TYPES.join(", ")}`
    );
  }

  assertStringArray(input.forensicReferenceIds || [], "forensicReferenceIds");

  return {
    decisionType: input.decisionType,
    forensicReferenceIds: uniqueStrings([...(input.forensicReferenceIds || [])]),
  };
}

function normalizeTrustState(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'operatorTrustStates' entries must be objects"
    );
  }

  assertRequiredString(input, "operatorKey");
  assertRequiredString(input, "currentLevel");

  if (!TRUST_LEVEL_SET.has(input.currentLevel)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'currentLevel' must be one of: ${TRUST_LEVELS.join(", ")}`
    );
  }

  if (!Array.isArray(input.decisionHistory)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'decisionHistory' must be an array"
    );
  }

  return {
    operatorKey: input.operatorKey,
    currentLevel: input.currentLevel,
    decisionHistory: input.decisionHistory.map(normalizeDecisionHistoryEntry),
  };
}

function normalizeWarrantySignal(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'warrantySignals' entries must be objects"
    );
  }

  assertRequiredString(input, "operatorKey");
  assertRequiredBoolean(input, "degradationObserved");
  assertRequiredBoolean(input, "outOfBandChangeDetected");
  assertRequiredBoolean(input, "coverageExpired");

  const evidenceRefs = input.evidenceRefs || [];
  assertStringArray(evidenceRefs, "evidenceRefs");

  if (
    (input.degradationObserved || input.outOfBandChangeDetected || input.coverageExpired) &&
    evidenceRefs.length === 0
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'evidenceRefs' must be a non-empty array of strings when any warranty signal is true"
    );
  }

  return {
    operatorKey: input.operatorKey,
    degradationObserved: input.degradationObserved,
    outOfBandChangeDetected: input.outOfBandChangeDetected,
    coverageExpired: input.coverageExpired,
    evidenceRefs: uniqueStrings(evidenceRefs),
  };
}

function deriveWarrantyState(input) {
  if (input.coverageExpired) {
    return {
      warrantyState: "EXPIRED",
      rationale: "Coverage-expired signal is true; derived warranty state is EXPIRED.",
    };
  }

  if (input.degradationObserved && (input.hasRecentRegression || input.outOfBandChangeDetected)) {
    return {
      warrantyState: "DEGRADED",
      rationale:
        "Degradation is observed with regression or out-of-band change evidence; derived warranty state is DEGRADED.",
    };
  }

  if (input.degradationObserved || input.outOfBandChangeDetected || input.hasRecentRegression) {
    return {
      warrantyState: "WATCH",
      rationale:
        "At least one warning signal is present; derived warranty state is WATCH.",
    };
  }

  return {
    warrantyState: "HEALTHY",
    rationale: "No warning signals are present; derived warranty state is HEALTHY.",
  };
}

class WarrantyMonitor {
  deriveWarrantyViews(operatorTrustStates, input = {}) {
    if (!Array.isArray(operatorTrustStates)) {
      throw makeValidationError(
        "INVALID_INPUT",
        "'operatorTrustStates' must be an array"
      );
    }

    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_INPUT",
        "'input' must be an object when provided"
      );
    }

    assertRequiredString(input, "evaluatedAt");
    if (!isIso8601Timestamp(input.evaluatedAt)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'evaluatedAt' must be an ISO 8601 timestamp"
      );
    }

    if (!Array.isArray(input.warrantySignals)) {
      throw makeValidationError(
        "INVALID_INPUT",
        "'warrantySignals' must be an array"
      );
    }

    const normalizedSignalsByOperatorKey = new Map();
    for (const signalInput of input.warrantySignals) {
      const signal = normalizeWarrantySignal(signalInput);
      normalizedSignalsByOperatorKey.set(signal.operatorKey, signal);
    }

    const derived = [];

    for (const trustStateInput of operatorTrustStates) {
      const trustState = normalizeTrustState(trustStateInput);
      const signal = normalizedSignalsByOperatorKey.get(trustState.operatorKey);

      const latestDecision =
        trustState.decisionHistory.length > 0
          ? trustState.decisionHistory[trustState.decisionHistory.length - 1]
          : null;

      const hasRecentRegression =
        latestDecision !== null && latestDecision.decisionType === "REGRESSION";

      const regressionEvidenceRefs = hasRecentRegression
        ? [...latestDecision.forensicReferenceIds]
        : [];

      const degradationObserved = signal ? signal.degradationObserved : false;
      const outOfBandChangeDetected = signal ? signal.outOfBandChangeDetected : false;
      const coverageExpired = signal ? signal.coverageExpired : false;
      const signalEvidenceRefs = signal ? [...signal.evidenceRefs] : [];

      const evidenceRefs = uniqueStrings([
        ...regressionEvidenceRefs,
        ...signalEvidenceRefs,
      ]);

      const resolved = deriveWarrantyState({
        hasRecentRegression,
        degradationObserved,
        outOfBandChangeDetected,
        coverageExpired,
      });

      if (!WARRANTY_STATE_SET.has(resolved.warrantyState)) {
        throw makeValidationError(
          "INVALID_DERIVED_STATE",
          `unsupported derived state '${resolved.warrantyState}'`
        );
      }

      if (resolved.warrantyState !== "HEALTHY" && evidenceRefs.length === 0) {
        throw makeValidationError(
          "INVALID_DERIVATION",
          "non-healthy warranty states require at least one evidence ref"
        );
      }

      derived.push({
        operatorKey: trustState.operatorKey,
        currentLevel: trustState.currentLevel,
        warrantyState: resolved.warrantyState,
        hasRecentRegression,
        degradationObserved,
        outOfBandChangeDetected,
        coverageExpired,
        evidenceRefs,
        rationale: resolved.rationale,
        evaluatedAt: input.evaluatedAt,
      });
    }

    return derived;
  }
}

module.exports = {
  WarrantyMonitor,
  WARRANTY_STATES,
};
