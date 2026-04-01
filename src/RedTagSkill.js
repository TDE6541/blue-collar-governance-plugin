"use strict";

const { SafetyInterlocks } = require("./SafetyInterlocks");

const SKILL_ROUTES = Object.freeze(["/red-tag"]);

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function assertStringArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be an array of strings`
    );
  }

  if (value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be an array of non-empty strings`
    );
  }
}

function assertOptionalBoolean(input, fieldName) {
  if (input[fieldName] === undefined) {
    return;
  }

  if (typeof input[fieldName] !== "boolean") {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be a boolean when provided`
    );
  }
}

function cloneTextList(values) {
  return values.map((value) => `${value}`);
}

function normalizeInterlockSnapshots(value) {
  if (!Array.isArray(value)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'interlocks' must be an array"
    );
  }

  for (let index = 0; index < value.length; index += 1) {
    if (!isPlainObject(value[index])) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'interlocks[${index}]' must be an object`
      );
    }
  }

  return value;
}

function buildNoEvaluationView(input) {
  const targetRows = Array.isArray(input.targets)
    ? cloneTextList(input.targets.filter((entry) => typeof entry === "string"))
    : [];

  return {
    route: "/red-tag",
    evaluated: false,
    interlockId: hasNonEmptyString(input.interlockId) ? input.interlockId : null,
    actionCategory: hasNonEmptyString(input.actionCategory)
      ? input.actionCategory
      : null,
    targets: targetRows,
    triggered: null,
    decision: null,
    requiresAuthorization: null,
    mayProceed: null,
    protectedTargetHits: [],
    operatorPrompt: null,
    rationale: null,
    evidence: [],
    evaluationState:
      "no evaluation performed: required action/target input missing",
    renderNote:
      "no evaluation rendered because required action/target input was not supplied",
  };
}

class RedTagSkill {
  renderRedTag(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
    }

    if (input.interlocks === undefined) {
      throw makeValidationError("ERR_INVALID_INPUT", "'interlocks' is required");
    }

    const interlocks = normalizeInterlockSnapshots(input.interlocks);

    if (input.targets !== undefined) {
      assertStringArray(input.targets, "targets");
    }

    assertOptionalBoolean(input, "operatorAuthorized");
    assertOptionalBoolean(input, "activeConstraintBlock");

    const hasInterlockId = hasNonEmptyString(input.interlockId);
    const hasActionCategory = hasNonEmptyString(input.actionCategory);
    const hasTargets = Array.isArray(input.targets) && input.targets.length > 0;

    if (!hasInterlockId || !hasActionCategory || !hasTargets) {
      return buildNoEvaluationView(input);
    }

    const evaluator = new SafetyInterlocks(interlocks);
    const evaluation = evaluator.evaluateAction(input.interlockId, {
      actionCategory: input.actionCategory,
      targets: cloneTextList(input.targets),
      operatorAuthorized: input.operatorAuthorized,
      activeConstraintBlock: input.activeConstraintBlock,
    });

    return {
      route: "/red-tag",
      evaluated: true,
      interlockId: evaluation.interlockId,
      actionCategory: evaluation.actionCategory ?? input.actionCategory,
      targets: cloneTextList(input.targets),
      triggered: evaluation.triggered,
      decision: evaluation.decision,
      requiresAuthorization: evaluation.requiresAuthorization,
      mayProceed: evaluation.mayProceed,
      protectedTargetHits: cloneTextList(evaluation.protectedTargetHits ?? []),
      operatorPrompt: evaluation.operatorPrompt ?? null,
      rationale: evaluation.rationale ?? null,
      evidence: cloneTextList(evaluation.evidence ?? []),
      evaluationState: evaluation.triggered
        ? "evaluation rendered from current interlock decision truth"
        : "evaluation rendered with no interlock trigger",
      renderNote: "rendered from existing SafetyInterlocks decision truth",
    };
  }
}

module.exports = {
  RedTagSkill,
  SKILL_ROUTES,
};
