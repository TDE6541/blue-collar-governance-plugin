"use strict";

const SKILL_ROUTES = Object.freeze(["/eliminate"]);

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

function assertBoolean(input, fieldName, parentName = "input") {
  if (typeof input[fieldName] !== "boolean") {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be a boolean`
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

function normalizeHoldSnapshot(input, index) {
  const fieldBase = `holdSnapshots[${index}]`;

  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldBase}' must be an object`
    );
  }

  assertRequiredString(input, "holdId", fieldBase);
  assertRequiredString(input, "summary", fieldBase);
  assertRequiredString(input, "status", fieldBase);
  assertBoolean(input, "blocking", fieldBase);
  assertRequiredString(input, "reason", fieldBase);
  assertRequiredString(input, "impact", fieldBase);
  assertStringList(input.evidence, `${fieldBase}.evidence`);
  assertStringList(input.options, `${fieldBase}.options`);
  assertRequiredString(input, "resolutionPath", fieldBase);

  return {
    holdId: input.holdId,
    summary: input.summary,
    status: input.status,
    blocking: input.blocking,
    reason: input.reason,
    impact: input.impact,
    evidence: cloneTextList(input.evidence),
    options: cloneTextList(input.options),
    resolutionPath: input.resolutionPath,
  };
}

function normalizeScarcityAssessment(input, index) {
  const fieldBase = `scarcityReport.assessments[${index}]`;

  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldBase}' must be an object`
    );
  }

  assertRequiredString(input, "holdId", fieldBase);
  assertRequiredString(input, "scarcityState", fieldBase);
  assertRequiredString(input, "rationale", fieldBase);

  if (!Number.isInteger(input.optionCount) || input.optionCount < 0) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldBase}.optionCount' must be a non-negative integer`
    );
  }

  return {
    holdId: input.holdId,
    scarcityState: input.scarcityState,
    optionCount: input.optionCount,
    rationale: input.rationale,
  };
}

function normalizeScarcityReport(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'scarcityReport' must be an object"
    );
  }

  if (!Array.isArray(input.assessments)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'scarcityReport.assessments' must be an array"
    );
  }

  return {
    assessments: input.assessments.map((assessment, index) =>
      normalizeScarcityAssessment(assessment, index)
    ),
  };
}

function buildScarcityIndex(assessments) {
  const indexByHoldId = {};

  for (const assessment of assessments) {
    if (indexByHoldId[assessment.holdId] === undefined) {
      indexByHoldId[assessment.holdId] = assessment;
    }
  }

  return indexByHoldId;
}

function buildHoldRow(hold, scarcityByHoldId) {
  const scarcityAssessment = scarcityByHoldId[hold.holdId];

  return {
    holdId: hold.holdId,
    summary: hold.summary,
    status: hold.status,
    blocking: hold.blocking,
    reason: hold.reason,
    impact: hold.impact,
    evidence: cloneTextList(hold.evidence),
    options: cloneTextList(hold.options),
    resolutionPath: hold.resolutionPath,
    scarcityAssessment: scarcityAssessment
      ? {
          scarcityState: scarcityAssessment.scarcityState,
          optionCount: scarcityAssessment.optionCount,
          rationale: scarcityAssessment.rationale,
        }
      : null,
  };
}

class EliminateSkill {
  renderEliminate(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
    }

    if (input.holdSnapshots === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'holdSnapshots' is required"
      );
    }

    if (!Array.isArray(input.holdSnapshots)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'holdSnapshots' must be an array"
      );
    }

    if (input.scarcityReport === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'scarcityReport' is required"
      );
    }

    const holdSnapshots = input.holdSnapshots.map((hold, index) =>
      normalizeHoldSnapshot(hold, index)
    );

    if (holdSnapshots.length === 0) {
      return {
        route: "/eliminate",
        holdCount: 0,
        holds: [],
        renderNote:
          "no hold snapshots available in supplied input; deterministic clean/no-eliminate result",
      };
    }

    const scarcityReport = normalizeScarcityReport(input.scarcityReport);
    const scarcityByHoldId = buildScarcityIndex(scarcityReport.assessments);

    return {
      route: "/eliminate",
      holdCount: holdSnapshots.length,
      holds: holdSnapshots.map((hold) => buildHoldRow(hold, scarcityByHoldId)),
      renderNote:
        "rendered from existing hold snapshot and existing scarcity assessment when present",
    };
  }
}

module.exports = {
  EliminateSkill,
  SKILL_ROUTES,
};

