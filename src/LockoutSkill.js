"use strict";

const { ControlRodMode } = require("./ControlRodMode");

const SKILL_ROUTES = Object.freeze(["/lockout"]);

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
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => `${value}`);
}

function cloneScope(scope) {
  if (!isPlainObject(scope)) {
    return null;
  }

  const view = {
    scopeType: hasNonEmptyString(scope.scopeType) ? scope.scopeType : null,
  };

  if (hasNonEmptyString(scope.sessionId)) {
    view.sessionId = scope.sessionId;
  }

  if (hasNonEmptyString(scope.expiresAt)) {
    view.expiresAt = scope.expiresAt;
  }

  return view;
}

function buildNoEvaluationView(evaluationState) {
  return {
    route: "/lockout",
    evaluated: false,
    authorizationValid: null,
    authorizationId: null,
    domainId: null,
    authorizedBy: null,
    authorizedAt: null,
    reason: null,
    scope: null,
    conditions: [],
    chainRef: null,
    evaluationState,
    renderNote:
      "no evaluation rendered because required authorization input was missing or invalid",
  };
}

class LockoutSkill {
  renderLockout(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
    }

    if (input.authorization === undefined) {
      return buildNoEvaluationView(
        "no evaluation performed: required authorization input missing"
      );
    }

    const mode = new ControlRodMode();

    let authorization;
    try {
      authorization = mode.validateLotoAuthorization(input.authorization);
    } catch (error) {
      if (error && error.name === "ValidationError") {
        return buildNoEvaluationView(
          "no evaluation performed: authorization input failed validation"
        );
      }

      throw error;
    }

    return {
      route: "/lockout",
      evaluated: true,
      authorizationValid: true,
      authorizationId: hasNonEmptyString(authorization.authorizationId)
        ? authorization.authorizationId
        : null,
      domainId: hasNonEmptyString(authorization.domainId)
        ? authorization.domainId
        : null,
      authorizedBy: hasNonEmptyString(authorization.authorizedBy)
        ? authorization.authorizedBy
        : null,
      authorizedAt: hasNonEmptyString(authorization.authorizedAt)
        ? authorization.authorizedAt
        : null,
      reason: hasNonEmptyString(authorization.reason) ? authorization.reason : null,
      scope: cloneScope(authorization.scope),
      conditions: cloneTextList(authorization.conditions),
      chainRef: hasNonEmptyString(authorization.chainRef)
        ? authorization.chainRef
        : null,
      evaluationState:
        "evaluation rendered from existing ControlRodMode LOTO validation truth",
      renderNote: "rendered from existing ControlRodMode LOTO validation truth",
    };
  }
}

module.exports = {
  LockoutSkill,
  SKILL_ROUTES,
};
