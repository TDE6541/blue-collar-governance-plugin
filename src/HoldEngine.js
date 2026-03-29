"use strict";

const HOLD_STATUSES = new Set([
  "proposed",
  "active",
  "accepted",
  "resolved",
  "dismissed",
]);

const TERMINAL_STATUSES = new Set(["accepted", "resolved", "dismissed"]);
const ACTORS = new Set(["architect", "ai"]);
const TRANSITIONS = {
  proposed: new Set(["active", "dismissed"]),
  active: new Set(["accepted", "resolved", "dismissed"]),
  accepted: new Set(),
  resolved: new Set(),
  dismissed: new Set(),
};
const RESOLUTION_KINDS = new Set(["new_evidence", "scope_change"]);
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

function assertActor(value, fieldName) {
  if (!ACTORS.has(value)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be one of: architect, ai`
    );
  }
}

function assertOptionalTimestamp(input, fieldName) {
  if (
    input[fieldName] !== undefined &&
    !isIso8601Timestamp(input[fieldName])
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an ISO 8601 timestamp`
    );
  }
}

function normalizeHold(input, { forCreate }) {
  if (!isPlainObject(input)) {
    throw makeValidationError("INVALID_HOLD", "hold input must be an object");
  }

  assertRequiredString(input, "holdId");
  assertRequiredString(input, "summary");
  assertRequiredString(input, "reason");
  assertRequiredString(input, "impact");
  assertRequiredString(input, "resolutionPath");
  assertRequiredString(input, "createdAt");
  assertRequiredStringArray(input, "evidence");
  assertRequiredStringArray(input, "options");

  if (typeof input.blocking !== "boolean") {
    throw makeValidationError(
      "INVALID_FIELD",
      "'blocking' must be a boolean value"
    );
  }

  const status = input.status ?? "proposed";
  if (!HOLD_STATUSES.has(status)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'status' must be one of: proposed, active, accepted, resolved, dismissed"
    );
  }

  if (forCreate && input.status !== undefined && input.status !== "proposed") {
    throw makeValidationError(
      "INVALID_LIFECYCLE",
      "new holds must begin in 'proposed' status"
    );
  }

  if (!isIso8601Timestamp(input.createdAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'createdAt' must be an ISO 8601 timestamp"
    );
  }

  assertOptionalTimestamp(input, "updatedAt");
  assertOptionalTimestamp(input, "resolvedAt");

  assertActor(input.createdBy, "createdBy");

  if (input.resolvedBy !== undefined) {
    assertActor(input.resolvedBy, "resolvedBy");
  }

  if (input.scopeRef !== undefined && typeof input.scopeRef !== "string") {
    throw makeValidationError(
      "INVALID_FIELD",
      "'scopeRef' must be a string when provided"
    );
  }

  if (
    input.resolutionNotes !== undefined &&
    (typeof input.resolutionNotes !== "string" ||
      input.resolutionNotes.trim() === "")
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'resolutionNotes' must be a non-empty string when provided"
    );
  }

  if (TERMINAL_STATUSES.has(status)) {
    if (!isIso8601Timestamp(input.resolvedAt)) {
      throw makeValidationError(
        "INVALID_LIFECYCLE",
        `terminal status '${status}' requires 'resolvedAt' as ISO 8601`
      );
    }

    if (
      typeof input.resolutionNotes !== "string" ||
      input.resolutionNotes.trim() === ""
    ) {
      throw makeValidationError(
        "INVALID_LIFECYCLE",
        `terminal status '${status}' requires non-empty 'resolutionNotes'`
      );
    }
  }

  return {
    holdId: input.holdId,
    summary: input.summary,
    status,
    blocking: input.blocking,
    reason: input.reason,
    evidence: [...input.evidence],
    impact: input.impact,
    options: [...input.options],
    resolutionPath: input.resolutionPath,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    scopeRef: input.scopeRef,
    updatedAt: input.updatedAt,
    resolutionNotes: input.resolutionNotes,
    resolvedBy: input.resolvedBy,
    resolvedAt: input.resolvedAt,
  };
}

function cloneHold(hold) {
  return {
    ...hold,
    evidence: [...hold.evidence],
    options: [...hold.options],
  };
}

class HoldEngine {
  constructor(initialHolds = []) {
    if (!Array.isArray(initialHolds)) {
      throw makeValidationError(
        "INVALID_HOLD_COLLECTION",
        "initial holds must be an array"
      );
    }

    this._holdsById = new Map();

    for (const holdInput of initialHolds) {
      const hold = normalizeHold(holdInput, { forCreate: false });
      if (this._holdsById.has(hold.holdId)) {
        throw makeValidationError(
          "DUPLICATE_HOLD",
          `holdId '${hold.holdId}' already exists`
        );
      }

      this._holdsById.set(hold.holdId, hold);
    }
  }

  createHold(holdInput) {
    const hold = normalizeHold(holdInput, { forCreate: true });
    if (this._holdsById.has(hold.holdId)) {
      throw makeValidationError(
        "DUPLICATE_HOLD",
        `holdId '${hold.holdId}' already exists`
      );
    }

    this._holdsById.set(hold.holdId, hold);
    return cloneHold(hold);
  }

  getHold(holdId) {
    const hold = this._holdsById.get(holdId);
    return hold ? cloneHold(hold) : null;
  }

  listHolds() {
    return Array.from(this._holdsById.values(), cloneHold);
  }

  transitionHold(holdId, nextStatus, transitionInput = {}) {
    if (typeof holdId !== "string" || holdId.trim() === "") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'holdId' must be a non-empty string"
      );
    }

    if (!HOLD_STATUSES.has(nextStatus)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'nextStatus' must be one of: proposed, active, accepted, resolved, dismissed"
      );
    }

    if (!isPlainObject(transitionInput)) {
      throw makeValidationError(
        "INVALID_TRANSITION_INPUT",
        "transition input must be an object"
      );
    }

    const hold = this._holdsById.get(holdId);
    if (!hold) {
      throw makeValidationError("HOLD_NOT_FOUND", `holdId '${holdId}' was not found`);
    }

    if (!TRANSITIONS[hold.status].has(nextStatus)) {
      throw makeValidationError(
        "INVALID_LIFECYCLE",
        `cannot transition hold '${holdId}' from '${hold.status}' to '${nextStatus}'`
      );
    }

    if (nextStatus === "accepted" && transitionInput.operatorAccepted !== true) {
      throw makeValidationError(
        "INVALID_LIFECYCLE",
        "transition to 'accepted' requires explicit operator acceptance"
      );
    }

    if (
      nextStatus === "resolved" &&
      !RESOLUTION_KINDS.has(transitionInput.resolutionKind)
    ) {
      throw makeValidationError(
        "INVALID_LIFECYCLE",
        "transition to 'resolved' requires resolutionKind 'new_evidence' or 'scope_change'"
      );
    }

    const updatedHold = cloneHold(hold);
    updatedHold.status = nextStatus;

    if (transitionInput.updatedAt !== undefined) {
      if (!isIso8601Timestamp(transitionInput.updatedAt)) {
        throw makeValidationError(
          "INVALID_FIELD",
          "'updatedAt' must be an ISO 8601 timestamp when provided"
        );
      }

      updatedHold.updatedAt = transitionInput.updatedAt;
    }

    if (TERMINAL_STATUSES.has(nextStatus)) {
      if (!isIso8601Timestamp(transitionInput.resolvedAt)) {
        throw makeValidationError(
          "INVALID_LIFECYCLE",
          `terminal status '${nextStatus}' requires 'resolvedAt' as ISO 8601`
        );
      }

      if (
        typeof transitionInput.resolutionNotes !== "string" ||
        transitionInput.resolutionNotes.trim() === ""
      ) {
        throw makeValidationError(
          "INVALID_LIFECYCLE",
          `terminal status '${nextStatus}' requires non-empty 'resolutionNotes'`
        );
      }

      updatedHold.resolvedAt = transitionInput.resolvedAt;
      updatedHold.resolutionNotes = transitionInput.resolutionNotes;

      if (transitionInput.resolvedBy !== undefined) {
        assertActor(transitionInput.resolvedBy, "resolvedBy");
        updatedHold.resolvedBy = transitionInput.resolvedBy;
      }
    }

    this._holdsById.set(holdId, updatedHold);
    return cloneHold(updatedHold);
  }
}

module.exports = {
  HoldEngine,
};
