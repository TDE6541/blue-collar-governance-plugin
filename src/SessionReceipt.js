"use strict";

const OUTCOMES = new Set([
  "complete",
  "complete_with_holds",
  "partial",
  "stopped",
]);
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

function assertRequiredStringArray(input, fieldName) {
  const value = input[fieldName];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an array of strings`
    );
  }
}

function arraysAreIdentical(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

function normalizeReceipt(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_RECEIPT",
      "receipt input must be an object"
    );
  }

  assertRequiredString(input, "receiptId");
  assertRequiredString(input, "summary");
  assertRequiredString(input, "createdAt");
  assertRequiredStringArray(input, "plannedWork");
  assertRequiredStringArray(input, "completedWork");
  assertRequiredStringArray(input, "untouchedWork");
  assertRequiredStringArray(input, "holdsRaised");
  assertRequiredStringArray(input, "approvedDrift");
  assertRequiredStringArray(input, "excludedWork");
  assertRequiredStringArray(input, "artifactsChanged");

  if (input.briefRef !== undefined && typeof input.briefRef !== "string") {
    throw makeValidationError(
      "INVALID_FIELD",
      "'briefRef' must be a string when provided"
    );
  }

  if (!OUTCOMES.has(input.outcome)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'outcome' must be one of: complete, complete_with_holds, partial, stopped"
    );
  }

  if (typeof input.signoffRequired !== "boolean") {
    throw makeValidationError(
      "INVALID_FIELD",
      "'signoffRequired' must be a boolean"
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

  if (arraysAreIdentical(input.untouchedWork, input.excludedWork)) {
    throw makeValidationError(
      "INVALID_RECEIPT_RULE",
      "'untouchedWork' and 'excludedWork' must remain distinct lists"
    );
  }

  const plannedSet = new Set(input.plannedWork);
  const mergedDrift = input.approvedDrift.filter((item) => plannedSet.has(item));
  if (mergedDrift.length > 0) {
    throw makeValidationError(
      "INVALID_RECEIPT_RULE",
      "'approvedDrift' items must not be merged into 'plannedWork'"
    );
  }

  return {
    receiptId: input.receiptId,
    briefRef: input.briefRef,
    plannedWork: [...input.plannedWork],
    completedWork: [...input.completedWork],
    untouchedWork: [...input.untouchedWork],
    holdsRaised: [...input.holdsRaised],
    approvedDrift: [...input.approvedDrift],
    excludedWork: [...input.excludedWork],
    artifactsChanged: [...input.artifactsChanged],
    outcome: input.outcome,
    signoffRequired: input.signoffRequired,
    summary: input.summary,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    notes: input.notes,
  };
}

function cloneReceipt(receipt) {
  return {
    ...receipt,
    plannedWork: [...receipt.plannedWork],
    completedWork: [...receipt.completedWork],
    untouchedWork: [...receipt.untouchedWork],
    holdsRaised: [...receipt.holdsRaised],
    approvedDrift: [...receipt.approvedDrift],
    excludedWork: [...receipt.excludedWork],
    artifactsChanged: [...receipt.artifactsChanged],
  };
}

class SessionReceipt {
  constructor(initialReceipts = []) {
    if (!Array.isArray(initialReceipts)) {
      throw makeValidationError(
        "INVALID_RECEIPT_COLLECTION",
        "initial receipts must be an array"
      );
    }

    this._receiptsById = new Map();

    for (const receiptInput of initialReceipts) {
      const receipt = normalizeReceipt(receiptInput);
      if (this._receiptsById.has(receipt.receiptId)) {
        throw makeValidationError(
          "DUPLICATE_RECEIPT",
          `receiptId '${receipt.receiptId}' already exists`
        );
      }

      this._receiptsById.set(receipt.receiptId, receipt);
    }
  }

  createReceipt(receiptInput) {
    const receipt = normalizeReceipt(receiptInput);
    if (this._receiptsById.has(receipt.receiptId)) {
      throw makeValidationError(
        "DUPLICATE_RECEIPT",
        `receiptId '${receipt.receiptId}' already exists`
      );
    }

    this._receiptsById.set(receipt.receiptId, receipt);
    return cloneReceipt(receipt);
  }

  getReceipt(receiptId) {
    const receipt = this._receiptsById.get(receiptId);
    return receipt ? cloneReceipt(receipt) : null;
  }

  listReceipts() {
    return Array.from(this._receiptsById.values(), cloneReceipt);
  }

  summarizeAsBuilt(receiptId) {
    if (typeof receiptId !== "string" || receiptId.trim() === "") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'receiptId' must be a non-empty string"
      );
    }

    const receipt = this._receiptsById.get(receiptId);
    if (!receipt) {
      throw makeValidationError(
        "RECEIPT_NOT_FOUND",
        `receiptId '${receiptId}' was not found`
      );
    }

    const completedSet = new Set(receipt.completedWork);
    const untouchedSet = new Set(receipt.untouchedWork);
    const plannedSet = new Set(receipt.plannedWork);
    const approvedDriftSet = new Set(receipt.approvedDrift);

    const plannedButIncomplete = receipt.plannedWork.filter(
      (item) => !completedSet.has(item) && !untouchedSet.has(item)
    );
    const unplannedCompleted = receipt.completedWork.filter(
      (item) => !plannedSet.has(item) && !approvedDriftSet.has(item)
    );

    return {
      receiptId,
      outcome: receipt.outcome,
      signoffRequired: receipt.signoffRequired,
      plannedButIncomplete,
      unplannedCompleted,
      holdsRaised: [...receipt.holdsRaised],
      approvedDrift: [...receipt.approvedDrift],
      excludedWork: [...receipt.excludedWork],
      summary: receipt.summary,
    };
  }
}

module.exports = {
  SessionReceipt,
};
