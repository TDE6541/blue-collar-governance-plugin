"use strict";

const { AUTONOMY_LEVELS } = require("./ControlRodMode");

const TRUST_LEVELS = Object.freeze(["APPRENTICE", "JOURNEYMAN", "FOREMAN"]);
const TRUST_LEVEL_SET = new Set(TRUST_LEVELS);

const DECISION_TYPES = Object.freeze(["PROMOTION", "HOLD", "REGRESSION"]);
const DECISION_TYPE_SET = new Set(DECISION_TYPES);

const OVERRIDE_OUTCOMES = Object.freeze(["APPROVED", "DENIED", "EXPIRED"]);
const OVERRIDE_OUTCOME_SET = new Set(OVERRIDE_OUTCOMES);

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

function assertStringArray(value, fieldName, { nonEmpty = false } = {}) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an array of non-empty strings`
    );
  }

  if (nonEmpty && value.length === 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a non-empty array of strings`
    );
  }
}

function assertTrustLevel(level, fieldName) {
  if (!TRUST_LEVEL_SET.has(level)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be one of: ${TRUST_LEVELS.join(", ")}`
    );
  }
}

function assertAutonomyLevel(level, fieldName) {
  if (!AUTONOMY_LEVEL_SET.has(level)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be one of: ${AUTONOMY_LEVELS.join(", ")}`
    );
  }
}

function assertDecisionType(value) {
  if (!DECISION_TYPE_SET.has(value)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'decisionType' must be one of: ${DECISION_TYPES.join(", ")}`
    );
  }
}

function assertOverrideOutcome(value) {
  if (!OVERRIDE_OUTCOME_SET.has(value)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'outcome' must be one of: ${OVERRIDE_OUTCOMES.join(", ")}`
    );
  }
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function cloneTrustState(state) {
  return {
    operatorKey: state.operatorKey,
    currentLevel: state.currentLevel,
    levelTransitions: state.levelTransitions.map((entry) => ({
      transitionId: entry.transitionId,
      fromLevel: entry.fromLevel,
      toLevel: entry.toLevel,
      reasonCodes: [...entry.reasonCodes],
      forensicReferenceIds: [...entry.forensicReferenceIds],
      decidedAt: entry.decidedAt,
    })),
    approvedRodAdjustments: state.approvedRodAdjustments.map((entry) => ({
      adjustmentId: entry.adjustmentId,
      fromAutonomyLevel: entry.fromAutonomyLevel,
      toAutonomyLevel: entry.toAutonomyLevel,
      approvedBy: entry.approvedBy,
      approvedAt: entry.approvedAt,
      reason: entry.reason,
      forensicReferenceIds: [...entry.forensicReferenceIds],
    })),
    overrideOutcomes: state.overrideOutcomes.map((entry) => ({
      overrideId: entry.overrideId,
      outcome: entry.outcome,
      resolvedBy: entry.resolvedBy,
      resolvedAt: entry.resolvedAt,
      reason: entry.reason,
      forensicReferenceIds: [...entry.forensicReferenceIds],
    })),
    decisionHistory: state.decisionHistory.map((entry) => ({
      decisionId: entry.decisionId,
      decisionType: entry.decisionType,
      fromLevel: entry.fromLevel,
      toLevel: entry.toLevel,
      reasonCodes: [...entry.reasonCodes],
      forensicReferenceIds: [...entry.forensicReferenceIds],
      decidedAt: entry.decidedAt,
    })),
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  };
}

function buildInitialState(operatorKey, initializedAt) {
  return {
    operatorKey,
    currentLevel: "APPRENTICE",
    levelTransitions: [],
    approvedRodAdjustments: [],
    overrideOutcomes: [],
    decisionHistory: [],
    createdAt: initializedAt,
    updatedAt: initializedAt,
  };
}

function validateDecisionAdjacency(fromLevel, toLevel, decisionType) {
  const fromIndex = TRUST_LEVELS.indexOf(fromLevel);
  const toIndex = TRUST_LEVELS.indexOf(toLevel);
  const distance = toIndex - fromIndex;

  if (decisionType === "HOLD" && distance !== 0) {
    throw makeValidationError(
      "INVALID_DECISION",
      "HOLD decisions must keep operator level unchanged"
    );
  }

  if (decisionType === "PROMOTION" && distance !== 1) {
    throw makeValidationError(
      "INVALID_DECISION",
      "PROMOTION decisions must move exactly one level up"
    );
  }

  if (decisionType === "REGRESSION" && distance !== -1) {
    throw makeValidationError(
      "INVALID_DECISION",
      "REGRESSION decisions must move exactly one level down"
    );
  }
}

class OperatorTrustLedger {
  constructor(initialStates = []) {
    if (!Array.isArray(initialStates)) {
      throw makeValidationError(
        "INVALID_STATE_COLLECTION",
        "initial states must be an array"
      );
    }

    this._statesByOperatorKey = new Map();

    for (const initialState of initialStates) {
      if (!isPlainObject(initialState)) {
        throw makeValidationError(
          "INVALID_STATE",
          "initial states must contain plain objects"
        );
      }

      assertRequiredString(initialState, "operatorKey");
      assertRequiredTimestamp(initialState, "initializedAt");

      if (this._statesByOperatorKey.has(initialState.operatorKey)) {
        throw makeValidationError(
          "DUPLICATE_OPERATOR",
          `operatorKey '${initialState.operatorKey}' already exists`
        );
      }

      this._statesByOperatorKey.set(
        initialState.operatorKey,
        buildInitialState(initialState.operatorKey, initialState.initializedAt)
      );
    }
  }

  _getOrCreateState(operatorKey, timestamp) {
    const existing = this._statesByOperatorKey.get(operatorKey);
    if (existing) {
      return existing;
    }

    const created = buildInitialState(operatorKey, timestamp);
    this._statesByOperatorKey.set(operatorKey, created);
    return created;
  }

  initializeOperator(input) {
    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_INPUT",
        "initializeOperator input must be an object"
      );
    }

    assertRequiredString(input, "operatorKey");
    assertRequiredTimestamp(input, "initializedAt");

    const existing = this._statesByOperatorKey.get(input.operatorKey);
    if (existing) {
      return cloneTrustState(existing);
    }

    const state = buildInitialState(input.operatorKey, input.initializedAt);
    this._statesByOperatorKey.set(input.operatorKey, state);
    return cloneTrustState(state);
  }

  getOperatorState(operatorKey) {
    if (typeof operatorKey !== "string" || operatorKey.trim() === "") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'operatorKey' must be a non-empty string"
      );
    }

    const state = this._statesByOperatorKey.get(operatorKey);
    return state ? cloneTrustState(state) : null;
  }

  listOperatorStates() {
    return Array.from(this._statesByOperatorKey.values(), cloneTrustState);
  }

  recordDecisionOutcome(input) {
    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_INPUT",
        "recordDecisionOutcome input must be an object"
      );
    }

    assertRequiredString(input, "operatorKey");
    assertRequiredString(input, "decisionId");
    assertRequiredString(input, "decisionType");
    assertRequiredString(input, "targetLevel");
    assertRequiredTimestamp(input, "decidedAt");
    assertDecisionType(input.decisionType);
    assertTrustLevel(input.targetLevel, "targetLevel");

    const reasonCodes = input.reasonCodes || [];
    assertStringArray(reasonCodes, "reasonCodes");

    const forensicReferenceIds = input.forensicReferenceIds || [];
    assertStringArray(forensicReferenceIds, "forensicReferenceIds", { nonEmpty: true });

    const state = this._getOrCreateState(input.operatorKey, input.decidedAt);

    if (state.decisionHistory.some((entry) => entry.decisionId === input.decisionId)) {
      throw makeValidationError(
        "DUPLICATE_ENTRY",
        `decisionId '${input.decisionId}' already exists for operator '${input.operatorKey}'`
      );
    }

    const fromLevel = state.currentLevel;
    validateDecisionAdjacency(fromLevel, input.targetLevel, input.decisionType);

    const decisionRecord = {
      decisionId: input.decisionId,
      decisionType: input.decisionType,
      fromLevel,
      toLevel: input.targetLevel,
      reasonCodes: uniqueStrings(reasonCodes),
      forensicReferenceIds: uniqueStrings(forensicReferenceIds),
      decidedAt: input.decidedAt,
    };

    state.decisionHistory.push(decisionRecord);

    if (fromLevel !== input.targetLevel) {
      state.levelTransitions.push({
        transitionId: input.decisionId,
        fromLevel,
        toLevel: input.targetLevel,
        reasonCodes: [...decisionRecord.reasonCodes],
        forensicReferenceIds: [...decisionRecord.forensicReferenceIds],
        decidedAt: input.decidedAt,
      });
      state.currentLevel = input.targetLevel;
    }

    state.updatedAt = input.decidedAt;
    return cloneTrustState(state);
  }

  recordApprovedRodAdjustment(input) {
    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_INPUT",
        "recordApprovedRodAdjustment input must be an object"
      );
    }

    assertRequiredString(input, "operatorKey");
    assertRequiredString(input, "adjustmentId");
    assertRequiredString(input, "fromAutonomyLevel");
    assertRequiredString(input, "toAutonomyLevel");
    assertRequiredString(input, "approvedBy");
    assertRequiredTimestamp(input, "approvedAt");
    assertAutonomyLevel(input.fromAutonomyLevel, "fromAutonomyLevel");
    assertAutonomyLevel(input.toAutonomyLevel, "toAutonomyLevel");

    if (input.reason !== undefined && typeof input.reason !== "string") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'reason' must be a string when provided"
      );
    }

    const forensicReferenceIds = input.forensicReferenceIds || [];
    assertStringArray(forensicReferenceIds, "forensicReferenceIds", { nonEmpty: true });

    const state = this._getOrCreateState(input.operatorKey, input.approvedAt);

    if (state.approvedRodAdjustments.some((entry) => entry.adjustmentId === input.adjustmentId)) {
      throw makeValidationError(
        "DUPLICATE_ENTRY",
        `adjustmentId '${input.adjustmentId}' already exists for operator '${input.operatorKey}'`
      );
    }

    state.approvedRodAdjustments.push({
      adjustmentId: input.adjustmentId,
      fromAutonomyLevel: input.fromAutonomyLevel,
      toAutonomyLevel: input.toAutonomyLevel,
      approvedBy: input.approvedBy,
      approvedAt: input.approvedAt,
      reason: input.reason,
      forensicReferenceIds: uniqueStrings(forensicReferenceIds),
    });

    state.updatedAt = input.approvedAt;
    return cloneTrustState(state);
  }

  recordOverrideOutcome(input) {
    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_INPUT",
        "recordOverrideOutcome input must be an object"
      );
    }

    assertRequiredString(input, "operatorKey");
    assertRequiredString(input, "overrideId");
    assertRequiredString(input, "outcome");
    assertRequiredString(input, "resolvedBy");
    assertRequiredTimestamp(input, "resolvedAt");
    assertOverrideOutcome(input.outcome);

    if (input.reason !== undefined && typeof input.reason !== "string") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'reason' must be a string when provided"
      );
    }

    const forensicReferenceIds = input.forensicReferenceIds || [];
    assertStringArray(forensicReferenceIds, "forensicReferenceIds", { nonEmpty: true });

    const state = this._getOrCreateState(input.operatorKey, input.resolvedAt);

    if (state.overrideOutcomes.some((entry) => entry.overrideId === input.overrideId)) {
      throw makeValidationError(
        "DUPLICATE_ENTRY",
        `overrideId '${input.overrideId}' already exists for operator '${input.operatorKey}'`
      );
    }

    state.overrideOutcomes.push({
      overrideId: input.overrideId,
      outcome: input.outcome,
      resolvedBy: input.resolvedBy,
      resolvedAt: input.resolvedAt,
      reason: input.reason,
      forensicReferenceIds: uniqueStrings(forensicReferenceIds),
    });

    state.updatedAt = input.resolvedAt;
    return cloneTrustState(state);
  }
}

module.exports = {
  OperatorTrustLedger,
  TRUST_LEVELS,
  DECISION_TYPES,
  OVERRIDE_OUTCOMES,
};
