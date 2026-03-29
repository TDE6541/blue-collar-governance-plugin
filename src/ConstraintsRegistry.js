"use strict";

const RULE_STATUSES = new Set(["proposed", "active", "disabled", "archived"]);
const ENFORCEMENT_CLASSES = new Set([
  "hard_block",
  "protected_asset",
  "requires_confirmation",
  "scope_limit",
]);
const SEVERITIES = new Set(["critical", "high", "standard"]);
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

function normalizeRule(input, { forCreate }) {
  if (!isPlainObject(input)) {
    throw makeValidationError("INVALID_RULE", "rule input must be an object");
  }

  assertRequiredString(input, "ruleId");
  assertRequiredString(input, "label");
  assertRequiredString(input, "instruction");
  assertRequiredString(input, "rationale");
  assertRequiredString(input, "createdAt");
  assertRequiredStringArray(input, "evidence");
  assertRequiredStringArray(input, "appliesTo");
  assertOptionalStringArray(input, "exceptions");

  const status = input.status ?? "proposed";
  if (!RULE_STATUSES.has(status)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'status' must be one of: proposed, active, disabled, archived"
    );
  }

  if (forCreate && input.status !== undefined && input.status !== "proposed") {
    throw makeValidationError(
      "INVALID_STATUS",
      "new rules must begin in 'proposed' status"
    );
  }

  if (!ENFORCEMENT_CLASSES.has(input.enforcementClass)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'enforcementClass' must be one of: hard_block, protected_asset, requires_confirmation, scope_limit"
    );
  }

  if (!SEVERITIES.has(input.severity)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'severity' must be one of: critical, high, standard"
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

  return {
    ruleId: input.ruleId,
    label: input.label,
    instruction: input.instruction,
    status,
    enforcementClass: input.enforcementClass,
    severity: input.severity,
    rationale: input.rationale,
    evidence: [...input.evidence],
    appliesTo: [...input.appliesTo],
    exceptions: input.exceptions ? [...input.exceptions] : undefined,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    notes: input.notes,
  };
}

function cloneRule(rule) {
  return {
    ...rule,
    evidence: [...rule.evidence],
    appliesTo: [...rule.appliesTo],
    exceptions: rule.exceptions ? [...rule.exceptions] : undefined,
  };
}

function normalizeExceptionContext(exceptionContext) {
  if (exceptionContext === undefined) {
    return new Set();
  }

  if (
    !Array.isArray(exceptionContext) ||
    exceptionContext.some((entry) => typeof entry !== "string")
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'exceptionContext' must be an array of strings when provided"
    );
  }

  return new Set(exceptionContext);
}

function getClassPriority(enforcementClass, protectedTargetInvolved) {
  if (enforcementClass === "hard_block") {
    return 40;
  }

  if (enforcementClass === "protected_asset") {
    return protectedTargetInvolved ? 30 : -1;
  }

  if (enforcementClass === "requires_confirmation") {
    return 20;
  }

  return 10;
}

class ConstraintsRegistry {
  constructor(initialRules = []) {
    if (!Array.isArray(initialRules)) {
      throw makeValidationError(
        "INVALID_RULE_COLLECTION",
        "initial rules must be an array"
      );
    }

    this._rulesById = new Map();

    for (const ruleInput of initialRules) {
      const rule = normalizeRule(ruleInput, { forCreate: false });
      if (this._rulesById.has(rule.ruleId)) {
        throw makeValidationError(
          "DUPLICATE_RULE",
          `ruleId '${rule.ruleId}' already exists`
        );
      }

      this._rulesById.set(rule.ruleId, rule);
    }
  }

  createRule(ruleInput) {
    const rule = normalizeRule(ruleInput, { forCreate: true });
    if (this._rulesById.has(rule.ruleId)) {
      throw makeValidationError(
        "DUPLICATE_RULE",
        `ruleId '${rule.ruleId}' already exists`
      );
    }

    this._rulesById.set(rule.ruleId, rule);
    return cloneRule(rule);
  }

  getRule(ruleId) {
    const rule = this._rulesById.get(ruleId);
    return rule ? cloneRule(rule) : null;
  }

  listRules(status) {
    if (status !== undefined && !RULE_STATUSES.has(status)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "status filter must be one of: proposed, active, disabled, archived"
      );
    }

    const rules = [];
    for (const rule of this._rulesById.values()) {
      if (status === undefined || rule.status === status) {
        rules.push(cloneRule(rule));
      }
    }

    return rules;
  }

  setRuleStatus(ruleId, nextStatus, updateInput = {}) {
    if (typeof ruleId !== "string" || ruleId.trim() === "") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'ruleId' must be a non-empty string"
      );
    }

    if (!RULE_STATUSES.has(nextStatus)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'nextStatus' must be one of: proposed, active, disabled, archived"
      );
    }

    if (!isPlainObject(updateInput)) {
      throw makeValidationError(
        "INVALID_STATUS_UPDATE",
        "status update input must be an object"
      );
    }

    const current = this._rulesById.get(ruleId);
    if (!current) {
      throw makeValidationError("RULE_NOT_FOUND", `ruleId '${ruleId}' was not found`);
    }

    const updated = cloneRule(current);
    updated.status = nextStatus;

    if (updateInput.updatedAt !== undefined) {
      if (!isIso8601Timestamp(updateInput.updatedAt)) {
        throw makeValidationError(
          "INVALID_FIELD",
          "'updatedAt' must be an ISO 8601 timestamp when provided"
        );
      }

      updated.updatedAt = updateInput.updatedAt;
    }

    if (updateInput.notes !== undefined) {
      if (typeof updateInput.notes !== "string") {
        throw makeValidationError(
          "INVALID_FIELD",
          "'notes' must be a string when provided"
        );
      }

      updated.notes = updateInput.notes;
    }

    this._rulesById.set(ruleId, updated);
    return cloneRule(updated);
  }

  resolvePrecedence(ruleIds, options = {}) {
    if (!Array.isArray(ruleIds) || ruleIds.some((entry) => typeof entry !== "string")) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'ruleIds' must be an array of ruleId strings"
      );
    }

    const protectedTargetInvolved = options.protectedTargetInvolved === true;
    const exceptionContext = normalizeExceptionContext(options.exceptionContext);

    const activeRules = [];
    for (const ruleId of ruleIds) {
      const rule = this._rulesById.get(ruleId);
      if (!rule) {
        throw makeValidationError("RULE_NOT_FOUND", `ruleId '${ruleId}' was not found`);
      }

      if (rule.status !== "active") {
        continue;
      }

      if (
        Array.isArray(rule.exceptions) &&
        rule.exceptions.some((entry) => exceptionContext.has(entry))
      ) {
        continue;
      }

      if (rule.enforcementClass === "protected_asset" && !protectedTargetInvolved) {
        continue;
      }

      activeRules.push(rule);
    }

    if (activeRules.length === 0) {
      return {
        effectiveClass: null,
        effectiveRuleIds: [],
        consideredRuleIds: [],
      };
    }

    let highestPriority = Number.NEGATIVE_INFINITY;
    for (const rule of activeRules) {
      const priority = getClassPriority(rule.enforcementClass, protectedTargetInvolved);
      if (priority > highestPriority) {
        highestPriority = priority;
      }
    }

    const effectiveRules = activeRules.filter(
      (rule) =>
        getClassPriority(rule.enforcementClass, protectedTargetInvolved) ===
        highestPriority
    );

    return {
      effectiveClass: effectiveRules[0].enforcementClass,
      effectiveRuleIds: effectiveRules.map((rule) => rule.ruleId),
      consideredRuleIds: activeRules.map((rule) => rule.ruleId),
    };
  }
}

module.exports = {
  ConstraintsRegistry,
};
