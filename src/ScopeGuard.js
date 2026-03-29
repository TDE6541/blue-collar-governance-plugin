"use strict";

const DECISIONS = new Set(["approve", "reject", "extend"]);
const ACTORS = new Set(["architect", "ai"]);
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

function assertRequiredStringArray(input, fieldName) {
  const value = input[fieldName];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an array of strings`
    );
  }
}

function assertOptionalStringArray(input, fieldName) {
  if (input[fieldName] === undefined) {
    return;
  }

  if (
    !Array.isArray(input[fieldName]) ||
    input[fieldName].some((entry) => typeof entry !== "string")
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an array of strings when provided`
    );
  }
}

function computeComparison(requestedWork, observedWork, approvedExtensions) {
  const observedSet = new Set(observedWork);
  const allowedSet = new Set([...requestedWork, ...approvedExtensions]);

  const matchedWork = requestedWork.filter((item) => observedSet.has(item));
  const missingWork = requestedWork.filter((item) => !observedSet.has(item));
  const unauthorizedWork = observedWork.filter((item) => !allowedSet.has(item));

  return {
    matchedWork,
    unauthorizedWork,
    missingWork,
  };
}

function normalizeEvaluation(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_EVALUATION",
      "evaluation input must be an object"
    );
  }

  assertRequiredString(input, "evaluationId");
  assertRequiredStringArray(input, "requestedWork");
  assertRequiredStringArray(input, "observedWork");
  assertRequiredString(input, "decisionReason");
  assertRequiredStringArray(input, "evidence");
  assertOptionalStringArray(input, "approvedExtensions");

  if (!DECISIONS.has(input.decision)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'decision' must be one of: approve, reject, extend"
    );
  }

  if (typeof input.requiresOperatorAction !== "boolean") {
    throw makeValidationError(
      "INVALID_FIELD",
      "'requiresOperatorAction' must be a boolean"
    );
  }

  if (!ACTORS.has(input.createdBy)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'createdBy' must be one of: architect, ai"
    );
  }

  if (!isIso8601Timestamp(input.createdAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'createdAt' must be an ISO 8601 timestamp"
    );
  }

  if (input.updatedAt !== undefined && !isIso8601Timestamp(input.updatedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'updatedAt' must be an ISO 8601 timestamp when provided"
    );
  }

  if (input.notes !== undefined && typeof input.notes !== "string") {
    throw makeValidationError(
      "INVALID_FIELD",
      "'notes' must be a string when provided"
    );
  }

  const approvedExtensions = input.approvedExtensions ? [...input.approvedExtensions] : [];

  const comparison = computeComparison(
    input.requestedWork,
    input.observedWork,
    approvedExtensions
  );

  if (input.decision === "approve" && comparison.unauthorizedWork.length > 0) {
    throw makeValidationError(
      "INVALID_SCOPE_DECISION",
      "'approve' cannot be used when unauthorizedWork is not empty"
    );
  }

  if (input.decision === "extend" && input.requiresOperatorAction !== true) {
    throw makeValidationError(
      "INVALID_SCOPE_DECISION",
      "'extend' requires requiresOperatorAction=true"
    );
  }

  return {
    evaluationId: input.evaluationId,
    requestedWork: [...input.requestedWork],
    observedWork: [...input.observedWork],
    matchedWork: comparison.matchedWork,
    unauthorizedWork: comparison.unauthorizedWork,
    missingWork: comparison.missingWork,
    decision: input.decision,
    decisionReason: input.decisionReason,
    requiresOperatorAction: input.requiresOperatorAction,
    evidence: [...input.evidence],
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    approvedExtensions: approvedExtensions.length > 0 ? approvedExtensions : undefined,
    notes: input.notes,
  };
}

function cloneEvaluation(evaluation) {
  return {
    ...evaluation,
    requestedWork: [...evaluation.requestedWork],
    observedWork: [...evaluation.observedWork],
    matchedWork: [...evaluation.matchedWork],
    unauthorizedWork: [...evaluation.unauthorizedWork],
    missingWork: [...evaluation.missingWork],
    evidence: [...evaluation.evidence],
    approvedExtensions: evaluation.approvedExtensions
      ? [...evaluation.approvedExtensions]
      : undefined,
  };
}

class ScopeGuard {
  constructor(initialEvaluations = []) {
    if (!Array.isArray(initialEvaluations)) {
      throw makeValidationError(
        "INVALID_EVALUATION_COLLECTION",
        "initial evaluations must be an array"
      );
    }

    this._evaluationsById = new Map();

    for (const evaluationInput of initialEvaluations) {
      const evaluation = normalizeEvaluation(evaluationInput);
      if (this._evaluationsById.has(evaluation.evaluationId)) {
        throw makeValidationError(
          "DUPLICATE_EVALUATION",
          `evaluationId '${evaluation.evaluationId}' already exists`
        );
      }

      this._evaluationsById.set(evaluation.evaluationId, evaluation);
    }
  }

  createEvaluation(evaluationInput) {
    const evaluation = normalizeEvaluation(evaluationInput);
    if (this._evaluationsById.has(evaluation.evaluationId)) {
      throw makeValidationError(
        "DUPLICATE_EVALUATION",
        `evaluationId '${evaluation.evaluationId}' already exists`
      );
    }

    this._evaluationsById.set(evaluation.evaluationId, evaluation);
    return cloneEvaluation(evaluation);
  }

  getEvaluation(evaluationId) {
    const evaluation = this._evaluationsById.get(evaluationId);
    return evaluation ? cloneEvaluation(evaluation) : null;
  }

  listEvaluations() {
    return Array.from(this._evaluationsById.values(), cloneEvaluation);
  }
}

module.exports = {
  ScopeGuard,
};
