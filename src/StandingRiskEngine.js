"use strict";

const DERIVED_STATES = new Set(["OPEN", "CARRIED", "STANDING"]);
const TERMINAL_STATES = new Set([
  "RESOLVED",
  "DISMISSED",
  "EXPLICITLY_ACCEPTED",
]);
const TERMINAL_OUTCOME_MAP = new Map([
  ["resolve", "RESOLVED"],
  ["dismiss", "DISMISSED"],
  ["explicitly_accept", "EXPLICITLY_ACCEPTED"],
]);

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertRequiredString(input, fieldName) {
  if (typeof input[fieldName] !== "string" || input[fieldName].trim() === "") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a non-empty string`
    );
  }
}

function assertRequiredBoolean(input, fieldName) {
  if (typeof input[fieldName] !== "boolean") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a boolean`
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

function normalizeContinuationSignal(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_SIGNAL",
      "continuation signal must be an object"
    );
  }

  assertRequiredString(input, "entryId");
  assertRequiredBoolean(input, "relevantWorkContinued");
  assertRequiredBoolean(input, "blastRadiusStillExists");
  assertRequiredStringArray(input, "evidenceRefs");

  return {
    entryId: input.entryId,
    relevantWorkContinued: input.relevantWorkContinued,
    blastRadiusStillExists: input.blastRadiusStillExists,
    evidenceRefs: [...new Set(input.evidenceRefs)],
  };
}

function normalizeContinuityEntry(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_ENTRY",
      "continuity entry must be an object"
    );
  }

  assertRequiredString(input, "entryId");
  assertRequiredString(input, "entryType");
  assertRequiredString(input, "summary");
  assertRequiredString(input, "originSessionId");
  assertRequiredString(input, "lastSeenSessionId");

  if (!Number.isInteger(input.sessionCount) || input.sessionCount < 1) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'sessionCount' must be an integer greater than or equal to 1"
    );
  }

  if (!Number.isInteger(input.carryCount) || input.carryCount < 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'carryCount' must be an integer greater than or equal to 0"
    );
  }

  return {
    entryId: input.entryId,
    entryType: input.entryType,
    summary: input.summary,
    originSessionId: input.originSessionId,
    lastSeenSessionId: input.lastSeenSessionId,
    sessionCount: input.sessionCount,
    carryCount: input.carryCount,
    operatorOutcome: input.operatorOutcome,
  };
}

function deriveEscalationState(entry, continuationSignal, evaluationSessionId) {
  if (entry.operatorOutcome !== undefined) {
    const terminalState = TERMINAL_OUTCOME_MAP.get(entry.operatorOutcome);
    if (!TERMINAL_STATES.has(terminalState)) {
      throw makeValidationError(
        "INVALID_OUTCOME",
        "'operatorOutcome' must be one of: resolve, dismiss, explicitly_accept when provided"
      );
    }

    return {
      state: terminalState,
      triadSatisfied: false,
      laterRelevantWorkContinued: false,
      blastRadiusStillExists: false,
      evidenceRefs: [],
      rationale: "Terminal operator outcome is set for this entryId.",
    };
  }

  const hasLaterSession = entry.lastSeenSessionId !== entry.originSessionId;
  const sessionMatchesEvaluation = entry.lastSeenSessionId === evaluationSessionId;
  const signalForEntry = continuationSignal !== undefined;

  const laterRelevantWorkContinued =
    hasLaterSession &&
    sessionMatchesEvaluation &&
    signalForEntry &&
    continuationSignal.relevantWorkContinued;

  const blastRadiusStillExists =
    signalForEntry && continuationSignal.blastRadiusStillExists;

  const triadSatisfied =
    laterRelevantWorkContinued && blastRadiusStillExists;

  if (!triadSatisfied) {
    return {
      state: "OPEN",
      triadSatisfied,
      laterRelevantWorkContinued,
      blastRadiusStillExists,
      evidenceRefs: signalForEntry ? continuationSignal.evidenceRefs : [],
      rationale:
        "Escalation triad is incomplete; derived state remains OPEN.",
    };
  }

  if (entry.carryCount >= 2) {
    return {
      state: "STANDING",
      triadSatisfied,
      laterRelevantWorkContinued,
      blastRadiusStillExists,
      evidenceRefs: continuationSignal.evidenceRefs,
      rationale:
        "Escalation triad is satisfied and carryCount>=2; derived state is STANDING.",
    };
  }

  if (entry.carryCount >= 1) {
    return {
      state: "CARRIED",
      triadSatisfied,
      laterRelevantWorkContinued,
      blastRadiusStillExists,
      evidenceRefs: continuationSignal.evidenceRefs,
      rationale:
        "Escalation triad is satisfied and carryCount=1; derived state is CARRIED.",
    };
  }

  return {
    state: "OPEN",
    triadSatisfied,
    laterRelevantWorkContinued,
    blastRadiusStillExists,
    evidenceRefs: continuationSignal.evidenceRefs,
    rationale:
      "Escalation triad is satisfied but carryCount=0; derived state remains OPEN.",
  };
}

class StandingRiskEngine {
  deriveStandingRisk(continuityEntries, input = {}) {
    if (!Array.isArray(continuityEntries)) {
      throw makeValidationError(
        "INVALID_INPUT",
        "'continuityEntries' must be an array"
      );
    }

    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_INPUT",
        "'input' must be an object when provided"
      );
    }

    assertRequiredString(input, "evaluationSessionId");

    if (!Array.isArray(input.continuationSignals)) {
      throw makeValidationError(
        "INVALID_INPUT",
        "'continuationSignals' must be an array"
      );
    }

    const signalsByEntryId = new Map();

    for (const signalInput of input.continuationSignals) {
      const signal = normalizeContinuationSignal(signalInput);
      signalsByEntryId.set(signal.entryId, signal);
    }

    const derived = [];

    for (const entryInput of continuityEntries) {
      const entry = normalizeContinuityEntry(entryInput);
      const signal = signalsByEntryId.get(entry.entryId);
      const escalation = deriveEscalationState(
        entry,
        signal,
        input.evaluationSessionId
      );

      if (!DERIVED_STATES.has(escalation.state) && !TERMINAL_STATES.has(escalation.state)) {
        throw makeValidationError(
          "INVALID_DERIVED_STATE",
          `unsupported derived state '${escalation.state}'`
        );
      }

      derived.push({
        entryId: entry.entryId,
        entryType: entry.entryType,
        state: escalation.state,
        originSessionId: entry.originSessionId,
        lastSeenSessionId: entry.lastSeenSessionId,
        sessionCount: entry.sessionCount,
        carryCount: entry.carryCount,
        triadSatisfied: escalation.triadSatisfied,
        relevantWorkContinued: escalation.laterRelevantWorkContinued,
        blastRadiusStillExists: escalation.blastRadiusStillExists,
        evidenceRefs: escalation.evidenceRefs,
        rationale: escalation.rationale,
      });
    }

    return derived;
  }
}

module.exports = {
  StandingRiskEngine,
};
