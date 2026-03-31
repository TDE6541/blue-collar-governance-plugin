"use strict";

const SKILL_ROUTES = Object.freeze(["/constraints", "/silence-map"]);

const RULE_STATUSES = new Set(["proposed", "active", "disabled", "archived"]);
const ENFORCEMENT_CLASSES = new Set([
  "hard_block",
  "protected_asset",
  "requires_confirmation",
  "scope_limit",
]);
const RULE_SEVERITIES = new Set(["critical", "high", "standard"]);
const RULE_ACTORS = new Set(["architect", "ai"]);

const INTERLOCK_ACTION_CATEGORIES = new Set([
  "destructive_change",
  "protected_surface_change",
  "external_side_effect",
  "permission_escalation",
  "secret_or_sensitive_access",
]);
const INTERLOCK_DEFAULT_OUTCOMES = new Set([
  "stop",
  "require_authorization",
  "allow_with_receipt",
]);
const INTERLOCK_ACTORS = new Set(["architect", "ai"]);

const AUTONOMY_LEVELS = new Set(["FULL_AUTO", "SUPERVISED", "HARD_STOP"]);

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

function assertRequiredString(input, fieldName, parentName) {
  if (typeof input[fieldName] !== "string" || input[fieldName].trim() === "") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.${fieldName}' must be a non-empty string`
    );
  }
}

function assertRequiredBoolean(input, fieldName, parentName) {
  if (typeof input[fieldName] !== "boolean") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.${fieldName}' must be a boolean`
    );
  }
}

function assertStringArray(value, fieldName, parentName) {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string" || entry.trim() === "")
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.${fieldName}' must be an array of non-empty strings`
    );
  }
}

function assertOptionalStringArray(value, fieldName, parentName) {
  if (value === undefined) {
    return;
  }

  assertStringArray(value, fieldName, parentName);
}

function cloneStringArray(values) {
  return [...values];
}

function sortById(values, idField) {
  return [...values].sort((a, b) => a[idField].localeCompare(b[idField]));
}

function normalizeConstraintRule(input, index) {
  const parentName = `constraintsRules[${index}]`;
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(input, "ruleId", parentName);
  assertRequiredString(input, "label", parentName);
  assertRequiredString(input, "instruction", parentName);
  assertRequiredString(input, "rationale", parentName);
  assertRequiredString(input, "createdBy", parentName);
  assertRequiredString(input, "createdAt", parentName);

  assertStringArray(input.evidence, "evidence", parentName);
  assertStringArray(input.appliesTo, "appliesTo", parentName);
  assertOptionalStringArray(input.exceptions, "exceptions", parentName);

  if (!RULE_STATUSES.has(input.status)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.status' must be one of: proposed, active, disabled, archived`
    );
  }

  if (!ENFORCEMENT_CLASSES.has(input.enforcementClass)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.enforcementClass' must be one of: hard_block, protected_asset, requires_confirmation, scope_limit`
    );
  }

  if (!RULE_SEVERITIES.has(input.severity)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.severity' must be one of: critical, high, standard`
    );
  }

  if (!RULE_ACTORS.has(input.createdBy)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.createdBy' must be one of: architect, ai`
    );
  }

  if (!isIso8601Timestamp(input.createdAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.createdAt' must be an ISO 8601 timestamp`
    );
  }

  if (input.updatedAt !== undefined && !isIso8601Timestamp(input.updatedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.updatedAt' must be an ISO 8601 timestamp when provided`
    );
  }

  if (input.notes !== undefined && typeof input.notes !== "string") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.notes' must be a string when provided`
    );
  }

  return {
    ruleId: input.ruleId,
    label: input.label,
    status: input.status,
    enforcementClass: input.enforcementClass,
    severity: input.severity,
    instruction: input.instruction,
    rationale: input.rationale,
    evidence: cloneStringArray(input.evidence),
    appliesTo: cloneStringArray(input.appliesTo),
    exceptions: input.exceptions ? cloneStringArray(input.exceptions) : undefined,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    notes: input.notes,
  };
}

function normalizeConstraintRules(rulesInput) {
  if (!Array.isArray(rulesInput)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'constraintsRules' must be an array"
    );
  }

  const normalized = rulesInput.map((rule, index) =>
    normalizeConstraintRule(rule, index)
  );

  return sortById(normalized, "ruleId");
}

function normalizeSafetyInterlock(input, index) {
  const parentName = `safetyInterlocks[${index}]`;
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(input, "interlockId", parentName);
  assertRequiredString(input, "actionCategory", parentName);
  assertRequiredString(input, "defaultOutcome", parentName);
  assertRequiredBoolean(input, "requiresExplicitAuthorization", parentName);
  assertRequiredString(input, "operatorPrompt", parentName);
  assertRequiredString(input, "rationale", parentName);
  assertRequiredString(input, "createdBy", parentName);
  assertRequiredString(input, "createdAt", parentName);

  assertStringArray(input.evidence, "evidence", parentName);
  assertOptionalStringArray(input.protectedTargets, "protectedTargets", parentName);

  if (!INTERLOCK_ACTION_CATEGORIES.has(input.actionCategory)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.actionCategory' must be one of: destructive_change, protected_surface_change, external_side_effect, permission_escalation, secret_or_sensitive_access`
    );
  }

  if (!INTERLOCK_DEFAULT_OUTCOMES.has(input.defaultOutcome)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.defaultOutcome' must be one of: stop, require_authorization, allow_with_receipt`
    );
  }

  if (!INTERLOCK_ACTORS.has(input.createdBy)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.createdBy' must be one of: architect, ai`
    );
  }

  if (!isIso8601Timestamp(input.createdAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.createdAt' must be an ISO 8601 timestamp`
    );
  }

  if (input.updatedAt !== undefined && !isIso8601Timestamp(input.updatedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.updatedAt' must be an ISO 8601 timestamp when provided`
    );
  }

  if (input.notes !== undefined && typeof input.notes !== "string") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.notes' must be a string when provided`
    );
  }

  return {
    interlockId: input.interlockId,
    actionCategory: input.actionCategory,
    defaultOutcome: input.defaultOutcome,
    requiresExplicitAuthorization: input.requiresExplicitAuthorization,
    operatorPrompt: input.operatorPrompt,
    rationale: input.rationale,
    evidence: cloneStringArray(input.evidence),
    protectedTargets: input.protectedTargets
      ? cloneStringArray(input.protectedTargets)
      : [],
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    notes: input.notes,
  };
}

function normalizeSafetyInterlocks(interlocksInput) {
  if (!Array.isArray(interlocksInput)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'safetyInterlocks' must be an array"
    );
  }

  const normalized = interlocksInput.map((interlock, index) =>
    normalizeSafetyInterlock(interlock, index)
  );

  return sortById(normalized, "interlockId");
}

function normalizeDomainRule(input, index) {
  const parentName = `controlRodProfile.domainRules[${index}]`;
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(input, "domainId", parentName);
  assertRequiredString(input, "label", parentName);
  assertRequiredString(input, "autonomyLevel", parentName);
  assertRequiredString(input, "justification", parentName);

  assertStringArray(input.filePatterns, "filePatterns", parentName);
  assertStringArray(input.operationTypes, "operationTypes", parentName);

  if (!AUTONOMY_LEVELS.has(input.autonomyLevel)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.autonomyLevel' must be one of: FULL_AUTO, SUPERVISED, HARD_STOP`
    );
  }

  return {
    domainId: input.domainId,
    label: input.label,
    filePatterns: cloneStringArray(input.filePatterns),
    operationTypes: cloneStringArray(input.operationTypes),
    autonomyLevel: input.autonomyLevel,
    justification: input.justification,
  };
}

function normalizeControlRodProfile(profileInput) {
  if (!isPlainObject(profileInput)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'controlRodProfile' must be an object"
    );
  }

  assertRequiredString(profileInput, "profileId", "controlRodProfile");
  assertRequiredString(profileInput, "profileLabel", "controlRodProfile");

  if (!Array.isArray(profileInput.domainRules) || profileInput.domainRules.length === 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'controlRodProfile.domainRules' must be a non-empty array"
    );
  }

  const seenDomainIds = new Set();
  const domainRules = profileInput.domainRules.map((domainRule, index) => {
    const normalized = normalizeDomainRule(domainRule, index);
    if (seenDomainIds.has(normalized.domainId)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'controlRodProfile.domainRules' must contain unique domainId values"
      );
    }

    seenDomainIds.add(normalized.domainId);
    return normalized;
  });

  return {
    profileId: profileInput.profileId,
    profileLabel: profileInput.profileLabel,
    domainRules: sortById(domainRules, "domainId"),
  };
}

function toConstraintSummaryItem(rule) {
  return {
    ruleId: rule.ruleId,
    label: rule.label,
    enforcementClass: rule.enforcementClass,
    status: rule.status,
  };
}

function toInterlockSummaryItem(interlock) {
  return {
    interlockId: interlock.interlockId,
    actionCategory: interlock.actionCategory,
    defaultOutcome: interlock.defaultOutcome,
    requiresExplicitAuthorization: interlock.requiresExplicitAuthorization,
  };
}

function toDomainSummaryItem(domainRule) {
  return {
    domainId: domainRule.domainId,
    label: domainRule.label,
    autonomyLevel: domainRule.autonomyLevel,
  };
}

class CompressedSafetyPostureSkills {
  renderConstraints(constraintsRules) {
    const normalizedRules = normalizeConstraintRules(constraintsRules);

    const statusSummary = {
      proposed: 0,
      active: 0,
      disabled: 0,
      archived: 0,
    };

    const enforcementSummary = {
      hard_block: 0,
      protected_asset: 0,
      requires_confirmation: 0,
      scope_limit: 0,
    };

    for (const rule of normalizedRules) {
      statusSummary[rule.status] += 1;
      enforcementSummary[rule.enforcementClass] += 1;
    }

    const maintainedCount = normalizedRules.filter(
      (rule) => rule.status !== "archived"
    ).length;

    return {
      route: "/constraints",
      ruleCount: normalizedRules.length,
      maintainedCount,
      statusSummary,
      enforcementSummary,
      rules: normalizedRules.map((rule) => ({
        ruleId: rule.ruleId,
        label: rule.label,
        status: rule.status,
        enforcementClass: rule.enforcementClass,
        severity: rule.severity,
        instruction: rule.instruction,
        rationale: rule.rationale,
        evidence: cloneStringArray(rule.evidence),
        appliesTo: cloneStringArray(rule.appliesTo),
        exceptions: cloneStringArray(rule.exceptions || []),
        createdBy: rule.createdBy,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
        notes: rule.notes,
      })),
    };
  }

  renderSilenceMap(input) {
    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_INPUT",
        "'silenceMapInput' must be an object"
      );
    }

    const constraintsRules = normalizeConstraintRules(input.constraintsRules);
    const safetyInterlocks = normalizeSafetyInterlocks(input.safetyInterlocks);
    const controlRodProfile = normalizeControlRodProfile(input.controlRodProfile);

    const activeConstraints = constraintsRules.filter(
      (rule) => rule.status === "active"
    );

    const blockedConstraints = activeConstraints.filter(
      (rule) => rule.enforcementClass === "hard_block"
    );

    const restrictedConstraints = activeConstraints.filter(
      (rule) =>
        rule.enforcementClass === "protected_asset" ||
        rule.enforcementClass === "scope_limit"
    );

    const guardedConstraints = activeConstraints.filter(
      (rule) => rule.enforcementClass === "requires_confirmation"
    );

    const blockedInterlocks = safetyInterlocks.filter(
      (interlock) => interlock.defaultOutcome === "stop"
    );

    const guardedInterlocks = safetyInterlocks.filter(
      (interlock) =>
        interlock.defaultOutcome === "require_authorization" ||
        interlock.requiresExplicitAuthorization
    );

    const blockedDomains = controlRodProfile.domainRules.filter(
      (domainRule) => domainRule.autonomyLevel === "HARD_STOP"
    );

    const guardedDomains = controlRodProfile.domainRules.filter(
      (domainRule) => domainRule.autonomyLevel === "SUPERVISED"
    );

    const fullAutoCount = controlRodProfile.domainRules.filter(
      (domainRule) => domainRule.autonomyLevel === "FULL_AUTO"
    ).length;

    return {
      route: "/silence-map",
      profile: {
        profileId: controlRodProfile.profileId,
        profileLabel: controlRodProfile.profileLabel,
      },
      summary: {
        constraint: {
          activeCount: activeConstraints.length,
          blockedCount: blockedConstraints.length,
          restrictedCount: restrictedConstraints.length,
          guardedCount: guardedConstraints.length,
        },
        safetyInterlock: {
          totalCount: safetyInterlocks.length,
          blockedCount: blockedInterlocks.length,
          guardedCount: guardedInterlocks.length,
        },
        controlRod: {
          hardStopCount: blockedDomains.length,
          supervisedCount: guardedDomains.length,
          fullAutoCount,
        },
      },
      blocked: {
        constraints: blockedConstraints.map(toConstraintSummaryItem),
        safetyInterlocks: blockedInterlocks.map(toInterlockSummaryItem),
        controlRodDomains: blockedDomains.map(toDomainSummaryItem),
      },
      restricted: {
        constraints: restrictedConstraints.map(toConstraintSummaryItem),
      },
      guarded: {
        constraints: guardedConstraints.map(toConstraintSummaryItem),
        safetyInterlocks: guardedInterlocks.map(toInterlockSummaryItem),
        controlRodDomains: guardedDomains.map(toDomainSummaryItem),
      },
    };
  }
}

module.exports = {
  CompressedSafetyPostureSkills,
  SKILL_ROUTES,
};
