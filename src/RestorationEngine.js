"use strict";

const crypto = require("node:crypto");

const FINDING_SOURCE_TYPES = Object.freeze([
  "standing_risk",
  "omission",
  "foremans_walk",
  "manual",
]);
const FINDING_SOURCE_TYPE_SET = new Set(FINDING_SOURCE_TYPES);

const RESTORATION_OUTCOMES = Object.freeze([
  "resolve",
  "dismiss",
  "explicitly_accept",
]);
const RESTORATION_OUTCOME_SET = new Set(RESTORATION_OUTCOMES);

const VERIFICATION_STATES = Object.freeze(["UNVERIFIED", "VERIFIED"]);
const VERIFICATION_STATE_SET = new Set(VERIFICATION_STATES);

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

function assertRequiredString(input, fieldName, parentName = "input") {
  const value = input[fieldName];
  if (typeof value !== "string" || value.trim() === "") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.${fieldName}' must be a non-empty string`
    );
  }
}

function assertStringArray(value, fieldName, { allowEmpty = true } = {}) {
  if (!Array.isArray(value)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an array of strings`
    );
  }

  if (!allowEmpty && value.length === 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a non-empty array of strings`
    );
  }

  if (value.some((item) => typeof item !== "string" || item.trim() === "")) {
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

function normalizeSegment(value) {
  return value.trim().replace(/\\/g, "/");
}

function encodeSegment(value) {
  return encodeURIComponent(normalizeSegment(value));
}

function normalizeFindingIdentity(input, parentName = "finding") {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(input, "sourceType", parentName);

  if (!FINDING_SOURCE_TYPE_SET.has(input.sourceType)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${parentName}.sourceType' must be one of: ${FINDING_SOURCE_TYPES.join(", ")}`
    );
  }

  switch (input.sourceType) {
    case "standing_risk":
      assertRequiredString(input, "entryId", parentName);
      return {
        sourceType: input.sourceType,
        entryId: normalizeSegment(input.entryId),
      };
    case "omission":
      assertRequiredString(input, "sessionId", parentName);
      assertRequiredString(input, "profilePack", parentName);
      assertRequiredString(input, "missingItemCode", parentName);
      return {
        sourceType: input.sourceType,
        sessionId: normalizeSegment(input.sessionId),
        profilePack: normalizeSegment(input.profilePack),
        missingItemCode: normalizeSegment(input.missingItemCode),
      };
    case "foremans_walk":
      assertRequiredString(input, "sessionOfRecordRef", parentName);
      assertRequiredString(input, "issueRef", parentName);
      return {
        sourceType: input.sourceType,
        sessionOfRecordRef: normalizeSegment(input.sessionOfRecordRef),
        issueRef: normalizeSegment(input.issueRef),
      };
    case "manual":
      assertRequiredString(input, "manualFindingKey", parentName);
      assertRequiredString(input, "findingType", parentName);
      assertRequiredString(input, "sourceArtifact", parentName);
      assertRequiredString(input, "sourceLocation", parentName);
      return {
        sourceType: input.sourceType,
        manualFindingKey: normalizeSegment(input.manualFindingKey),
        findingType: normalizeSegment(input.findingType),
        sourceArtifact: normalizeSegment(input.sourceArtifact),
        sourceLocation: normalizeSegment(input.sourceLocation),
      };
    default:
      throw makeValidationError(
        "INVALID_FIELD",
        `'${parentName}.sourceType' is unsupported`
      );
  }
}

function cloneFindingIdentity(identity) {
  return { ...identity };
}

function buildFindingRef(findingIdentity) {
  switch (findingIdentity.sourceType) {
    case "standing_risk":
      return `standing-risk:${encodeSegment(findingIdentity.entryId)}`;
    case "omission":
      return `omission:${encodeSegment(
        findingIdentity.sessionId
      )}:${encodeSegment(findingIdentity.profilePack)}:${encodeSegment(
        findingIdentity.missingItemCode
      )}`;
    case "foremans_walk":
      return `foremans-walk:${encodeSegment(
        findingIdentity.sessionOfRecordRef
      )}:${encodeSegment(findingIdentity.issueRef)}`;
    case "manual":
      return `manual:${encodeSegment(
        findingIdentity.manualFindingKey
      )}:${encodeSegment(findingIdentity.findingType)}:${encodeSegment(
        findingIdentity.sourceArtifact
      )}:${encodeSegment(findingIdentity.sourceLocation)}`;
    default:
      throw makeValidationError(
        "INVALID_FIELD",
        "'findingIdentity.sourceType' is unsupported"
      );
  }
}

function buildRestorationId(record) {
  const digest = crypto
    .createHash("sha1")
    .update(
      JSON.stringify({
        findingRef: record.findingRef,
        outcome: record.outcome,
        summary: record.summary,
        sessionId: record.sessionId,
        recordedAt: record.recordedAt,
        recordedBy: record.recordedBy,
      })
    )
    .digest("hex")
    .slice(0, 16);

  return `restoration:${digest}`;
}

function cloneRestorationRecord(record) {
  const cloned = {
    restorationId: record.restorationId,
    findingRef: record.findingRef,
    findingIdentity: cloneFindingIdentity(record.findingIdentity),
    outcome: record.outcome,
    summary: record.summary,
    sessionId: record.sessionId,
    recordedAt: record.recordedAt,
    recordedBy: record.recordedBy,
    continuityEntryId: record.continuityEntryId,
    sourceRefs: cloneTextList(record.sourceRefs),
    evidenceRefs: cloneTextList(record.evidenceRefs),
    verificationState: record.verificationState,
    verificationEvidenceRefs: cloneTextList(record.verificationEvidenceRefs),
  };

  if (record.chainEntryId !== undefined) {
    cloned.chainEntryId = record.chainEntryId;
  }

  return cloned;
}

function normalizeCreateInput(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError("INVALID_INPUT", "'input' must be an object");
  }

  if (input.finding === undefined) {
    throw makeValidationError("INVALID_INPUT", "'finding' is required");
  }

  assertRequiredString(input, "outcome");
  assertRequiredString(input, "summary");
  assertRequiredString(input, "sessionId");
  assertRequiredString(input, "recordedAt");
  assertRequiredString(input, "recordedBy");
  assertStringArray(input.sourceRefs, "sourceRefs", { allowEmpty: false });
  assertStringArray(input.evidenceRefs || [], "evidenceRefs");

  if (!RESTORATION_OUTCOME_SET.has(input.outcome)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'outcome' must be one of: ${RESTORATION_OUTCOMES.join(", ")}`
    );
  }

  if (!isIso8601Timestamp(input.recordedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'recordedAt' must be an ISO 8601 timestamp"
    );
  }

  const verificationState =
    input.verificationState === undefined
      ? "UNVERIFIED"
      : input.verificationState;

  if (!VERIFICATION_STATE_SET.has(verificationState)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'verificationState' must be one of: ${VERIFICATION_STATES.join(", ")}`
    );
  }

  const verificationEvidenceRefs = input.verificationEvidenceRefs || [];
  assertStringArray(verificationEvidenceRefs, "verificationEvidenceRefs");

  if (verificationState === "VERIFIED" && verificationEvidenceRefs.length === 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'verificationEvidenceRefs' must be a non-empty array when 'verificationState' is VERIFIED"
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
      "'continuityEntryId' must be a non-empty string when provided"
    );
  }

  return {
    findingIdentity: normalizeFindingIdentity(input.finding),
    outcome: input.outcome,
    summary: input.summary.trim(),
    sessionId: input.sessionId.trim(),
    recordedAt: input.recordedAt,
    recordedBy: input.recordedBy.trim(),
    continuityEntryId:
      input.continuityEntryId === undefined || input.continuityEntryId === null
        ? null
        : input.continuityEntryId.trim(),
    sourceRefs: uniqueStrings(cloneTextList(input.sourceRefs)),
    evidenceRefs: uniqueStrings(cloneTextList(input.evidenceRefs || [])),
    verificationState,
    verificationEvidenceRefs: uniqueStrings(
      cloneTextList(verificationEvidenceRefs)
    ),
  };
}

function normalizeStoredRecord(input, fieldBase = "payload.record") {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldBase}' must be an object`
    );
  }

  assertRequiredString(input, "restorationId", fieldBase);
  assertRequiredString(input, "findingRef", fieldBase);
  assertRequiredString(input, "outcome", fieldBase);
  assertRequiredString(input, "summary", fieldBase);
  assertRequiredString(input, "sessionId", fieldBase);
  assertRequiredString(input, "recordedAt", fieldBase);
  assertRequiredString(input, "recordedBy", fieldBase);
  assertRequiredString(input, "verificationState", fieldBase);
  assertStringArray(input.sourceRefs, `${fieldBase}.sourceRefs`, {
    allowEmpty: false,
  });
  assertStringArray(input.evidenceRefs || [], `${fieldBase}.evidenceRefs`);
  assertStringArray(
    input.verificationEvidenceRefs || [],
    `${fieldBase}.verificationEvidenceRefs`
  );

  if (!RESTORATION_OUTCOME_SET.has(input.outcome)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldBase}.outcome' must be one of: ${RESTORATION_OUTCOMES.join(", ")}`
    );
  }

  if (!VERIFICATION_STATE_SET.has(input.verificationState)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldBase}.verificationState' must be one of: ${VERIFICATION_STATES.join(", ")}`
    );
  }

  if (!isIso8601Timestamp(input.recordedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldBase}.recordedAt' must be an ISO 8601 timestamp`
    );
  }

  if (
    input.verificationState === "VERIFIED" &&
    (!Array.isArray(input.verificationEvidenceRefs) ||
      input.verificationEvidenceRefs.length === 0)
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldBase}.verificationEvidenceRefs' must be a non-empty array when verificationState is VERIFIED`
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
      `'${fieldBase}.continuityEntryId' must be a non-empty string when provided`
    );
  }

  const findingIdentity = normalizeFindingIdentity(
    input.findingIdentity,
    `${fieldBase}.findingIdentity`
  );
  const expectedFindingRef = buildFindingRef(findingIdentity);
  if (input.findingRef !== expectedFindingRef) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldBase}.findingRef' must match the normalized finding identity`
    );
  }

  return {
    restorationId: input.restorationId,
    findingRef: input.findingRef,
    findingIdentity,
    outcome: input.outcome,
    summary: input.summary.trim(),
    sessionId: input.sessionId.trim(),
    recordedAt: input.recordedAt,
    recordedBy: input.recordedBy.trim(),
    continuityEntryId:
      input.continuityEntryId === undefined || input.continuityEntryId === null
        ? null
        : input.continuityEntryId.trim(),
    sourceRefs: uniqueStrings(cloneTextList(input.sourceRefs)),
    evidenceRefs: uniqueStrings(cloneTextList(input.evidenceRefs || [])),
    verificationState: input.verificationState,
    verificationEvidenceRefs: uniqueStrings(
      cloneTextList(input.verificationEvidenceRefs || [])
    ),
  };
}

function normalizeChainEntry(input, index) {
  const fieldBase = `chainEntries[${index}]`;
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldBase}' must be an object`
    );
  }

  assertRequiredString(input, "entryId", fieldBase);
  assertRequiredString(input, "entryType", fieldBase);
  assertRequiredString(input, "recordedAt", fieldBase);
  assertRequiredString(input, "sessionId", fieldBase);
  assertRequiredString(input, "sourceArtifact", fieldBase);
  assertRequiredString(input, "sourceLocation", fieldBase);

  if (!isIso8601Timestamp(input.recordedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldBase}.recordedAt' must be an ISO 8601 timestamp`
    );
  }

  if (!isPlainObject(input.payload)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldBase}.payload' must be an object`
    );
  }

  assertStringArray(input.linkedEntryRefs || [], `${fieldBase}.linkedEntryRefs`);

  return {
    entryId: input.entryId,
    entryType: input.entryType,
    recordedAt: input.recordedAt,
    sessionId: input.sessionId,
    sourceArtifact: input.sourceArtifact,
    sourceLocation: input.sourceLocation,
    payload: input.payload,
    linkedEntryRefs: cloneTextList(input.linkedEntryRefs || []),
  };
}

function compareRestorationRecords(left, right) {
  const timeDelta = Date.parse(left.recordedAt) - Date.parse(right.recordedAt);
  if (timeDelta !== 0) {
    return timeDelta;
  }

  if (left.restorationId < right.restorationId) {
    return -1;
  }
  if (left.restorationId > right.restorationId) {
    return 1;
  }

  const leftChainEntryId = left.chainEntryId || "";
  const rightChainEntryId = right.chainEntryId || "";
  return leftChainEntryId.localeCompare(rightChainEntryId);
}

class RestorationEngine {
  createRecord(input) {
    const normalized = normalizeCreateInput(input);
    const findingRef = buildFindingRef(normalized.findingIdentity);
    const record = {
      restorationId: buildRestorationId({
        findingRef,
        outcome: normalized.outcome,
        summary: normalized.summary,
        sessionId: normalized.sessionId,
        recordedAt: normalized.recordedAt,
        recordedBy: normalized.recordedBy,
      }),
      findingRef,
      findingIdentity: cloneFindingIdentity(normalized.findingIdentity),
      outcome: normalized.outcome,
      summary: normalized.summary,
      sessionId: normalized.sessionId,
      recordedAt: normalized.recordedAt,
      recordedBy: normalized.recordedBy,
      continuityEntryId: normalized.continuityEntryId,
      sourceRefs: cloneTextList(normalized.sourceRefs),
      evidenceRefs: cloneTextList(normalized.evidenceRefs),
      verificationState: normalized.verificationState,
      verificationEvidenceRefs: cloneTextList(
        normalized.verificationEvidenceRefs
      ),
    };

    return cloneRestorationRecord(record);
  }

  listRecords(chainEntries) {
    if (!Array.isArray(chainEntries)) {
      throw makeValidationError(
        "INVALID_INPUT",
        "'chainEntries' must be an array"
      );
    }

    const records = [];

    for (let index = 0; index < chainEntries.length; index += 1) {
      const entry = normalizeChainEntry(chainEntries[index], index);

      if (entry.entryType !== "OPERATOR_ACTION") {
        continue;
      }

      if (entry.payload.action !== "restoration_recorded") {
        continue;
      }

      const record = normalizeStoredRecord(
        entry.payload.record,
        `chainEntries[${index}].payload.record`
      );

      records.push({
        ...record,
        chainEntryId: entry.entryId,
      });
    }

    return records
      .sort(compareRestorationRecords)
      .map((record) => cloneRestorationRecord(record));
  }
}

module.exports = {
  FINDING_SOURCE_TYPES,
  RESTORATION_OUTCOMES,
  VERIFICATION_STATES,
  RestorationEngine,
};
