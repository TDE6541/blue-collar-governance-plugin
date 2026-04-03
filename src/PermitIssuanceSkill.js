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

  if (!hasNonEmptyString(input.sessionId)) {
    throw makeValidationError("INVALID_FIELD", "'sessionId' must be a non-empty string");
  }

  if (!hasNonEmptyString(input.operatorDecision)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'operatorDecision' must be a non-empty string"
    );
  }

  const validDecisions = new Set(["GRANTED", "DENIED", "CONDITIONAL"]);
  if (!validDecisions.has(input.operatorDecision)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'operatorDecision' must be GRANTED, DENIED, or CONDITIONAL"
    );
  }

  if (!hasNonEmptyString(input.scopeJustification)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'scopeJustification' must be a non-empty string"
    );
  }

  if (!hasNonEmptyString(input.riskAssessment)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'riskAssessment' must be a non-empty string"
    );
  }

  if (!hasNonEmptyString(input.rollbackPlan)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'rollbackPlan' must be a non-empty string"
    );
  }

  if (input.operatorDecision === "CONDITIONAL") {
    if (
      !Array.isArray(input.conditions) ||
      input.conditions.length === 0 ||
      input.conditions.some((c) => typeof c !== "string" || c.trim() === "")
    ) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'conditions' must be a non-empty array of strings for CONDITIONAL permits"
      );
    }
  }
}

function createPermit(input, state, appendChainEntryFn) {
  validateCreateInput(input);

  if (!Array.isArray(state.activePermits)) {
    state.activePermits = [];
  }

  const existing = state.activePermits.find((p) => {
    if (!p || !Array.isArray(p.requestedDomains)) {
      return false;
    }
    return p.requestedDomains.includes(input.domainId) && p.sessionId === input.sessionId;
  });

  if (existing) {
    throw makeValidationError(
      "DUPLICATE_ACTIVE",
      `An active permit already exists for domain '${input.domainId}'. Revoke it first.`
    );
  }

  const now =
    hasNonEmptyString(input.createdAt) && isIso8601Timestamp(input.createdAt)
      ? input.createdAt
      : new Date().toISOString();

  const permitId = `permit_${input.domainId}_${Date.now()}`;

  const conditions =
    input.operatorDecision === "CONDITIONAL" && Array.isArray(input.conditions)
      ? input.conditions.filter((c) => typeof c === "string" && c.trim() !== "")
      : [];

  const permit = {
    permitId,
    sessionId: input.sessionId,
    requestedDomains: [input.domainId],
    scopeJustification: input.scopeJustification,
    riskAssessment: input.riskAssessment,
    rollbackPlan: input.rollbackPlan,
    operatorDecision: input.operatorDecision,
    conditions,
    chainRef: `chain_permit_${permitId}`,
  };

  state.activePermits.push(permit);

  let chainEntryId = null;
  if (typeof appendChainEntryFn === "function") {
    const entry = appendChainEntryFn(state, {
      eventType: "permit_created",
      entryType: "OPERATOR_ACTION",
      sourceArtifact: "skill:issue-permit",
      sourceLocation: `domain:${input.domainId}`,
      payload: {
        action: "permit_created",
        permitId,
        domainId: input.domainId,
        operatorDecision: input.operatorDecision,
        sessionId: input.sessionId,
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
    permit,
    chainEntryId,
  };
}

function revokePermit(input, state, appendChainEntryFn) {
  if (!isPlainObject(input)) {
    throw makeValidationError("INVALID_INPUT", "revoke input must be an object");
  }

  if (!hasNonEmptyString(input.permitId)) {
    throw makeValidationError("INVALID_FIELD", "'permitId' must be a non-empty string");
  }

  if (!hasNonEmptyString(input.sessionId)) {
    throw makeValidationError("INVALID_FIELD", "'sessionId' must be a non-empty string");
  }

  if (!Array.isArray(state.activePermits)) {
    throw makeValidationError(
      "NOT_FOUND",
      `Permit '${input.permitId}' not found`
    );
  }

  const index = state.activePermits.findIndex(
    (p) => p && p.permitId === input.permitId
  );

  if (index < 0) {
    throw makeValidationError(
      "NOT_FOUND",
      `Permit '${input.permitId}' not found`
    );
  }

  const removed = state.activePermits.splice(index, 1)[0];
  const domainId =
    Array.isArray(removed.requestedDomains) && removed.requestedDomains.length > 0
      ? removed.requestedDomains[0]
      : "unknown";

  const now =
    hasNonEmptyString(input.revokedAt) && isIso8601Timestamp(input.revokedAt)
      ? input.revokedAt
      : new Date().toISOString();

  let chainEntryId = null;
  if (typeof appendChainEntryFn === "function") {
    const entry = appendChainEntryFn(state, {
      eventType: "permit_revoked",
      entryType: "OPERATOR_ACTION",
      sourceArtifact: "skill:issue-permit",
      sourceLocation: `domain:${domainId}`,
      payload: {
        action: "permit_revoked",
        permitId: removed.permitId,
        domainId,
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
    permitId: removed.permitId,
    chainEntryId,
  };
}

module.exports = {
  createPermit,
  revokePermit,
};
