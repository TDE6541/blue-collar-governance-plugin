"use strict";

const { AUTONOMY_LEVELS } = require("./ControlRodMode");
const { TRUST_LEVELS } = require("./OperatorTrustLedger");

const AUTONOMY_LEVEL_SET = new Set(AUTONOMY_LEVELS);

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

function assertRequiredTimestamp(input, fieldName) {
  assertRequiredString(input, fieldName);
  if (!isIso8601Timestamp(input[fieldName])) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an ISO 8601 timestamp`
    );
  }
}

function assertOptionalBoolean(input, fieldName) {
  if (input[fieldName] === undefined) {
    return;
  }

  if (typeof input[fieldName] !== "boolean") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a boolean when provided`
    );
  }
}

function assertOptionalStringArray(input, fieldName) {
  if (input[fieldName] === undefined) {
    return;
  }

  if (
    !Array.isArray(input[fieldName]) ||
    input[fieldName].some((entry) => typeof entry !== "string" || entry.trim() === "")
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an array of non-empty strings when provided`
    );
  }
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function resolveAdjacentLevel(currentLevel, direction) {
  const currentIndex = TRUST_LEVELS.indexOf(currentLevel);
  const targetIndex = currentIndex + direction;

  if (targetIndex < 0 || targetIndex >= TRUST_LEVELS.length) {
    return currentLevel;
  }

  return TRUST_LEVELS[targetIndex];
}

class JourneymanTrustEngine {
  constructor(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "JourneymanTrustEngine constructor input must be an object"
      );
    }

    if (!isPlainObject(input.trustLedger)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'trustLedger' must be an object"
      );
    }

    const requiredMethods = [
      "initializeOperator",
      "getOperatorState",
      "recordDecisionOutcome",
      "recordApprovedRodAdjustment",
      "recordOverrideOutcome",
    ];

    for (const methodName of requiredMethods) {
      if (typeof input.trustLedger[methodName] !== "function") {
        throw makeValidationError(
          "INVALID_FIELD",
          `'trustLedger' must implement '${methodName}'`
        );
      }
    }

    if (input.forensicChain !== undefined) {
      if (!isPlainObject(input.forensicChain)) {
        throw makeValidationError(
          "INVALID_FIELD",
          "'forensicChain' must be an object when provided"
        );
      }

      if (typeof input.forensicChain.getEntry !== "function") {
        throw makeValidationError(
          "INVALID_FIELD",
          "'forensicChain' must implement 'getEntry' when provided"
        );
      }
    }

    this._trustLedger = input.trustLedger;
    this._forensicChain = input.forensicChain;
  }

  _normalizeForensicReferenceIds(value, { required = true } = {}) {
    if (value === undefined) {
      if (required) {
        throw makeValidationError(
          "INVALID_FIELD",
          "'forensicReferenceIds' must be a non-empty array of strings"
        );
      }
      return [];
    }

    if (
      !Array.isArray(value) ||
      value.some((entry) => typeof entry !== "string" || entry.trim() === "")
    ) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'forensicReferenceIds' must be a non-empty array of strings"
      );
    }

    const refs = uniqueStrings(value);

    if (required && refs.length === 0) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'forensicReferenceIds' must be a non-empty array of strings"
      );
    }

    if (this._forensicChain) {
      for (const refId of refs) {
        const entry = this._forensicChain.getEntry(refId);
        if (!entry) {
          throw makeValidationError(
            "FORENSIC_REF_NOT_FOUND",
            `forensic reference '${refId}' was not found`
          );
        }
      }
    }

    return refs;
  }

  readTrustState(input) {
    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "readTrustState input must be an object"
      );
    }

    assertRequiredString(input, "operatorKey");
    assertRequiredTimestamp(input, "readAt");

    return this._trustLedger.initializeOperator({
      operatorKey: input.operatorKey,
      initializedAt: input.readAt,
    });
  }

  evaluateDecision(input) {
    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "evaluateDecision input must be an object"
      );
    }

    assertRequiredString(input, "operatorKey");
    assertRequiredString(input, "decisionId");
    assertRequiredTimestamp(input, "evaluatedAt");
    assertOptionalBoolean(input, "promotionSignal");
    assertOptionalBoolean(input, "regressionSignal");
    assertOptionalStringArray(input, "reasonCodes");

    if (input.promotionSignal === true && input.regressionSignal === true) {
      throw makeValidationError(
        "INVALID_DECISION",
        "promotionSignal and regressionSignal cannot both be true"
      );
    }

    const forensicReferenceIds = this._normalizeForensicReferenceIds(
      input.forensicReferenceIds,
      { required: true }
    );

    const trustState = this._trustLedger.initializeOperator({
      operatorKey: input.operatorKey,
      initializedAt: input.evaluatedAt,
    });

    const reasonCodes = uniqueStrings([...(input.reasonCodes || [])]);
    let decisionType = "HOLD";
    let targetLevel = trustState.currentLevel;

    if (input.regressionSignal === true) {
      const regressionLevel = resolveAdjacentLevel(trustState.currentLevel, -1);
      if (regressionLevel !== trustState.currentLevel) {
        decisionType = "REGRESSION";
        targetLevel = regressionLevel;
      } else {
        reasonCodes.push("REGRESSION_FLOOR_REACHED");
      }
    } else if (input.promotionSignal === true) {
      const promotionLevel = resolveAdjacentLevel(trustState.currentLevel, 1);
      if (promotionLevel !== trustState.currentLevel) {
        decisionType = "PROMOTION";
        targetLevel = promotionLevel;
      } else {
        reasonCodes.push("PROMOTION_CEILING_REACHED");
      }
    }

    const persisted = this._trustLedger.recordDecisionOutcome({
      operatorKey: input.operatorKey,
      decisionId: input.decisionId,
      decisionType,
      targetLevel,
      reasonCodes,
      forensicReferenceIds,
      decidedAt: input.evaluatedAt,
    });

    const latestDecision = persisted.decisionHistory[persisted.decisionHistory.length - 1];
    return {
      decisionId: latestDecision.decisionId,
      operatorKey: input.operatorKey,
      decisionType: latestDecision.decisionType,
      fromLevel: latestDecision.fromLevel,
      toLevel: latestDecision.toLevel,
      reasonCodes: [...latestDecision.reasonCodes],
      forensicReferenceIds: [...latestDecision.forensicReferenceIds],
      evaluatedAt: latestDecision.decidedAt,
    };
  }

  recordApprovedRodAdjustment(input) {
    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "recordApprovedRodAdjustment input must be an object"
      );
    }

    assertRequiredString(input, "operatorKey");
    assertRequiredString(input, "adjustmentId");
    assertRequiredString(input, "fromAutonomyLevel");
    assertRequiredString(input, "toAutonomyLevel");
    assertRequiredString(input, "approvedBy");
    assertRequiredTimestamp(input, "approvedAt");

    if (!AUTONOMY_LEVEL_SET.has(input.fromAutonomyLevel)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'fromAutonomyLevel' must be one of: ${AUTONOMY_LEVELS.join(", ")}`
      );
    }

    if (!AUTONOMY_LEVEL_SET.has(input.toAutonomyLevel)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'toAutonomyLevel' must be one of: ${AUTONOMY_LEVELS.join(", ")}`
      );
    }

    if (input.reason !== undefined && typeof input.reason !== "string") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'reason' must be a string when provided"
      );
    }

    const forensicReferenceIds = this._normalizeForensicReferenceIds(
      input.forensicReferenceIds,
      { required: true }
    );

    return this._trustLedger.recordApprovedRodAdjustment({
      operatorKey: input.operatorKey,
      adjustmentId: input.adjustmentId,
      fromAutonomyLevel: input.fromAutonomyLevel,
      toAutonomyLevel: input.toAutonomyLevel,
      approvedBy: input.approvedBy,
      approvedAt: input.approvedAt,
      reason: input.reason,
      forensicReferenceIds,
    });
  }

  recordOverrideOutcome(input) {
    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "recordOverrideOutcome input must be an object"
      );
    }

    assertRequiredString(input, "operatorKey");
    assertRequiredString(input, "overrideId");
    assertRequiredString(input, "outcome");
    assertRequiredString(input, "resolvedBy");
    assertRequiredTimestamp(input, "resolvedAt");

    if (input.reason !== undefined && typeof input.reason !== "string") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'reason' must be a string when provided"
      );
    }

    const forensicReferenceIds = this._normalizeForensicReferenceIds(
      input.forensicReferenceIds,
      { required: true }
    );

    return this._trustLedger.recordOverrideOutcome({
      operatorKey: input.operatorKey,
      overrideId: input.overrideId,
      outcome: input.outcome,
      resolvedBy: input.resolvedBy,
      resolvedAt: input.resolvedAt,
      reason: input.reason,
      forensicReferenceIds,
    });
  }
}

module.exports = {
  JourneymanTrustEngine,
};
