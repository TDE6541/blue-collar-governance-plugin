"use strict";

const AUTONOMY_LEVELS = Object.freeze(["FULL_AUTO", "SUPERVISED", "HARD_STOP"]);
const AUTONOMY_LEVEL_SET = new Set(AUTONOMY_LEVELS);

const STARTER_DOMAIN_RULE_TEMPLATES = Object.freeze([
  Object.freeze({
    domainId: "pricing_quote_logic",
    label: "Pricing / quote logic",
    filePatterns: Object.freeze(["**/*pricing*.*", "**/*quote*.*"]),
    operationTypes: Object.freeze(["modify_logic", "change_rules"]),
  }),
  Object.freeze({
    domainId: "customer_data_pii",
    label: "Customer data / PII",
    filePatterns: Object.freeze(["**/*customer*.*", "**/*pii*.*"]),
    operationTypes: Object.freeze(["read_data", "write_data"]),
  }),
  Object.freeze({
    domainId: "database_schema",
    label: "Database schema",
    filePatterns: Object.freeze(["**/*schema*.*", "migrations/**"]),
    operationTypes: Object.freeze(["ddl_change", "migration_change"]),
  }),
  Object.freeze({
    domainId: "protected_destructive_ops",
    label: "Protected / destructive ops",
    filePatterns: Object.freeze(["**/*"]),
    operationTypes: Object.freeze(["delete", "destructive_operation"]),
  }),
  Object.freeze({
    domainId: "auth_security_surfaces",
    label: "Auth / security surfaces",
    filePatterns: Object.freeze(["**/auth.*", "**/auth-*.*", "**/auth_*.*", "**/*-auth.*", "**/*_auth.*", "**/*.auth.*", "**/*oauth*.*", "**/*authent*.*", "**/*authoriz*.*", "**/*authz*.*", "**/*security*.*"]),
    operationTypes: Object.freeze(["auth_change", "security_change"]),
  }),
  Object.freeze({
    domainId: "existing_file_modification",
    label: "Existing file modification",
    filePatterns: Object.freeze(["**/*"]),
    operationTypes: Object.freeze(["modify_existing_file"]),
  }),
  Object.freeze({
    domainId: "new_file_creation",
    label: "New file creation",
    filePatterns: Object.freeze(["**/*"]),
    operationTypes: Object.freeze(["create_new_file"]),
  }),
  Object.freeze({
    domainId: "ui_styling_content",
    label: "UI / styling / content",
    filePatterns: Object.freeze([
      "**/*ui*.*",
      "**/*style*.*",
      "**/*.css",
      "**/*.html",
    ]),
    operationTypes: Object.freeze(["ui_change", "content_change"]),
  }),
  Object.freeze({
    domainId: "documentation_comments",
    label: "Documentation / comments",
    filePatterns: Object.freeze(["docs/**", "**/*.md"]),
    operationTypes: Object.freeze(["documentation_change", "comment_change"]),
  }),
  Object.freeze({
    domainId: "test_files",
    label: "Test files",
    filePatterns: Object.freeze(["tests/**", "**/*.test.*", "**/*.spec.*"]),
    operationTypes: Object.freeze(["test_change", "test_creation"]),
  }),
]);

const STARTER_DOMAIN_IDS = Object.freeze(
  STARTER_DOMAIN_RULE_TEMPLATES.map((rule) => rule.domainId)
);
const STARTER_DOMAIN_ID_SET = new Set(STARTER_DOMAIN_IDS);

const STARTER_PROFILE_IDS = Object.freeze(["conservative", "balanced", "velocity"]);

const STARTER_PROFILE_LABELS = Object.freeze({
  conservative: "Conservative",
  balanced: "Balanced",
  velocity: "Velocity",
});

const STARTER_PROFILE_LEVELS = Object.freeze({
  conservative: Object.freeze({
    pricing_quote_logic: "HARD_STOP",
    customer_data_pii: "HARD_STOP",
    database_schema: "HARD_STOP",
    protected_destructive_ops: "HARD_STOP",
    auth_security_surfaces: "HARD_STOP",
    existing_file_modification: "SUPERVISED",
    new_file_creation: "SUPERVISED",
    ui_styling_content: "SUPERVISED",
    documentation_comments: "FULL_AUTO",
    test_files: "SUPERVISED",
  }),
  balanced: Object.freeze({
    pricing_quote_logic: "SUPERVISED",
    customer_data_pii: "HARD_STOP",
    database_schema: "HARD_STOP",
    protected_destructive_ops: "HARD_STOP",
    auth_security_surfaces: "HARD_STOP",
    existing_file_modification: "SUPERVISED",
    new_file_creation: "FULL_AUTO",
    ui_styling_content: "FULL_AUTO",
    documentation_comments: "FULL_AUTO",
    test_files: "FULL_AUTO",
  }),
  velocity: Object.freeze({
    pricing_quote_logic: "SUPERVISED",
    customer_data_pii: "HARD_STOP",
    database_schema: "SUPERVISED",
    protected_destructive_ops: "HARD_STOP",
    auth_security_surfaces: "SUPERVISED",
    existing_file_modification: "FULL_AUTO",
    new_file_creation: "FULL_AUTO",
    ui_styling_content: "FULL_AUTO",
    documentation_comments: "FULL_AUTO",
    test_files: "FULL_AUTO",
  }),
});

const PERMIT_DECISIONS = Object.freeze(["GRANTED", "DENIED", "CONDITIONAL"]);
const PERMIT_DECISION_SET = new Set(PERMIT_DECISIONS);

const LOTO_SCOPE_TYPES = Object.freeze(["SESSION", "EXPIRY"]);
const LOTO_SCOPE_TYPE_SET = new Set(LOTO_SCOPE_TYPES);

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
  if (!Array.isArray(value) || value.length === 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a non-empty array of strings`
    );
  }

  if (value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a non-empty array of strings`
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

function assertAutonomyLevel(level) {
  if (!AUTONOMY_LEVEL_SET.has(level)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'autonomyLevel' must be one of: ${AUTONOMY_LEVELS.join(", ")}`
    );
  }
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function normalizeDomainRule(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'domainRules' must contain plain objects"
    );
  }

  assertRequiredString(input, "domainId");
  assertRequiredString(input, "label");
  assertRequiredStringArray(input, "filePatterns");
  assertRequiredStringArray(input, "operationTypes");
  assertRequiredString(input, "autonomyLevel");
  assertRequiredString(input, "justification");
  assertAutonomyLevel(input.autonomyLevel);

  if (!STARTER_DOMAIN_ID_SET.has(input.domainId)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'domainId' must be one of: ${STARTER_DOMAIN_IDS.join(", ")}`
    );
  }

  return {
    domainId: input.domainId,
    label: input.label,
    filePatterns: uniqueStrings(input.filePatterns),
    operationTypes: uniqueStrings(input.operationTypes),
    autonomyLevel: input.autonomyLevel,
    justification: input.justification,
  };
}

function assertStarterDomainCoverage(domainRulesById) {
  const missingDomains = STARTER_DOMAIN_IDS.filter(
    (domainId) => !domainRulesById.has(domainId)
  );
  if (missingDomains.length > 0 || domainRulesById.size !== STARTER_DOMAIN_IDS.length) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'domainRules' must include exactly the baseline domains: ${STARTER_DOMAIN_IDS.join(", ")}`
    );
  }
}

function sortDomainRulesByBaseline(domainRulesById) {
  return STARTER_DOMAIN_IDS.map((domainId) => domainRulesById.get(domainId));
}

function normalizeProfileObject(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'controlRodProfile' object must be a plain object"
    );
  }

  assertRequiredString(input, "profileId");
  assertRequiredString(input, "profileLabel");

  if (!Array.isArray(input.domainRules) || input.domainRules.length === 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'domainRules' must be a non-empty array"
    );
  }

  const domainRulesById = new Map();
  for (const domainRuleInput of input.domainRules) {
    const domainRule = normalizeDomainRule(domainRuleInput);
    if (domainRulesById.has(domainRule.domainId)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'domainRules' must contain unique 'domainId' values"
      );
    }

    domainRulesById.set(domainRule.domainId, domainRule);
  }

  assertStarterDomainCoverage(domainRulesById);

  return {
    profileId: input.profileId,
    profileLabel: input.profileLabel,
    domainRules: sortDomainRulesByBaseline(domainRulesById),
  };
}

function buildStarterDomainRule(template, autonomyLevel, profileId) {
  return {
    domainId: template.domainId,
    label: template.label,
    filePatterns: [...template.filePatterns],
    operationTypes: [...template.operationTypes],
    autonomyLevel,
    justification: `Starter profile '${profileId}' posture for ${template.label}.`,
  };
}

function buildStarterProfile(profileId) {
  if (!STARTER_PROFILE_IDS.includes(profileId)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'controlRodProfile' preset id must be one of: ${STARTER_PROFILE_IDS.join(", ")}`
    );
  }

  const profileLevels = STARTER_PROFILE_LEVELS[profileId];
  const profile = {
    profileId,
    profileLabel: STARTER_PROFILE_LABELS[profileId],
    domainRules: STARTER_DOMAIN_RULE_TEMPLATES.map((template) =>
      buildStarterDomainRule(template, profileLevels[template.domainId], profileId)
    ),
  };

  return normalizeProfileObject(profile);
}

function normalizeControlRodProfileInput(controlRodProfile) {
  if (controlRodProfile === undefined) {
    return undefined;
  }

  if (typeof controlRodProfile === "string") {
    return buildStarterProfile(controlRodProfile);
  }

  if (isPlainObject(controlRodProfile)) {
    return normalizeProfileObject(controlRodProfile);
  }

  throw makeValidationError(
    "INVALID_FIELD",
    "'controlRodProfile' must be a preset id string or profile object when provided"
  );
}

function normalizeLotoAuthorizationInput(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'authorization' must be an object"
    );
  }

  assertRequiredString(input, "authorizationId");
  assertRequiredString(input, "domainId");
  assertRequiredString(input, "authorizedBy");
  assertRequiredString(input, "authorizedAt");
  assertRequiredString(input, "reason");
  assertRequiredString(input, "chainRef");

  if (!isIso8601Timestamp(input.authorizedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'authorizedAt' must be an ISO 8601 timestamp"
    );
  }

  if (!isPlainObject(input.scope)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'scope' must be an object"
    );
  }

  assertRequiredString(input.scope, "scopeType");

  if (!LOTO_SCOPE_TYPE_SET.has(input.scope.scopeType)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'scope.scopeType' must be one of: ${LOTO_SCOPE_TYPES.join(", ")}`
    );
  }

  if (input.scope.scopeType === "SESSION") {
    assertRequiredString(input.scope, "sessionId");
  }

  if (input.scope.scopeType === "EXPIRY") {
    assertRequiredString(input.scope, "expiresAt");
    if (!isIso8601Timestamp(input.scope.expiresAt)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'scope.expiresAt' must be an ISO 8601 timestamp"
      );
    }
  }

  assertOptionalStringArray(input, "conditions");

  return {
    authorizationId: input.authorizationId,
    domainId: input.domainId,
    authorizedBy: input.authorizedBy,
    authorizedAt: input.authorizedAt,
    reason: input.reason,
    scope:
      input.scope.scopeType === "SESSION"
        ? {
            scopeType: "SESSION",
            sessionId: input.scope.sessionId,
          }
        : {
            scopeType: "EXPIRY",
            expiresAt: input.scope.expiresAt,
          },
    conditions: uniqueStrings([...(input.conditions || [])]),
    chainRef: input.chainRef,
  };
}

function normalizePermitInput(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'permit' must be an object"
    );
  }

  assertRequiredString(input, "permitId");
  assertRequiredString(input, "sessionId");
  assertRequiredStringArray(input, "requestedDomains");
  assertRequiredString(input, "scopeJustification");
  assertRequiredString(input, "riskAssessment");
  assertRequiredString(input, "rollbackPlan");
  assertRequiredString(input, "operatorDecision");
  assertRequiredString(input, "chainRef");

  if (!PERMIT_DECISION_SET.has(input.operatorDecision)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'operatorDecision' must be one of: ${PERMIT_DECISIONS.join(", ")}`
    );
  }

  assertOptionalStringArray(input, "conditions");

  if (input.operatorDecision === "CONDITIONAL") {
    if (!Array.isArray(input.conditions) || input.conditions.length === 0) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'conditions' must be a non-empty array for CONDITIONAL permits"
      );
    }
  }

  return {
    permitId: input.permitId,
    sessionId: input.sessionId,
    requestedDomains: uniqueStrings(input.requestedDomains),
    scopeJustification: input.scopeJustification,
    riskAssessment: input.riskAssessment,
    rollbackPlan: input.rollbackPlan,
    operatorDecision: input.operatorDecision,
    conditions: uniqueStrings([...(input.conditions || [])]),
    chainRef: input.chainRef,
  };
}

function resolveDomainRule(profile, domainId) {
  if (!isPlainObject(profile) || !Array.isArray(profile.domainRules)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'profile' must be a normalized control-rod profile with domainRules"
    );
  }

  const domainRule = profile.domainRules.find(
    (rule) => isPlainObject(rule) && rule.domainId === domainId
  );

  if (!domainRule) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'domainId' '${domainId}' was not found in the supplied profile`
    );
  }

  return domainRule;
}

function evaluateHardStopGateInput(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "hard-stop gate input must be an object"
    );
  }

  assertRequiredString(input, "domainId");
  assertRequiredString(input, "sessionId");
  assertRequiredString(input, "evaluatedAt");

  if (!isIso8601Timestamp(input.evaluatedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'evaluatedAt' must be an ISO 8601 timestamp"
    );
  }

  const domainRule = resolveDomainRule(input.profile, input.domainId);

  if (domainRule.autonomyLevel !== "HARD_STOP") {
    return {
      domainId: input.domainId,
      autonomyLevel: domainRule.autonomyLevel,
      requiresLoto: false,
      requiresPermit: false,
      mayProceed: true,
      constrained: false,
      statusCode: "NOT_HARD_STOP",
      summary: "Permit and LOTO semantics apply only to HARD_STOP domains.",
      chainRefs: [],
      conditions: [],
    };
  }

  if (input.authorization === undefined) {
    throw makeValidationError(
      "LOTO_REQUIRED",
      "HARD_STOP domains require a LOTO authorization object"
    );
  }

  const authorization = normalizeLotoAuthorizationInput(input.authorization);

  if (authorization.domainId !== input.domainId) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'authorization.domainId' must match the gate 'domainId'"
    );
  }

  if (authorization.scope.scopeType === "SESSION") {
    if (authorization.scope.sessionId !== input.sessionId) {
      throw makeValidationError(
        "INVALID_FIELD",
        "session-bound authorization must match the gate 'sessionId'"
      );
    }
  } else if (Date.parse(input.evaluatedAt) > Date.parse(authorization.scope.expiresAt)) {
    return {
      domainId: input.domainId,
      autonomyLevel: domainRule.autonomyLevel,
      requiresLoto: true,
      requiresPermit: true,
      mayProceed: false,
      constrained: false,
      statusCode: "AUTH_EXPIRED",
      summary: "LOTO authorization has expired for this HARD_STOP domain.",
      authorizationRef: authorization.authorizationId,
      permitRef: undefined,
      permitDecision: undefined,
      chainRefs: [authorization.chainRef],
      conditions: [...authorization.conditions],
    };
  }

  if (input.permit === undefined) {
    throw makeValidationError(
      "PERMIT_REQUIRED",
      "HARD_STOP domains require a permit object"
    );
  }

  const permit = normalizePermitInput(input.permit);

  if (permit.sessionId !== input.sessionId) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'permit.sessionId' must match the gate 'sessionId'"
    );
  }

  if (!permit.requestedDomains.includes(input.domainId)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'permit.requestedDomains' must include the gate 'domainId'"
    );
  }

  if (permit.operatorDecision === "GRANTED") {
    return {
      domainId: input.domainId,
      autonomyLevel: domainRule.autonomyLevel,
      requiresLoto: true,
      requiresPermit: true,
      mayProceed: true,
      constrained: false,
      statusCode: "PERMIT_GRANTED",
      summary: "HARD_STOP gate passed with valid LOTO authorization and granted permit.",
      authorizationRef: authorization.authorizationId,
      permitRef: permit.permitId,
      permitDecision: permit.operatorDecision,
      chainRefs: [authorization.chainRef, permit.chainRef],
      conditions: [...permit.conditions],
    };
  }

  if (permit.operatorDecision === "CONDITIONAL") {
    return {
      domainId: input.domainId,
      autonomyLevel: domainRule.autonomyLevel,
      requiresLoto: true,
      requiresPermit: true,
      mayProceed: true,
      constrained: true,
      statusCode: "PERMIT_CONDITIONAL",
      summary: "HARD_STOP gate passed with conditional permit constraints.",
      authorizationRef: authorization.authorizationId,
      permitRef: permit.permitId,
      permitDecision: permit.operatorDecision,
      chainRefs: [authorization.chainRef, permit.chainRef],
      conditions: [...permit.conditions],
    };
  }

  return {
    domainId: input.domainId,
    autonomyLevel: domainRule.autonomyLevel,
    requiresLoto: true,
    requiresPermit: true,
    mayProceed: false,
    constrained: false,
    statusCode: "PERMIT_DENIED",
    summary: "HARD_STOP gate denied by permit decision.",
    authorizationRef: authorization.authorizationId,
    permitRef: permit.permitId,
    permitDecision: permit.operatorDecision,
    chainRefs: [authorization.chainRef, permit.chainRef],
    conditions: [...permit.conditions],
  };
}

class ControlRodMode {
  listStarterProfileIds() {
    return [...STARTER_PROFILE_IDS];
  }

  resolveProfile(controlRodProfile) {
    return normalizeControlRodProfileInput(controlRodProfile);
  }

  validateLotoAuthorization(authorization) {
    return normalizeLotoAuthorizationInput(authorization);
  }

  validatePermit(permit) {
    return normalizePermitInput(permit);
  }

  evaluateHardStopGate(input) {
    return evaluateHardStopGateInput(input);
  }
}

module.exports = {
  ControlRodMode,
  AUTONOMY_LEVELS,
  STARTER_PROFILE_IDS,
  STARTER_DOMAIN_IDS,
  PERMIT_DECISIONS,
  LOTO_SCOPE_TYPES,
  normalizeControlRodProfileInput,
  normalizeLotoAuthorizationInput,
  normalizePermitInput,
};
