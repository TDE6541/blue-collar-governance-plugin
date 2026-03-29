"use strict";

const ACTION_CATEGORIES = new Set([
  "destructive_change",
  "protected_surface_change",
  "external_side_effect",
  "permission_escalation",
  "secret_or_sensitive_access",
]);

const DEFAULT_OUTCOMES = new Set([
  "stop",
  "require_authorization",
  "allow_with_receipt",
]);

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

function normalizeInterlock(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError("INVALID_INTERLOCK", "interlock input must be an object");
  }

  assertRequiredString(input, "interlockId");
  assertRequiredString(input, "operatorPrompt");
  assertRequiredString(input, "rationale");
  assertRequiredString(input, "createdAt");
  assertRequiredStringArray(input, "evidence");
  assertOptionalStringArray(input, "protectedTargets");

  if (!ACTION_CATEGORIES.has(input.actionCategory)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'actionCategory' must be one of: destructive_change, protected_surface_change, external_side_effect, permission_escalation, secret_or_sensitive_access"
    );
  }

  if (!DEFAULT_OUTCOMES.has(input.defaultOutcome)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'defaultOutcome' must be one of: stop, require_authorization, allow_with_receipt"
    );
  }

  if (typeof input.requiresExplicitAuthorization !== "boolean") {
    throw makeValidationError(
      "INVALID_FIELD",
      "'requiresExplicitAuthorization' must be a boolean"
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

  if (
    input.requiresExplicitAuthorization &&
    input.defaultOutcome === "allow_with_receipt"
  ) {
    throw makeValidationError(
      "INVALID_INTERLOCK_RULE",
      "requiresExplicitAuthorization=true must align with defaultOutcome 'require_authorization' or 'stop'"
    );
  }

  if (
    input.actionCategory === "protected_surface_change" &&
    input.defaultOutcome === "allow_with_receipt"
  ) {
    throw makeValidationError(
      "INVALID_INTERLOCK_RULE",
      "'protected_surface_change' interlocks must default to 'require_authorization' or 'stop'"
    );
  }

  if (
    ["destructive_change", "permission_escalation", "secret_or_sensitive_access"].includes(
      input.actionCategory
    ) &&
    input.defaultOutcome === "allow_with_receipt"
  ) {
    throw makeValidationError(
      "INVALID_INTERLOCK_RULE",
      "destructive_change, permission_escalation, and secret_or_sensitive_access must not default to 'allow_with_receipt'"
    );
  }

  return {
    interlockId: input.interlockId,
    actionCategory: input.actionCategory,
    defaultOutcome: input.defaultOutcome,
    requiresExplicitAuthorization: input.requiresExplicitAuthorization,
    protectedTargets: input.protectedTargets ? [...input.protectedTargets] : undefined,
    operatorPrompt: input.operatorPrompt,
    rationale: input.rationale,
    evidence: [...input.evidence],
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    notes: input.notes,
  };
}

function cloneInterlock(interlock) {
  return {
    ...interlock,
    protectedTargets: interlock.protectedTargets
      ? [...interlock.protectedTargets]
      : undefined,
    evidence: [...interlock.evidence],
  };
}

function collectProtectedTargetHits(targets, protectedTargets) {
  if (!Array.isArray(protectedTargets) || protectedTargets.length === 0) {
    return [];
  }

  const protectedSet = new Set(protectedTargets);
  return targets.filter((target) => protectedSet.has(target));
}

class SafetyInterlocks {
  constructor(initialInterlocks = []) {
    if (!Array.isArray(initialInterlocks)) {
      throw makeValidationError(
        "INVALID_INTERLOCK_COLLECTION",
        "initial interlocks must be an array"
      );
    }

    this._interlocksById = new Map();

    for (const interlockInput of initialInterlocks) {
      const interlock = normalizeInterlock(interlockInput);
      if (this._interlocksById.has(interlock.interlockId)) {
        throw makeValidationError(
          "DUPLICATE_INTERLOCK",
          `interlockId '${interlock.interlockId}' already exists`
        );
      }

      this._interlocksById.set(interlock.interlockId, interlock);
    }
  }

  createInterlock(interlockInput) {
    const interlock = normalizeInterlock(interlockInput);
    if (this._interlocksById.has(interlock.interlockId)) {
      throw makeValidationError(
        "DUPLICATE_INTERLOCK",
        `interlockId '${interlock.interlockId}' already exists`
      );
    }

    this._interlocksById.set(interlock.interlockId, interlock);
    return cloneInterlock(interlock);
  }

  getInterlock(interlockId) {
    const interlock = this._interlocksById.get(interlockId);
    return interlock ? cloneInterlock(interlock) : null;
  }

  listInterlocks() {
    return Array.from(this._interlocksById.values(), cloneInterlock);
  }

  evaluateAction(interlockId, actionInput = {}) {
    if (typeof interlockId !== "string" || interlockId.trim() === "") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'interlockId' must be a non-empty string"
      );
    }

    if (!isPlainObject(actionInput)) {
      throw makeValidationError(
        "INVALID_ACTION_INPUT",
        "action input must be an object"
      );
    }

    const interlock = this._interlocksById.get(interlockId);
    if (!interlock) {
      throw makeValidationError(
        "INTERLOCK_NOT_FOUND",
        `interlockId '${interlockId}' was not found`
      );
    }

    if (!ACTION_CATEGORIES.has(actionInput.actionCategory)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'actionCategory' must be one of: destructive_change, protected_surface_change, external_side_effect, permission_escalation, secret_or_sensitive_access"
      );
    }

    const targets = actionInput.targets ?? [];
    if (!Array.isArray(targets) || targets.some((target) => typeof target !== "string")) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'targets' must be an array of strings when provided"
      );
    }

    if (
      actionInput.operatorAuthorized !== undefined &&
      typeof actionInput.operatorAuthorized !== "boolean"
    ) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'operatorAuthorized' must be a boolean when provided"
      );
    }

    if (
      actionInput.activeConstraintBlock !== undefined &&
      typeof actionInput.activeConstraintBlock !== "boolean"
    ) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'activeConstraintBlock' must be a boolean when provided"
      );
    }

    const protectedTargetHits = collectProtectedTargetHits(
      targets,
      interlock.protectedTargets
    );

    const triggered =
      interlock.actionCategory === actionInput.actionCategory ||
      protectedTargetHits.length > 0;

    if (!triggered) {
      return {
        interlockId,
        triggered: false,
        decision: null,
        requiresAuthorization: false,
        mayProceed: true,
        protectedTargetHits: [],
        operatorPrompt: null,
      };
    }

    const operatorAuthorized = actionInput.operatorAuthorized === true;
    const activeConstraintBlock = actionInput.activeConstraintBlock === true;

    let decision = interlock.defaultOutcome;
    let mayProceed;
    if (decision === "stop") {
      mayProceed = false;
    } else if (decision === "require_authorization") {
      mayProceed = operatorAuthorized;
    } else {
      mayProceed = true;
    }

    if (activeConstraintBlock) {
      decision = "stop";
      mayProceed = false;
    }

    const requiresAuthorization =
      interlock.requiresExplicitAuthorization || decision === "require_authorization";

    let operatorPrompt = interlock.operatorPrompt;
    if (protectedTargetHits.length > 0) {
      operatorPrompt = `${operatorPrompt} Protected target(s): ${protectedTargetHits.join(", ")}.`;
    }

    return {
      interlockId,
      triggered: true,
      actionCategory: actionInput.actionCategory,
      decision,
      requiresAuthorization,
      operatorAuthorized,
      mayProceed,
      protectedTargetHits,
      operatorPrompt,
      rationale: interlock.rationale,
      evidence: [...interlock.evidence],
    };
  }
}

module.exports = {
  SafetyInterlocks,
};
