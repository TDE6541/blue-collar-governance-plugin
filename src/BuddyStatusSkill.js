"use strict";

const SKILL_ROUTES = Object.freeze(["/buddy-status"]);

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertRequiredString(input, fieldName, parentName = "input") {
  const value = input[fieldName];
  if (typeof value !== "string" || value.trim() === "") {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be a non-empty string`
    );
  }
}

function assertStringList(value, fieldName) {
  if (!Array.isArray(value)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be an array of strings`
    );
  }

  if (value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be an array of non-empty strings`
    );
  }
}

function cloneTextList(values) {
  return values.map((value) => `${value}`);
}

function normalizeWatcherPolicy(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'watcherPolicy' must be an object"
    );
  }

  if (!Number.isInteger(input.deadManTimeoutMinutes) || input.deadManTimeoutMinutes <= 0) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'watcherPolicy.deadManTimeoutMinutes' must be a positive integer"
    );
  }

  return {
    deadManTimeoutMinutes: input.deadManTimeoutMinutes,
  };
}

function normalizeCallout(input, index) {
  const fieldBase = `callouts[${index}]`;

  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldBase}' must be an object`
    );
  }

  assertRequiredString(input, "calloutId", fieldBase);
  assertRequiredString(input, "sessionId", fieldBase);
  assertRequiredString(input, "buddyId", fieldBase);
  assertRequiredString(input, "calloutType", fieldBase);
  assertRequiredString(input, "urgency", fieldBase);
  assertRequiredString(input, "summary", fieldBase);
  assertRequiredString(input, "detectedAt", fieldBase);
  assertStringList(input.sourceRefs, `${fieldBase}.sourceRefs`);
  assertStringList(input.evidenceRefs, `${fieldBase}.evidenceRefs`);
  assertRequiredString(input, "chainEntryRef", fieldBase);

  return {
    calloutId: input.calloutId,
    sessionId: input.sessionId,
    buddyId: input.buddyId,
    calloutType: input.calloutType,
    urgency: input.urgency,
    summary: input.summary,
    detectedAt: input.detectedAt,
    sourceRefs: cloneTextList(input.sourceRefs),
    evidenceRefs: cloneTextList(input.evidenceRefs),
    chainEntryRef: input.chainEntryRef,
  };
}

class BuddyStatusSkill {
  renderBuddyStatus(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
    }

    if (input.watcherPolicy === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'watcherPolicy' is required"
      );
    }

    if (input.callouts === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'callouts' is required"
      );
    }

    if (!Array.isArray(input.callouts)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'callouts' must be an array"
      );
    }

    const watcherPolicy = normalizeWatcherPolicy(input.watcherPolicy);
    const callouts = input.callouts.map((callout, index) => normalizeCallout(callout, index));

    return {
      route: "/buddy-status",
      watcherPolicy,
      calloutCount: callouts.length,
      callouts,
      snapshotState:
        callouts.length === 0
          ? "no active callouts in current watcher snapshot"
          : "active callouts present in current watcher snapshot",
      renderNote:
        "rendered from current Buddy watcher policy and existing callout snapshot",
    };
  }
}

module.exports = {
  BuddyStatusSkill,
  SKILL_ROUTES,
};
