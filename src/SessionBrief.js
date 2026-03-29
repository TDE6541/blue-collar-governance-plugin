"use strict";

const RISK_MODES = new Set(["strict", "guarded", "permitted"]);
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

function assertRequiredStringArray(input, fieldName, { nonEmpty = false } = {}) {
  const value = input[fieldName];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an array of strings`
    );
  }

  if (nonEmpty && value.length === 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must include at least one item`
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

function isReferenceOnlyPath(value) {
  const normalized = value.replace(/\\/g, "/").toLowerCase();
  const segments = normalized.split("/").filter((segment) => segment.length > 0);
  return segments.includes("raw");
}

function normalizeBrief(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError("INVALID_BRIEF", "brief input must be an object");
  }

  assertRequiredString(input, "briefId");
  assertRequiredString(input, "goal");
  assertRequiredString(input, "createdAt");
  assertRequiredStringArray(input, "inScope", { nonEmpty: true });
  assertRequiredStringArray(input, "outOfScope", { nonEmpty: true });
  assertRequiredStringArray(input, "protectedAssets");
  assertRequiredStringArray(input, "activeConstraints");
  assertRequiredStringArray(input, "hazards");
  assertRequiredStringArray(input, "expectedOutputs", { nonEmpty: true });
  assertRequiredStringArray(input, "truthSources", { nonEmpty: true });
  assertOptionalStringArray(input, "approvalsNeeded");

  if (!RISK_MODES.has(input.riskMode)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'riskMode' must be one of: strict, guarded, permitted"
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

  if (input.truthSources.some((source) => isReferenceOnlyPath(source))) {
    throw makeValidationError(
      "INVALID_TRUTH_SOURCE",
      "'truthSources' must reference canon surfaces and must not point to raw/ reference-only material"
    );
  }

  return {
    briefId: input.briefId,
    goal: input.goal,
    inScope: [...input.inScope],
    outOfScope: [...input.outOfScope],
    protectedAssets: [...input.protectedAssets],
    activeConstraints: [...input.activeConstraints],
    hazards: [...input.hazards],
    riskMode: input.riskMode,
    expectedOutputs: [...input.expectedOutputs],
    truthSources: [...input.truthSources],
    approvalsNeeded: input.approvalsNeeded ? [...input.approvalsNeeded] : undefined,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    notes: input.notes,
  };
}

function cloneBrief(brief) {
  return {
    ...brief,
    inScope: [...brief.inScope],
    outOfScope: [...brief.outOfScope],
    protectedAssets: [...brief.protectedAssets],
    activeConstraints: [...brief.activeConstraints],
    hazards: [...brief.hazards],
    expectedOutputs: [...brief.expectedOutputs],
    truthSources: [...brief.truthSources],
    approvalsNeeded: brief.approvalsNeeded ? [...brief.approvalsNeeded] : undefined,
  };
}

class SessionBrief {
  constructor(initialBriefs = []) {
    if (!Array.isArray(initialBriefs)) {
      throw makeValidationError(
        "INVALID_BRIEF_COLLECTION",
        "initial briefs must be an array"
      );
    }

    this._briefsById = new Map();

    for (const briefInput of initialBriefs) {
      const brief = normalizeBrief(briefInput);
      if (this._briefsById.has(brief.briefId)) {
        throw makeValidationError(
          "DUPLICATE_BRIEF",
          `briefId '${brief.briefId}' already exists`
        );
      }

      this._briefsById.set(brief.briefId, brief);
    }
  }

  createBrief(briefInput) {
    const brief = normalizeBrief(briefInput);
    if (this._briefsById.has(brief.briefId)) {
      throw makeValidationError(
        "DUPLICATE_BRIEF",
        `briefId '${brief.briefId}' already exists`
      );
    }

    this._briefsById.set(brief.briefId, brief);
    return cloneBrief(brief);
  }

  getBrief(briefId) {
    const brief = this._briefsById.get(briefId);
    return brief ? cloneBrief(brief) : null;
  }

  listBriefs() {
    return Array.from(this._briefsById.values(), cloneBrief);
  }

  evaluateSessionStartReadiness(briefId) {
    if (typeof briefId !== "string" || briefId.trim() === "") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'briefId' must be a non-empty string"
      );
    }

    const brief = this._briefsById.get(briefId);
    if (!brief) {
      throw makeValidationError(
        "BRIEF_NOT_FOUND",
        `briefId '${briefId}' was not found`
      );
    }

    const issues = [];
    if (brief.inScope.length === 0) {
      issues.push("inScope is empty");
    }
    if (brief.outOfScope.length === 0) {
      issues.push("outOfScope is empty");
    }
    if (brief.truthSources.length === 0) {
      issues.push("truthSources is empty");
    }
    if (brief.expectedOutputs.length === 0) {
      issues.push("expectedOutputs is empty");
    }

    const ready = issues.length === 0;

    return {
      briefId,
      ready,
      riskMode: brief.riskMode,
      hasApprovalsNeeded:
        Array.isArray(brief.approvalsNeeded) && brief.approvalsNeeded.length > 0,
      issues,
      summary: ready
        ? "Session brief is explicit and ready for governed start."
        : "Session brief is not ready for governed start.",
    };
  }
}

module.exports = {
  SessionBrief,
};
