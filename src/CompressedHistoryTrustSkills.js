"use strict";

const SKILL_ROUTES = Object.freeze(["/chain", "/warranty", "/journeyman"]);

const CHAIN_ENTRY_TYPES = new Set([
  "CLAIM",
  "EVIDENCE",
  "GAP",
  "FINDING",
  "OPERATOR_ACTION",
]);

const WARRANTY_STATES = new Set(["HEALTHY", "WATCH", "DEGRADED", "EXPIRED"]);
const TRUST_LEVELS = new Set(["APPRENTICE", "JOURNEYMAN", "FOREMAN"]);
const DECISION_TYPES = new Set(["PROMOTION", "HOLD", "REGRESSION"]);

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

function assertRequiredBoolean(input, fieldName) {
  if (typeof input[fieldName] !== "boolean") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a boolean`
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

function normalizeChainInput(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'chainView' must be an object"
    );
  }

  assertRequiredString(input, "chainId");

  if (!Array.isArray(input.entries)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'entries' must be an array"
    );
  }

  const entries = input.entries.map((entryInput, index) => {
    if (!isPlainObject(entryInput)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'entries[${index}]' must be an object`
      );
    }

    assertRequiredString(entryInput, "chainId");
    assertRequiredString(entryInput, "entryId");
    assertRequiredString(entryInput, "entryType");
    assertRequiredString(entryInput, "recordedAt");
    assertRequiredString(entryInput, "sessionId");
    assertRequiredString(entryInput, "sourceArtifact");
    assertRequiredString(entryInput, "sourceLocation");

    if (entryInput.chainId !== input.chainId) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'entries[${index}].chainId' must match 'chainId'`
      );
    }

    if (!CHAIN_ENTRY_TYPES.has(entryInput.entryType)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'entryType' must be one of: CLAIM, EVIDENCE, GAP, FINDING, OPERATOR_ACTION"
      );
    }

    if (!isIso8601Timestamp(entryInput.recordedAt)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'recordedAt' must be an ISO 8601 timestamp"
      );
    }

    if (!isPlainObject(entryInput.payload)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'payload' must be a plain object"
      );
    }

    assertStringArray(entryInput.linkedEntryRefs, "linkedEntryRefs");

    return {
      chainId: entryInput.chainId,
      entryId: entryInput.entryId,
      entryType: entryInput.entryType,
      recordedAt: entryInput.recordedAt,
      sessionId: entryInput.sessionId,
      sourceArtifact: entryInput.sourceArtifact,
      sourceLocation: entryInput.sourceLocation,
      payload: deepClone(entryInput.payload),
      linkedEntryRefs: [...entryInput.linkedEntryRefs],
    };
  });

  return {
    chainId: input.chainId,
    entries,
  };
}

function normalizeWarrantyViews(warrantyViews) {
  if (!Array.isArray(warrantyViews)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'warrantyViews' must be an array"
    );
  }

  return warrantyViews.map((viewInput, index) => {
    if (!isPlainObject(viewInput)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'warrantyViews[${index}]' must be an object`
      );
    }

    assertRequiredString(viewInput, "operatorKey");
    assertRequiredString(viewInput, "currentLevel");
    assertRequiredString(viewInput, "warrantyState");
    assertRequiredBoolean(viewInput, "hasRecentRegression");
    assertRequiredBoolean(viewInput, "degradationObserved");
    assertRequiredBoolean(viewInput, "outOfBandChangeDetected");
    assertRequiredBoolean(viewInput, "coverageExpired");
    assertStringArray(viewInput.evidenceRefs, "evidenceRefs");
    assertRequiredString(viewInput, "rationale");
    assertRequiredString(viewInput, "evaluatedAt");

    if (!TRUST_LEVELS.has(viewInput.currentLevel)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'currentLevel' must be one of: APPRENTICE, JOURNEYMAN, FOREMAN"
      );
    }

    if (!WARRANTY_STATES.has(viewInput.warrantyState)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'warrantyState' must be one of: HEALTHY, WATCH, DEGRADED, EXPIRED"
      );
    }

    if (!isIso8601Timestamp(viewInput.evaluatedAt)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'evaluatedAt' must be an ISO 8601 timestamp"
      );
    }

    return {
      operatorKey: viewInput.operatorKey,
      currentLevel: viewInput.currentLevel,
      warrantyState: viewInput.warrantyState,
      hasRecentRegression: viewInput.hasRecentRegression,
      degradationObserved: viewInput.degradationObserved,
      outOfBandChangeDetected: viewInput.outOfBandChangeDetected,
      coverageExpired: viewInput.coverageExpired,
      evidenceRefs: [...viewInput.evidenceRefs],
      rationale: viewInput.rationale,
      evaluatedAt: viewInput.evaluatedAt,
    };
  });
}

function normalizeTransitionEntry(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'levelTransitions' entries must be objects"
    );
  }

  assertRequiredString(input, "transitionId");
  assertRequiredString(input, "fromLevel");
  assertRequiredString(input, "toLevel");
  assertStringArray(input.reasonCodes, "reasonCodes");
  assertStringArray(input.forensicReferenceIds, "forensicReferenceIds");
  assertRequiredString(input, "decidedAt");

  if (!TRUST_LEVELS.has(input.fromLevel) || !TRUST_LEVELS.has(input.toLevel)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'fromLevel' and 'toLevel' must be one of: APPRENTICE, JOURNEYMAN, FOREMAN"
    );
  }

  if (!isIso8601Timestamp(input.decidedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'decidedAt' must be an ISO 8601 timestamp"
    );
  }

  return {
    transitionId: input.transitionId,
    fromLevel: input.fromLevel,
    toLevel: input.toLevel,
    reasonCodes: [...input.reasonCodes],
    forensicReferenceIds: [...input.forensicReferenceIds],
    decidedAt: input.decidedAt,
  };
}

function normalizeDecisionEntry(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'decisionHistory' entries must be objects"
    );
  }

  assertRequiredString(input, "decisionId");
  assertRequiredString(input, "decisionType");
  assertRequiredString(input, "fromLevel");
  assertRequiredString(input, "toLevel");
  assertStringArray(input.reasonCodes, "reasonCodes");
  assertStringArray(input.forensicReferenceIds, "forensicReferenceIds");
  assertRequiredString(input, "decidedAt");

  if (!DECISION_TYPES.has(input.decisionType)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'decisionType' must be one of: PROMOTION, HOLD, REGRESSION"
    );
  }

  if (!TRUST_LEVELS.has(input.fromLevel) || !TRUST_LEVELS.has(input.toLevel)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'fromLevel' and 'toLevel' must be one of: APPRENTICE, JOURNEYMAN, FOREMAN"
    );
  }

  if (!isIso8601Timestamp(input.decidedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'decidedAt' must be an ISO 8601 timestamp"
    );
  }

  return {
    decisionId: input.decisionId,
    decisionType: input.decisionType,
    fromLevel: input.fromLevel,
    toLevel: input.toLevel,
    reasonCodes: [...input.reasonCodes],
    forensicReferenceIds: [...input.forensicReferenceIds],
    decidedAt: input.decidedAt,
  };
}

function normalizeTrustStates(input) {
  const states = Array.isArray(input) ? input : [input];

  if (states.length === 1 && input === undefined) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'trustStates' must be an object or array"
    );
  }

  return states.map((stateInput, index) => {
    if (!isPlainObject(stateInput)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'trustStates[${index}]' must be an object`
      );
    }

    assertRequiredString(stateInput, "operatorKey");
    assertRequiredString(stateInput, "currentLevel");
    assertRequiredString(stateInput, "createdAt");
    assertRequiredString(stateInput, "updatedAt");

    if (!TRUST_LEVELS.has(stateInput.currentLevel)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'currentLevel' must be one of: APPRENTICE, JOURNEYMAN, FOREMAN"
      );
    }

    if (!isIso8601Timestamp(stateInput.createdAt)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'createdAt' must be an ISO 8601 timestamp"
      );
    }

    if (!isIso8601Timestamp(stateInput.updatedAt)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'updatedAt' must be an ISO 8601 timestamp"
      );
    }

    if (!Array.isArray(stateInput.levelTransitions)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'levelTransitions' must be an array"
      );
    }

    if (!Array.isArray(stateInput.decisionHistory)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'decisionHistory' must be an array"
      );
    }

    return {
      operatorKey: stateInput.operatorKey,
      currentLevel: stateInput.currentLevel,
      levelTransitions: stateInput.levelTransitions.map(normalizeTransitionEntry),
      decisionHistory: stateInput.decisionHistory.map(normalizeDecisionEntry),
      createdAt: stateInput.createdAt,
      updatedAt: stateInput.updatedAt,
    };
  });
}

class CompressedHistoryTrustSkills {
  renderChain(chainView) {
    const normalized = normalizeChainInput(chainView);

    const entryTypeSummary = {
      CLAIM: 0,
      EVIDENCE: 0,
      GAP: 0,
      FINDING: 0,
      OPERATOR_ACTION: 0,
    };

    for (const entry of normalized.entries) {
      entryTypeSummary[entry.entryType] += 1;
    }

    return {
      route: "/chain",
      chainId: normalized.chainId,
      entryCount: normalized.entries.length,
      entryTypeSummary,
      entries: normalized.entries.map((entry) => ({
        entryId: entry.entryId,
        entryType: entry.entryType,
        recordedAt: entry.recordedAt,
        sessionId: entry.sessionId,
        sourceArtifact: entry.sourceArtifact,
        sourceLocation: entry.sourceLocation,
        payload: deepClone(entry.payload),
        linkedEntryRefs: [...entry.linkedEntryRefs],
      })),
    };
  }

  renderWarranty(warrantyViews) {
    const normalizedViews = normalizeWarrantyViews(warrantyViews);

    const stateSummary = {
      HEALTHY: 0,
      WATCH: 0,
      DEGRADED: 0,
      EXPIRED: 0,
    };

    for (const view of normalizedViews) {
      stateSummary[view.warrantyState] += 1;
    }

    return {
      route: "/warranty",
      viewCount: normalizedViews.length,
      stateSummary,
      views: normalizedViews.map((view) => ({
        operatorKey: view.operatorKey,
        currentLevel: view.currentLevel,
        warrantyState: view.warrantyState,
        hasRecentRegression: view.hasRecentRegression,
        degradationObserved: view.degradationObserved,
        outOfBandChangeDetected: view.outOfBandChangeDetected,
        coverageExpired: view.coverageExpired,
        evidenceRefs: [...view.evidenceRefs],
        rationale: view.rationale,
        evaluatedAt: view.evaluatedAt,
      })),
    };
  }

  renderJourneyman(trustStatesInput) {
    const trustStates = normalizeTrustStates(trustStatesInput);

    const levelSummary = {
      APPRENTICE: 0,
      JOURNEYMAN: 0,
      FOREMAN: 0,
    };

    for (const state of trustStates) {
      levelSummary[state.currentLevel] += 1;
    }

    return {
      route: "/journeyman",
      operatorCount: trustStates.length,
      levelSummary,
      operators: trustStates.map((state) => {
        const lastDecision =
          state.decisionHistory.length > 0
            ? state.decisionHistory[state.decisionHistory.length - 1]
            : null;

        return {
          operatorKey: state.operatorKey,
          currentLevel: state.currentLevel,
          transitionCount: state.levelTransitions.length,
          decisionCount: state.decisionHistory.length,
          lastDecisionType: lastDecision ? lastDecision.decisionType : null,
          lastDecisionAt: lastDecision ? lastDecision.decidedAt : null,
          recentForensicReferenceIds: lastDecision
            ? [...lastDecision.forensicReferenceIds]
            : [],
          createdAt: state.createdAt,
          updatedAt: state.updatedAt,
        };
      }),
    };
  }
}

module.exports = {
  CompressedHistoryTrustSkills,
  SKILL_ROUTES,
};
