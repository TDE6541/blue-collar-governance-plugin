"use strict";

const {
  RESTORATION_OUTCOMES,
  VERIFICATION_STATES,
} = require("./RestorationEngine");

const PROJECTION_REASONS = Object.freeze([
  "READY_FOR_BOARD",
  "NO_CONTINUITY_LINK",
  "NOT_VERIFIED",
]);
const RESTORATION_OUTCOME_SET = new Set(RESTORATION_OUTCOMES);
const VERIFICATION_STATE_SET = new Set(VERIFICATION_STATES);

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertRequiredString(input, fieldName, parentName = "record") {
  const value = input[fieldName];
  if (typeof value !== "string" || value.trim() === "") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.${fieldName}' must be a non-empty string`
    );
  }
}

function assertStringArray(values, fieldName) {
  if (
    !Array.isArray(values) ||
    values.some((entry) => typeof entry !== "string" || entry.trim() === "")
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an array of non-empty strings`
    );
  }
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function cloneTextList(values) {
  return values.map((value) => `${value}`);
}

function normalizeRestorationRecord(input, indexLabel = "record") {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${indexLabel}' must be an object`
    );
  }

  assertRequiredString(input, "restorationId", indexLabel);
  assertRequiredString(input, "findingRef", indexLabel);
  assertRequiredString(input, "outcome", indexLabel);
  assertRequiredString(input, "summary", indexLabel);
  assertRequiredString(input, "sessionId", indexLabel);
  assertRequiredString(input, "recordedAt", indexLabel);
  assertRequiredString(input, "recordedBy", indexLabel);
  assertRequiredString(input, "verificationState", indexLabel);
  assertStringArray(input.sourceRefs, `${indexLabel}.sourceRefs`);
  assertStringArray(input.evidenceRefs || [], `${indexLabel}.evidenceRefs`);
  assertStringArray(
    input.verificationEvidenceRefs || [],
    `${indexLabel}.verificationEvidenceRefs`
  );

  if (!RESTORATION_OUTCOME_SET.has(input.outcome)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${indexLabel}.outcome' must be one of: ${RESTORATION_OUTCOMES.join(", ")}`
    );
  }

  if (!VERIFICATION_STATE_SET.has(input.verificationState)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${indexLabel}.verificationState' must be one of: ${VERIFICATION_STATES.join(", ")}`
    );
  }

  if (
    input.verificationState === "VERIFIED" &&
    (!Array.isArray(input.verificationEvidenceRefs) ||
      input.verificationEvidenceRefs.length === 0)
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${indexLabel}.verificationEvidenceRefs' must be a non-empty array when verificationState is VERIFIED`
    );
  }

  if (
    input.continuityEntryId !== undefined &&
    input.continuityEntryId !== null &&
    (typeof input.continuityEntryId !== "string" ||
      input.continuityEntryId.trim() === "")
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${indexLabel}.continuityEntryId' must be a non-empty string when provided`
    );
  }

  return {
    restorationId: input.restorationId,
    findingRef: input.findingRef,
    outcome: input.outcome,
    summary: input.summary,
    sessionId: input.sessionId,
    recordedAt: input.recordedAt,
    recordedBy: input.recordedBy,
    continuityEntryId:
      input.continuityEntryId === undefined || input.continuityEntryId === null
        ? null
        : input.continuityEntryId.trim(),
    sourceRefs: cloneTextList(input.sourceRefs),
    evidenceRefs: cloneTextList(input.evidenceRefs || []),
    verificationState: input.verificationState,
    verificationEvidenceRefs: cloneTextList(
      input.verificationEvidenceRefs || []
    ),
  };
}

function getProjectionEligibility(recordInput) {
  const record = normalizeRestorationRecord(recordInput);

  if (!record.continuityEntryId) {
    return {
      eligible: false,
      reason: "NO_CONTINUITY_LINK",
    };
  }

  if (record.verificationState !== "VERIFIED") {
    return {
      eligible: false,
      reason: "NOT_VERIFIED",
    };
  }

  return {
    eligible: true,
    reason: "READY_FOR_BOARD",
  };
}

function compareRecords(left, right) {
  const timeDelta = Date.parse(left.recordedAt) - Date.parse(right.recordedAt);
  if (timeDelta !== 0) {
    return timeDelta;
  }

  return left.restorationId.localeCompare(right.restorationId);
}

function projectResolvedOutcomes(restorationRecords) {
  if (!Array.isArray(restorationRecords)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'restorationRecords' must be an array"
    );
  }

  const selectedByEntryId = new Map();
  const normalizedRecords = restorationRecords
    .map((record, index) =>
      normalizeRestorationRecord(record, `restorationRecords[${index}]`)
    )
    .sort(compareRecords);

  for (const record of normalizedRecords) {
    const eligibility = getProjectionEligibility(record);
    if (!eligibility.eligible) {
      continue;
    }

    selectedByEntryId.set(record.continuityEntryId, {
      entryId: record.continuityEntryId,
      summary: record.summary,
      outcome: record.outcome,
      sourceRefs: cloneTextList(record.sourceRefs),
      evidenceRefs: uniqueStrings([
        ...record.evidenceRefs,
        ...record.verificationEvidenceRefs,
      ]),
    });
  }

  return Array.from(selectedByEntryId.values()).sort((left, right) =>
    left.entryId.localeCompare(right.entryId)
  );
}

module.exports = {
  PROJECTION_REASONS,
  getProjectionEligibility,
  projectResolvedOutcomes,
};
