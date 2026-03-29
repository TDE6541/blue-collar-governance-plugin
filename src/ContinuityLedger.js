"use strict";

const ENTRY_TYPES = new Set([
  "hold",
  "blocked_operation",
  "operator_deferred_decision",
  "omission_finding",
]);

const EXCLUDED_REASONS = new Set([
  "rejected_unauthorized_change",
  "dismissed_false_positive",
  "informational_note",
  "completed_closed_event",
]);

const OPERATOR_OUTCOMES = new Set(["resolve", "dismiss", "explicitly_accept"]);
const OPERATION_CLASSES = new Set(["protected", "destructive"]);
const ACTORS = new Set(["architect", "ai"]);
const JUNK_DRAWER_FIELDS = new Set([
  "standingRiskScore",
  "standingRiskLevel",
  "omissionCoverageScore",
  "boardGroup",
  "boardColumn",
  "boardLane",
]);

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

function uniqueStrings(values) {
  return [...new Set(values)];
}

function assertNoJunkDrawerFields(input) {
  for (const field of JUNK_DRAWER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'${field}' is not allowed in ContinuityLedger entries`
      );
    }
  }
}

function assertQualifyingInput(input) {
  if (input.exclusionReason !== undefined) {
    if (typeof input.exclusionReason !== "string") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'exclusionReason' must be a string when provided"
      );
    }

    if (EXCLUDED_REASONS.has(input.exclusionReason)) {
      throw makeValidationError(
        "NON_QUALIFYING_ENTRY",
        `'${input.exclusionReason}' entries must not persist in continuity`
      );
    }
  }

  if (input.qualifiesAsUnresolved !== undefined && input.qualifiesAsUnresolved !== true) {
    throw makeValidationError(
      "NON_QUALIFYING_ENTRY",
      "only unresolved, still-relevant items may persist in continuity"
    );
  }

  if (input.entryType === "blocked_operation") {
    if (!OPERATION_CLASSES.has(input.operationClass)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'operationClass' must be 'protected' or 'destructive' for blocked_operation entries"
      );
    }

    if (input.stillRelevant !== true) {
      throw makeValidationError(
        "NON_QUALIFYING_ENTRY",
        "blocked_operation entries must be still relevant to persist"
      );
    }
  }
}

function normalizeNewEntry(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_ENTRY",
      "continuity entry input must be an object"
    );
  }

  assertNoJunkDrawerFields(input);
  assertRequiredString(input, "entryId");
  assertRequiredString(input, "entryType");
  assertRequiredString(input, "summary");
  assertRequiredString(input, "originSessionId");
  assertRequiredString(input, "lastSeenSessionId");
  assertRequiredString(input, "createdAt");
  assertRequiredStringArray(input, "sourceRefs");
  assertOptionalStringArray(input, "evidenceRefs");

  if (!ENTRY_TYPES.has(input.entryType)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'entryType' must be one of: hold, blocked_operation, operator_deferred_decision, omission_finding"
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

  assertQualifyingInput(input);

  const initialSessionCount =
    input.originSessionId === input.lastSeenSessionId ? 1 : 2;

  return {
    entryId: input.entryId,
    entryType: input.entryType,
    summary: input.summary,
    originSessionId: input.originSessionId,
    lastSeenSessionId: input.lastSeenSessionId,
    sessionCount: initialSessionCount,
    carryCount: initialSessionCount - 1,
    sourceRefs: uniqueStrings([...input.sourceRefs]),
    evidenceRefs: uniqueStrings([...(input.evidenceRefs || [])]),
    operationClass: input.operationClass,
    stillRelevant: input.stillRelevant,
    operatorOutcome: undefined,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    resolvedAt: undefined,
    notes: input.notes,
  };
}

function cloneEntry(entry) {
  return {
    ...entry,
    sourceRefs: [...entry.sourceRefs],
    evidenceRefs: [...entry.evidenceRefs],
  };
}

class ContinuityLedger {
  constructor(initialEntries = []) {
    if (!Array.isArray(initialEntries)) {
      throw makeValidationError(
        "INVALID_ENTRY_COLLECTION",
        "initial entries must be an array"
      );
    }

    this._entriesById = new Map();

    for (const entryInput of initialEntries) {
      const entry = normalizeNewEntry(entryInput);
      if (this._entriesById.has(entry.entryId)) {
        throw makeValidationError(
          "DUPLICATE_ENTRY",
          `entryId '${entry.entryId}' already exists`
        );
      }

      this._entriesById.set(entry.entryId, entry);
    }
  }

  upsertEntry(entryInput) {
    const normalizedInput = normalizeNewEntry(entryInput);
    const existing = this._entriesById.get(normalizedInput.entryId);

    if (!existing) {
      this._entriesById.set(normalizedInput.entryId, normalizedInput);
      return cloneEntry(normalizedInput);
    }

    if (existing.entryType !== normalizedInput.entryType) {
      throw makeValidationError(
        "INVALID_ENTRY",
        "existing continuity entries must retain their original entryType"
      );
    }

    if (existing.operatorOutcome !== undefined) {
      throw makeValidationError(
        "NON_QUALIFYING_ENTRY",
        "entries with terminal operator outcomes must not be carried forward"
      );
    }

    existing.summary = normalizedInput.summary;
    existing.sourceRefs = uniqueStrings([
      ...existing.sourceRefs,
      ...normalizedInput.sourceRefs,
    ]);
    existing.evidenceRefs = uniqueStrings([
      ...existing.evidenceRefs,
      ...normalizedInput.evidenceRefs,
    ]);
    existing.operationClass = normalizedInput.operationClass;
    existing.stillRelevant = normalizedInput.stillRelevant;
    existing.notes = normalizedInput.notes;

    if (existing.lastSeenSessionId !== normalizedInput.lastSeenSessionId) {
      existing.lastSeenSessionId = normalizedInput.lastSeenSessionId;
      existing.sessionCount += 1;
      existing.carryCount += 1;
    }

    existing.updatedAt = normalizedInput.updatedAt || normalizedInput.createdAt;

    return cloneEntry(existing);
  }

  recordOperatorOutcome(entryId, outcome, outcomeInput = {}) {
    if (typeof entryId !== "string" || entryId.trim() === "") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'entryId' must be a non-empty string"
      );
    }

    if (!OPERATOR_OUTCOMES.has(outcome)) {
      throw makeValidationError(
        "INVALID_OUTCOME",
        "'outcome' must be one of: resolve, dismiss, explicitly_accept"
      );
    }

    const entry = this._entriesById.get(entryId);
    if (!entry) {
      throw makeValidationError(
        "ENTRY_NOT_FOUND",
        `entryId '${entryId}' was not found`
      );
    }

    if (!isPlainObject(outcomeInput)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'outcomeInput' must be an object when provided"
      );
    }

    if (!isIso8601Timestamp(outcomeInput.updatedAt)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'updatedAt' must be an ISO 8601 timestamp for operator outcomes"
      );
    }

    if (
      outcomeInput.resolvedAt !== undefined &&
      !isIso8601Timestamp(outcomeInput.resolvedAt)
    ) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'resolvedAt' must be an ISO 8601 timestamp when provided"
      );
    }

    entry.operatorOutcome = outcome;
    entry.updatedAt = outcomeInput.updatedAt;
    entry.resolvedAt = outcomeInput.resolvedAt || outcomeInput.updatedAt;

    return cloneEntry(entry);
  }

  getEntry(entryId) {
    const entry = this._entriesById.get(entryId);
    if (!entry) {
      return null;
    }

    return cloneEntry(entry);
  }

  listCarryForwardEntries() {
    const entries = [];

    for (const entry of this._entriesById.values()) {
      if (entry.operatorOutcome === undefined) {
        entries.push(cloneEntry(entry));
      }
    }

    return entries;
  }
}

module.exports = {
  ContinuityLedger,
};


