"use strict";

const { RestorationEngine } = require("./RestorationEngine");
const {
  getProjectionEligibility,
  projectResolvedOutcomes,
} = require("./RestorationProjectionAdapter");

const SKILL_ROUTES = Object.freeze(["/restoration"]);

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeChainView(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'chainView' must be an object"
    );
  }

  assertRequiredString(input, "chainId", "chainView");

  if (!Array.isArray(input.entries)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'chainView.entries' must be an array"
    );
  }

  return {
    chainId: input.chainId,
    entries: cloneValue(input.entries),
  };
}

class RestorationSkill {
  renderRestoration(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
    }

    if (input.chainView === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'chainView' is required"
      );
    }

    const chainView = normalizeChainView(input.chainView);
    const engine = new RestorationEngine();
    const records = engine.listRecords(chainView.entries);
    const boardResolvedOutcomes = projectResolvedOutcomes(records);

    const renderedRecords = records.map((record) => ({
      chainEntryId: record.chainEntryId,
      restorationId: record.restorationId,
      findingRef: record.findingRef,
      findingIdentity: cloneValue(record.findingIdentity),
      outcome: record.outcome,
      summary: record.summary,
      sessionId: record.sessionId,
      recordedAt: record.recordedAt,
      recordedBy: record.recordedBy,
      continuityEntryId: record.continuityEntryId,
      verificationState: record.verificationState,
      projectionEligibility: getProjectionEligibility(record),
      sourceRefs: [...record.sourceRefs],
      evidenceRefs: [...record.evidenceRefs],
      verificationEvidenceRefs: [...record.verificationEvidenceRefs],
    }));

    return {
      route: "/restoration",
      chainId: chainView.chainId,
      recordCount: renderedRecords.length,
      verifiedCount: renderedRecords.filter(
        (record) => record.verificationState === "VERIFIED"
      ).length,
      boardProjectionCount: boardResolvedOutcomes.length,
      records: renderedRecords,
      boardResolvedOutcomes,
    };
  }
}

module.exports = {
  RestorationSkill,
  SKILL_ROUTES,
};
