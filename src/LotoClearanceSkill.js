"use strict";

const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isIso8601Timestamp(value) {
  return (
    typeof value === "string" &&
    ISO_8601_PATTERN.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function validateCreateInput(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError("INVALID_INPUT", "create input must be an object");
  }

  if (!hasNonEmptyString(input.domainId)) {
    throw makeValidationError("INVALID_FIELD", "'domainId' must be a non-empty string");
  }

  if (!hasNonEmptyString(input.operatorName)) {
    throw makeValidationError("INVALID_FIELD", "'operatorName' must be a non-empty string");
  }

  if (!hasNonEmptyString(input.reason)) {
    throw makeValidationError("INVALID_FIELD", "'reason' must be a non-empty string");
  }

  if (!hasNonEmptyString(input.sessionId)) {
    throw makeValidationError("INVALID_FIELD", "'sessionId' must be a non-empty string");
  }

  if (!isPlainObject(input.scope)) {
    throw makeValidationError("INVALID_FIELD", "'scope' must be an object");
  }

  if (input.scope.scopeType !== "SESSION" && input.scope.scopeType !== "EXPIRY") {
    throw makeValidationError(
      "INVALID_FIELD",
      "'scope.scopeType' must be SESSION or EXPIRY"
    );
  }

  if (input.scope.scopeType === "SESSION" && !hasNonEmptyString(input.scope.sessionId)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'scope.sessionId' required for SESSION scope"
    );
  }

  if (input.scope.scopeType === "EXPIRY") {
    if (!isIso8601Timestamp(input.scope.expiresAt)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'scope.expiresAt' must be an ISO 8601 timestamp for EXPIRY scope"
      );
    }
  }
}

function createLotoClearance(input, state, appendChainEntryFn) {
  validateCreateInput(input);

  if (!Array.isArray(state.activeAuthorizations)) {
    state.activeAuthorizations = [];
  }

  const existing = state.activeAuthorizations.find(
    (a) => a && a.domainId === input.domainId
  );

  if (existing) {
    throw makeValidationError(
      "DUPLICATE_ACTIVE",
      `An active LOTO clearance already exists for domain '${input.domainId}'. Revoke it first.`
    );
  }

  const now =
    hasNonEmptyString(input.createdAt) && isIso8601Timestamp(input.createdAt)
      ? input.createdAt
      : new Date().toISOString();

  const clearanceId = `loto_${input.domainId}_${Date.now()}`;

  const scope =
    input.scope.scopeType === "SESSION"
      ? { scopeType: "SESSION", sessionId: input.scope.sessionId }
      : { scopeType: "EXPIRY", expiresAt: input.scope.expiresAt };

  const conditions = Array.isArray(input.conditions)
    ? input.conditions.filter((c) => typeof c === "string" && c.trim() !== "")
    : [];

  const clearance = {
    authorizationId: clearanceId,
    domainId: input.domainId,
    authorizedBy: input.operatorName,
    authorizedAt: now,
    reason: input.reason,
    scope,
    conditions,
    chainRef: `chain_loto_${clearanceId}`,
  };

  state.activeAuthorizations.push(clearance);

  let chainEntryId = null;
  if (typeof appendChainEntryFn === "function") {
    const entry = appendChainEntryFn(state, {
      eventType: "loto_created",
      entryType: "OPERATOR_ACTION",
      sourceArtifact: "skill:loto-clearance",
      sourceLocation: `domain:${input.domainId}`,
      payload: {
        action: "authorization_created",
        clearanceId,
        domainId: input.domainId,
        operatorName: input.operatorName,
        scopeType: scope.scopeType,
      },
      sessionId: input.sessionId,
      recordedAt: now,
    });
    if (entry) {
      chainEntryId = entry.entryId;
    }
  }

  return {
    action: "created",
    clearance,
    chainEntryId,
  };
}

function revokeLotoClearance(input, state, appendChainEntryFn) {
  if (!isPlainObject(input)) {
    throw makeValidationError("INVALID_INPUT", "revoke input must be an object");
  }

  if (!hasNonEmptyString(input.clearanceId)) {
    throw makeValidationError("INVALID_FIELD", "'clearanceId' must be a non-empty string");
  }

  if (!hasNonEmptyString(input.sessionId)) {
    throw makeValidationError("INVALID_FIELD", "'sessionId' must be a non-empty string");
  }

  if (!Array.isArray(state.activeAuthorizations)) {
    throw makeValidationError(
      "NOT_FOUND",
      `LOTO clearance '${input.clearanceId}' not found`
    );
  }

  const index = state.activeAuthorizations.findIndex(
    (a) => a && a.authorizationId === input.clearanceId
  );

  if (index < 0) {
    throw makeValidationError(
      "NOT_FOUND",
      `LOTO clearance '${input.clearanceId}' not found`
    );
  }

  const removed = state.activeAuthorizations.splice(index, 1)[0];
  const now =
    hasNonEmptyString(input.revokedAt) && isIso8601Timestamp(input.revokedAt)
      ? input.revokedAt
      : new Date().toISOString();

  let chainEntryId = null;
  if (typeof appendChainEntryFn === "function") {
    const entry = appendChainEntryFn(state, {
      eventType: "loto_revoked",
      entryType: "OPERATOR_ACTION",
      sourceArtifact: "skill:loto-clearance",
      sourceLocation: `domain:${removed.domainId}`,
      payload: {
        action: "authorization_revoked",
        clearanceId: removed.authorizationId,
        domainId: removed.domainId,
      },
      sessionId: input.sessionId,
      recordedAt: now,
    });
    if (entry) {
      chainEntryId = entry.entryId;
    }
  }

  return {
    action: "revoked",
    clearanceId: removed.authorizationId,
    chainEntryId,
  };
}

module.exports = {
  createLotoClearance,
  revokeLotoClearance,
};
