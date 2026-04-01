"use strict";

const { ControlRodMode } = require("./ControlRodMode");

const SKILL_ROUTES = Object.freeze(["/permit"]);

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

function cloneTextList(values) {
  return values.map((value) => `${value}`);
}

function resolveProfileId(profile) {
  if (typeof profile === "string") {
    return profile;
  }

  if (isPlainObject(profile) && hasNonEmptyString(profile.profileId)) {
    return profile.profileId;
  }

  return null;
}

function buildNoEvaluationView(input, evaluationState) {
  return {
    route: "/permit",
    evaluated: false,
    profileId: resolveProfileId(input.profile),
    domainId: hasNonEmptyString(input.domainId) ? input.domainId : null,
    sessionId: hasNonEmptyString(input.sessionId) ? input.sessionId : null,
    evaluatedAt: hasNonEmptyString(input.evaluatedAt) ? input.evaluatedAt : null,
    autonomyLevel: null,
    requiresLoto: null,
    requiresPermit: null,
    mayProceed: null,
    constrained: null,
    statusCode: null,
    summary: null,
    authorizationRef: null,
    permitRef: null,
    permitDecision: null,
    chainRefs: [],
    conditions: [],
    evaluationState,
    renderNote:
      "no evaluation rendered because required permit-gate input was not supplied",
  };
}

function hasRequiredGateInput(input) {
  return (
    input.profile !== undefined &&
    hasNonEmptyString(input.domainId) &&
    hasNonEmptyString(input.sessionId) &&
    hasNonEmptyString(input.evaluatedAt)
  );
}

class PermitSkill {
  renderPermit(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
    }

    if (!hasRequiredGateInput(input)) {
      return buildNoEvaluationView(
        input,
        "no evaluation performed: required permit-gate input missing"
      );
    }

    const mode = new ControlRodMode();

    let evaluation;
    try {
      evaluation = mode.evaluateHardStopGate({
        profile: input.profile,
        domainId: input.domainId,
        sessionId: input.sessionId,
        evaluatedAt: input.evaluatedAt,
        authorization: input.authorization,
        permit: input.permit,
      });
    } catch (error) {
      if (error && error.name === "ValidationError") {
        return buildNoEvaluationView(
          input,
          "no evaluation performed: permit-gate input failed validation"
        );
      }

      throw error;
    }

    return {
      route: "/permit",
      evaluated: true,
      profileId: resolveProfileId(input.profile),
      domainId: evaluation.domainId ?? input.domainId,
      sessionId: input.sessionId,
      evaluatedAt: input.evaluatedAt,
      autonomyLevel: evaluation.autonomyLevel ?? null,
      requiresLoto:
        typeof evaluation.requiresLoto === "boolean" ? evaluation.requiresLoto : null,
      requiresPermit:
        typeof evaluation.requiresPermit === "boolean"
          ? evaluation.requiresPermit
          : null,
      mayProceed: typeof evaluation.mayProceed === "boolean" ? evaluation.mayProceed : null,
      constrained:
        typeof evaluation.constrained === "boolean" ? evaluation.constrained : null,
      statusCode: hasNonEmptyString(evaluation.statusCode) ? evaluation.statusCode : null,
      summary: hasNonEmptyString(evaluation.summary) ? evaluation.summary : null,
      authorizationRef: hasNonEmptyString(evaluation.authorizationRef)
        ? evaluation.authorizationRef
        : null,
      permitRef: hasNonEmptyString(evaluation.permitRef) ? evaluation.permitRef : null,
      permitDecision: hasNonEmptyString(evaluation.permitDecision)
        ? evaluation.permitDecision
        : null,
      chainRefs: cloneTextList(evaluation.chainRefs ?? []),
      conditions: cloneTextList(evaluation.conditions ?? []),
      evaluationState: "evaluation rendered from existing ControlRodMode gate truth",
      renderNote: "rendered from existing ControlRodMode HARD_STOP permit-gate truth",
    };
  }
}

module.exports = {
  PermitSkill,
  SKILL_ROUTES,
};
