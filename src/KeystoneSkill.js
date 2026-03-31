"use strict";

const SKILL_ROUTES = Object.freeze(["/keystone"]);
const SEVERITY_ORDER = Object.freeze(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const SEVERITY_RANK = Object.freeze({
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
});

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertRequiredString(input, fieldName, parentName = "input") {
  const value = input[fieldName];
  if (typeof value !== "string" || value.trim() === "") {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be a non-empty string`
    );
  }
}

function assertStringList(value, fieldName) {
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

function cloneTextList(values) {
  return values.map((value) => `${value}`);
}

function normalizeWalkFinding(input, index) {
  const fieldBase = `walkEvaluation.findings[${index}]`;

  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldBase}' must be an object`
    );
  }

  assertRequiredString(input, "issueRef", fieldBase);
  assertRequiredString(input, "findingType", fieldBase);
  assertRequiredString(input, "severity", fieldBase);
  assertRequiredString(input, "pass", fieldBase);
  assertRequiredString(input, "summary", fieldBase);
  assertStringList(input.evidenceRefs, `${fieldBase}.evidenceRefs`);

  if (!Object.prototype.hasOwnProperty.call(SEVERITY_RANK, input.severity)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldBase}.severity' must be one of: ${SEVERITY_ORDER.join(", ")}`
    );
  }

  return {
    issueRef: input.issueRef,
    findingType: input.findingType,
    severity: input.severity,
    pass: input.pass,
    summary: input.summary,
    evidenceRefs: cloneTextList(input.evidenceRefs),
  };
}

function normalizeWalkEvaluation(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'walkEvaluation' must be an object"
    );
  }

  if (!Array.isArray(input.findings)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'walkEvaluation.findings' must be an array"
    );
  }

  return {
    findings: input.findings.map((finding, index) => normalizeWalkFinding(finding, index)),
  };
}

function selectKeystoneFinding(findings) {
  if (findings.length === 0) {
    return null;
  }

  let bestIndex = 0;
  let bestRank = SEVERITY_RANK[findings[0].severity];

  for (let index = 1; index < findings.length; index += 1) {
    const currentRank = SEVERITY_RANK[findings[index].severity];
    if (currentRank > bestRank) {
      bestRank = currentRank;
      bestIndex = index;
    }
  }

  const chosen = findings[bestIndex];
  return {
    issueRef: chosen.issueRef,
    findingType: chosen.findingType,
    severity: chosen.severity,
    pass: chosen.pass,
    summary: chosen.summary,
    evidenceRefs: cloneTextList(chosen.evidenceRefs),
  };
}

class KeystoneSkill {
  renderKeystone(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
    }

    if (input.walkEvaluation === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'walkEvaluation' is required"
      );
    }

    const walkEvaluation = normalizeWalkEvaluation(input.walkEvaluation);
    const keystone = selectKeystoneFinding(walkEvaluation.findings);

    if (!keystone) {
      return {
        route: "/keystone",
        keystone: null,
        rationale:
          "no findings available in existing Walk source output; deterministic clean/no-keystone result",
      };
    }

    return {
      route: "/keystone",
      keystone,
      rationale:
        "selected as the first finding in existing Walk source order among the highest existing severity present",
    };
  }
}

module.exports = {
  KeystoneSkill,
  SKILL_ROUTES,
};
