"use strict";

const BUDDY_CALLOUT_TYPES = Object.freeze([
  "DRIFT",
  "VIOLATION",
  "PHANTOM",
  "PRESENCE_TIMEOUT",
  "ESCALATION",
]);

const BUDDY_CALLOUT_TYPE_SET = new Set(BUDDY_CALLOUT_TYPES);

const BUDDY_URGENCY_LEVELS = Object.freeze(["HALT", "WARN", "INFORM"]);
const BUDDY_URGENCY_LEVEL_SET = new Set(BUDDY_URGENCY_LEVELS);

const DEFAULT_DEAD_MAN_TIMEOUT_MINUTES = 15;

const DEFAULT_URGENCY_BY_TYPE = Object.freeze({
  DRIFT: "WARN",
  VIOLATION: "HALT",
  PHANTOM: "WARN",
  PRESENCE_TIMEOUT: "HALT",
  ESCALATION: "INFORM",
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

function normalizeBuddyPolicy(policyInput = {}) {
  if (!isPlainObject(policyInput)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'policy' must be an object when provided"
    );
  }

  const timeoutValue =
    policyInput.deadManTimeoutMinutes === undefined
      ? DEFAULT_DEAD_MAN_TIMEOUT_MINUTES
      : policyInput.deadManTimeoutMinutes;

  if (!Number.isInteger(timeoutValue) || timeoutValue <= 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'deadManTimeoutMinutes' must be a positive integer"
    );
  }

  return {
    deadManTimeoutMinutes: timeoutValue,
  };
}

function normalizeCalloutInput(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "callout input must be an object"
    );
  }

  assertRequiredString(input, "calloutType");
  assertRequiredString(input, "summary");
  assertRequiredString(input, "detectedAt");
  assertRequiredStringArray(input, "sourceRefs");
  assertOptionalStringArray(input, "evidenceRefs");
  assertOptionalStringArray(input, "linkedEntryRefs");

  if (!BUDDY_CALLOUT_TYPE_SET.has(input.calloutType)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'calloutType' must be one of: ${BUDDY_CALLOUT_TYPES.join(", ")}`
    );
  }

  if (!isIso8601Timestamp(input.detectedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'detectedAt' must be an ISO 8601 timestamp"
    );
  }

  if (input.urgency !== undefined) {
    if (typeof input.urgency !== "string") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'urgency' must be a string when provided"
      );
    }

    if (!BUDDY_URGENCY_LEVEL_SET.has(input.urgency)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'urgency' must be one of: ${BUDDY_URGENCY_LEVELS.join(", ")}`
      );
    }
  }

  if (input.sourceArtifact !== undefined && typeof input.sourceArtifact !== "string") {
    throw makeValidationError(
      "INVALID_FIELD",
      "'sourceArtifact' must be a string when provided"
    );
  }

  if (input.sourceLocation !== undefined && typeof input.sourceLocation !== "string") {
    throw makeValidationError(
      "INVALID_FIELD",
      "'sourceLocation' must be a string when provided"
    );
  }

  return {
    calloutType: input.calloutType,
    summary: input.summary,
    urgency: input.urgency || DEFAULT_URGENCY_BY_TYPE[input.calloutType],
    detectedAt: input.detectedAt,
    sourceRefs: uniqueStrings(input.sourceRefs),
    evidenceRefs: uniqueStrings([...(input.evidenceRefs || [])]),
    linkedEntryRefs: uniqueStrings([...(input.linkedEntryRefs || [])]),
    sourceArtifact: input.sourceArtifact,
    sourceLocation: input.sourceLocation,
  };
}

function minutesBetween(startIso, endIso) {
  const deltaMs = Date.parse(endIso) - Date.parse(startIso);
  return Math.max(0, deltaMs / 60000);
}

class BuddySystem {
  constructor(input) {
    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "BuddySystem constructor input must be an object"
      );
    }

    assertRequiredString(input, "buddyId");
    assertRequiredString(input, "sessionId");
    assertRequiredString(input, "startedAt");

    if (!isIso8601Timestamp(input.startedAt)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'startedAt' must be an ISO 8601 timestamp"
      );
    }

    if (!isPlainObject(input.chain)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'chain' must be a ForensicChain-like object"
      );
    }

    if (
      typeof input.chain.appendEntry !== "function" ||
      typeof input.chain.getEntry !== "function"
    ) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'chain' must expose appendEntry and getEntry methods"
      );
    }

    this._buddyId = input.buddyId;
    this._sessionId = input.sessionId;
    this._chain = input.chain;
    this._policy = normalizeBuddyPolicy(input.policy || {});
    this._lastOperatorInteractionAt = input.startedAt;
    this._callouts = [];
    this._calloutCounter = 0;
  }

  getPolicy() {
    return {
      deadManTimeoutMinutes: this._policy.deadManTimeoutMinutes,
    };
  }

  registerOperatorInteraction(interactionAt) {
    if (typeof interactionAt !== "string" || !isIso8601Timestamp(interactionAt)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'interactionAt' must be an ISO 8601 timestamp"
      );
    }

    this._lastOperatorInteractionAt = interactionAt;

    return {
      lastOperatorInteractionAt: this._lastOperatorInteractionAt,
    };
  }

  createCallout(input) {
    const calloutInput = normalizeCalloutInput(input);

    this._calloutCounter += 1;

    const calloutId = `buddy_callout_${this._sessionId}_${String(this._calloutCounter).padStart(3, "0")}`;
    const chainEntryId = `buddy_chain_${this._sessionId}_${String(this._calloutCounter).padStart(3, "0")}`;

    const chainEntry = this._chain.appendEntry({
      entryId: chainEntryId,
      entryType: "FINDING",
      recordedAt: calloutInput.detectedAt,
      sessionId: this._sessionId,
      sourceArtifact: calloutInput.sourceArtifact || "src/BuddySystem.js",
      sourceLocation: calloutInput.sourceLocation || calloutInput.calloutType,
      payload: {
        origin: "BUDDY",
        buddyId: this._buddyId,
        calloutId,
        calloutType: calloutInput.calloutType,
        urgency: calloutInput.urgency,
        summary: calloutInput.summary,
        sourceRefs: [...calloutInput.sourceRefs],
        evidenceRefs: [...calloutInput.evidenceRefs],
      },
      linkedEntryRefs: [...calloutInput.linkedEntryRefs],
    });

    const callout = {
      calloutId,
      sessionId: this._sessionId,
      buddyId: this._buddyId,
      calloutType: calloutInput.calloutType,
      urgency: calloutInput.urgency,
      summary: calloutInput.summary,
      detectedAt: calloutInput.detectedAt,
      sourceRefs: [...calloutInput.sourceRefs],
      evidenceRefs: [...calloutInput.evidenceRefs],
      chainEntryRef: chainEntry.entryId,
    };

    this._callouts.push(callout);

    return deepClone(callout);
  }

  detectDrift(input) {
    return this.createCallout({
      ...input,
      calloutType: "DRIFT",
    });
  }

  detectViolation(input) {
    return this.createCallout({
      ...input,
      calloutType: "VIOLATION",
    });
  }

  detectPhantom(input) {
    return this.createCallout({
      ...input,
      calloutType: "PHANTOM",
    });
  }

  checkPresence(checkedAt) {
    if (typeof checkedAt !== "string" || !isIso8601Timestamp(checkedAt)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'checkedAt' must be an ISO 8601 timestamp"
      );
    }

    const elapsedMinutes = minutesBetween(this._lastOperatorInteractionAt, checkedAt);
    const timedOut = elapsedMinutes >= this._policy.deadManTimeoutMinutes;

    if (!timedOut) {
      return {
        timedOut: false,
        sessionPaused: false,
        elapsedMinutes,
        timeoutMinutes: this._policy.deadManTimeoutMinutes,
        callout: null,
      };
    }

    const timeoutCallout = this.createCallout({
      calloutType: "PRESENCE_TIMEOUT",
      summary:
        "Dead Man's Switch timeout reached; session is paused pending operator interaction.",
      detectedAt: checkedAt,
      sourceRefs: [
        `session:${this._sessionId}`,
        `last_interaction:${this._lastOperatorInteractionAt}`,
      ],
      evidenceRefs: [`deadman_timeout:${this._policy.deadManTimeoutMinutes}`],
      sourceArtifact: "src/BuddySystem.js",
      sourceLocation: "checkPresence",
    });

    return {
      timedOut: true,
      sessionPaused: true,
      elapsedMinutes,
      timeoutMinutes: this._policy.deadManTimeoutMinutes,
      callout: timeoutCallout,
    };
  }

  listCallouts() {
    return this._callouts.map(deepClone);
  }
}

module.exports = {
  BuddySystem,
  BUDDY_CALLOUT_TYPES,
  BUDDY_URGENCY_LEVELS,
  DEFAULT_DEAD_MAN_TIMEOUT_MINUTES,
};
