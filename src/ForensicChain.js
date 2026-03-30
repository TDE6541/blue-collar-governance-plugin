"use strict";

const ENTRY_TYPES = new Set([
  "CLAIM",
  "EVIDENCE",
  "GAP",
  "FINDING",
  "OPERATOR_ACTION",
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

function assertLinkedEntryRefs(input) {
  const value = input.linkedEntryRefs;
  if (!Array.isArray(value)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'linkedEntryRefs' must be an array of non-empty strings"
    );
  }

  if (value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'linkedEntryRefs' must be an array of non-empty strings"
    );
  }
}

function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }

  if (isPlainObject(value)) {
    const clone = {};
    for (const [key, entryValue] of Object.entries(value)) {
      clone[key] = deepClone(entryValue);
    }

    return clone;
  }

  return value;
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      deepFreeze(entry);
    }

    return Object.freeze(value);
  }

  if (isPlainObject(value)) {
    for (const entryValue of Object.values(value)) {
      deepFreeze(entryValue);
    }

    return Object.freeze(value);
  }

  return value;
}

function cloneFrozenEntry(entry) {
  return deepFreeze(deepClone(entry));
}

function normalizeEntry(input, chainId, existingEntriesById) {
  if (!isPlainObject(input)) {
    throw makeValidationError("INVALID_ENTRY", "forensic entry input must be an object");
  }

  assertRequiredString(input, "entryId");
  assertRequiredString(input, "entryType");
  assertRequiredString(input, "recordedAt");
  assertRequiredString(input, "sessionId");
  assertRequiredString(input, "sourceArtifact");
  assertRequiredString(input, "sourceLocation");
  assertLinkedEntryRefs(input);

  if (!ENTRY_TYPES.has(input.entryType)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'entryType' must be one of: CLAIM, EVIDENCE, GAP, FINDING, OPERATOR_ACTION"
    );
  }

  if (!isIso8601Timestamp(input.recordedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'recordedAt' must be an ISO 8601 timestamp"
    );
  }

  if (!isPlainObject(input.payload)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'payload' must be a plain object"
    );
  }

  if (existingEntriesById.has(input.entryId)) {
    throw makeValidationError(
      "DUPLICATE_ENTRY",
      `entryId '${input.entryId}' already exists`
    );
  }

  const uniqueRefs = [...new Set(input.linkedEntryRefs)];
  if (uniqueRefs.length !== input.linkedEntryRefs.length) {
    throw makeValidationError(
      "INVALID_LINK",
      "'linkedEntryRefs' must not contain duplicate entry references"
    );
  }

  for (const linkedEntryId of uniqueRefs) {
    if (linkedEntryId === input.entryId) {
      throw makeValidationError(
        "INVALID_LINK",
        "entries must not link to their own entryId"
      );
    }

    if (!existingEntriesById.has(linkedEntryId)) {
      throw makeValidationError(
        "INVALID_LINK",
        `linked entryId '${linkedEntryId}' was not found`
      );
    }
  }

  return deepFreeze({
    chainId,
    entryId: input.entryId,
    entryType: input.entryType,
    recordedAt: input.recordedAt,
    sessionId: input.sessionId,
    sourceArtifact: input.sourceArtifact,
    sourceLocation: input.sourceLocation,
    payload: deepClone(input.payload),
    linkedEntryRefs: [...uniqueRefs],
  });
}

class ForensicChain {
  constructor(chainId, initialEntries = []) {
    if (typeof chainId !== "string" || chainId.trim() === "") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'chainId' must be a non-empty string"
      );
    }

    if (!Array.isArray(initialEntries)) {
      throw makeValidationError(
        "INVALID_ENTRY_COLLECTION",
        "initial entries must be an array"
      );
    }

    this._chainId = chainId;
    this._entriesById = new Map();
    this._entries = [];

    for (const entryInput of initialEntries) {
      this.appendEntry(entryInput);
    }
  }

  getChainId() {
    return this._chainId;
  }

  appendEntry(entryInput) {
    const normalized = normalizeEntry(entryInput, this._chainId, this._entriesById);
    this._entriesById.set(normalized.entryId, normalized);
    this._entries.push(normalized);
    return cloneFrozenEntry(normalized);
  }

  getEntry(entryId) {
    if (typeof entryId !== "string" || entryId.trim() === "") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'entryId' must be a non-empty string"
      );
    }

    const entry = this._entriesById.get(entryId);
    return entry ? cloneFrozenEntry(entry) : null;
  }

  listEntries() {
    return this._entries.map(cloneFrozenEntry);
  }
}

module.exports = {
  ForensicChain,
};