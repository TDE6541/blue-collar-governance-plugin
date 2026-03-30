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
    filePatterns: Object.freeze(["**/*auth*.*", "**/*security*.*"]),
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

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function assertAutonomyLevel(level) {
  if (!AUTONOMY_LEVEL_SET.has(level)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'autonomyLevel' must be one of: ${AUTONOMY_LEVELS.join(", ")}`
    );
  }
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
    filePatterns: [...new Set(input.filePatterns)],
    operationTypes: [...new Set(input.operationTypes)],
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

class ControlRodMode {
  listStarterProfileIds() {
    return [...STARTER_PROFILE_IDS];
  }

  resolveProfile(controlRodProfile) {
    return normalizeControlRodProfileInput(controlRodProfile);
  }
}

module.exports = {
  ControlRodMode,
  AUTONOMY_LEVELS,
  STARTER_PROFILE_IDS,
  STARTER_DOMAIN_IDS,
  normalizeControlRodProfileInput,
};
