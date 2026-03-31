"use strict";

const HOLD_STATUSES = new Set([
  "proposed",
  "active",
  "accepted",
  "resolved",
  "dismissed",
]);

const TERMINAL_HOLD_STATUSES = new Set(["accepted", "resolved", "dismissed"]);
const SCARCITY_STATES = Object.freeze(["CLEAR", "WATCH", "TIGHT", "CRITICAL"]);
const SCARCITY_STATE_SET = new Set(SCARCITY_STATES);
const SCARCITY_SEVERITY = Object.freeze({
  CLEAR: 0,
  WATCH: 1,
  TIGHT: 2,
  CRITICAL: 3,
});

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

function assertStringArray(value, fieldName) {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string" || entry.trim() === "")
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an array of non-empty strings`
    );
  }
}

function normalizeHoldSnapshot(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'holdSnapshots' entries must be objects"
    );
  }

  assertRequiredString(input, "holdId");
  assertRequiredString(input, "status");

  if (!HOLD_STATUSES.has(input.status)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'status' must be one of: proposed, active, accepted, resolved, dismissed"
    );
  }

  if (typeof input.blocking !== "boolean") {
    throw makeValidationError(
      "INVALID_FIELD",
      "'blocking' must be a boolean"
    );
  }

  assertStringArray(input.evidence, "evidence");
  assertStringArray(input.options, "options");

  assertRequiredString(input, "createdAt");
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

  if (input.resolvedAt !== undefined && !isIso8601Timestamp(input.resolvedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'resolvedAt' must be an ISO 8601 timestamp when provided"
    );
  }

  return {
    holdId: input.holdId,
    status: input.status,
    blocking: input.blocking,
    evidence: [...input.evidence],
    options: [...input.options],
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    resolvedAt: input.resolvedAt,
  };
}

function deriveHoldScarcityState(hold) {
  if (TERMINAL_HOLD_STATUSES.has(hold.status)) {
    return {
      scarcityState: "CLEAR",
      rationale: "Terminal hold status has no active scarcity pressure.",
    };
  }

  if (hold.status === "active" && hold.blocking && hold.options.length <= 1) {
    return {
      scarcityState: "CRITICAL",
      rationale:
        "Active blocking hold with one or fewer options indicates critical scarcity pressure.",
    };
  }

  if (hold.status === "active" && hold.blocking) {
    return {
      scarcityState: "TIGHT",
      rationale: "Active blocking hold indicates tight scarcity pressure.",
    };
  }

  if ((hold.status === "proposed" && hold.blocking) || (hold.status === "active" && !hold.blocking)) {
    return {
      scarcityState: "WATCH",
      rationale: "Hold posture indicates watch-level scarcity pressure.",
    };
  }

  return {
    scarcityState: "CLEAR",
    rationale: "Hold posture indicates clear scarcity conditions.",
  };
}

function highestScarcityState(states) {
  let top = "CLEAR";
  for (const state of states) {
    if (!SCARCITY_STATE_SET.has(state)) {
      throw makeValidationError(
        "INVALID_DERIVED_STATE",
        `unsupported scarcity state '${state}'`
      );
    }

    if (SCARCITY_SEVERITY[state] > SCARCITY_SEVERITY[top]) {
      top = state;
    }
  }

  return top;
}

class HoldEngineScarcitySignal {
  deriveScarcitySignal(holdSnapshots, input = {}) {
    if (!Array.isArray(holdSnapshots)) {
      throw makeValidationError(
        "INVALID_INPUT",
        "'holdSnapshots' must be an array"
      );
    }

    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_INPUT",
        "'input' must be an object when provided"
      );
    }

    assertRequiredString(input, "evaluatedAt");
    if (!isIso8601Timestamp(input.evaluatedAt)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'evaluatedAt' must be an ISO 8601 timestamp"
      );
    }

    const stateCounts = {
      CLEAR: 0,
      WATCH: 0,
      TIGHT: 0,
      CRITICAL: 0,
    };

    const assessments = holdSnapshots.map((snapshotInput) => {
      const hold = normalizeHoldSnapshot(snapshotInput);
      const derived = deriveHoldScarcityState(hold);

      stateCounts[derived.scarcityState] += 1;

      return {
        holdId: hold.holdId,
        status: hold.status,
        blocking: hold.blocking,
        scarcityState: derived.scarcityState,
        evidenceRefCount: hold.evidence.length,
        optionCount: hold.options.length,
        hasEscalationSignal: hold.status === "active" && hold.blocking,
        rationale: derived.rationale,
      };
    });

    const overallScarcityState = highestScarcityState(
      assessments.map((entry) => entry.scarcityState)
    );

    const activeHoldCount = assessments.filter((entry) => entry.status === "active").length;
    const blockingActiveHoldCount = assessments.filter(
      (entry) => entry.status === "active" && entry.blocking
    ).length;

    return {
      evaluatedAt: input.evaluatedAt,
      overallScarcityState,
      holdCount: assessments.length,
      activeHoldCount,
      blockingActiveHoldCount,
      stateCounts,
      assessments,
    };
  }
}

module.exports = {
  HoldEngineScarcitySignal,
  SCARCITY_STATES,
};
