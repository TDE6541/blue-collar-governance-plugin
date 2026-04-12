"use strict";

const {
  generateConfidenceTransitionEntries,
} = require("./ConfidenceTransitionGenerator");

const SKILL_ROUTES = Object.freeze(["/confidence-transitions"]);

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeRenderInput(input = {}) {
  if (!isPlainObject(input)) {
    throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
  }

  if (input.append !== undefined && typeof input.append !== "boolean") {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'append' must be a boolean when provided"
    );
  }

  return {
    appendRequested: input.append === true,
    generationInput: {
      markerContinuityView: input.markerContinuityView,
      sessionId: input.sessionId,
      recordedAt: input.recordedAt,
      ...(input.entryIdPrefix === undefined
        ? {}
        : { entryIdPrefix: input.entryIdPrefix }),
      ...(input.sourceArtifact === undefined
        ? {}
        : { sourceArtifact: input.sourceArtifact }),
      ...(input.sourceLocationPrefix === undefined
        ? {}
        : { sourceLocationPrefix: input.sourceLocationPrefix }),
    },
    chain: input.chain,
  };
}

function normalizeChain(chain) {
  if (!isPlainObject(chain)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'chain' must be a ForensicChain-like object when append is requested"
    );
  }

  if (typeof chain.appendEntry !== "function") {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'chain' must expose appendEntry when append is requested"
    );
  }

  return chain;
}

class ConfidenceTransitionsSkill {
  renderConfidenceTransitions(input = {}) {
    const normalized = normalizeRenderInput(input);
    const generatedEntries = generateConfidenceTransitionEntries(
      normalized.generationInput
    );

    if (!normalized.appendRequested) {
      return {
        route: "/confidence-transitions",
        action: "preview",
        appendRequested: false,
        generatedCount: generatedEntries.length,
        generatedEntries: cloneValue(generatedEntries),
        appendedCount: 0,
        appendedEntryIds: [],
      };
    }

    const chain = normalizeChain(normalized.chain);
    const appendedEntryIds = [];

    for (const entry of generatedEntries) {
      const appendedEntry = chain.appendEntry(entry);
      if (!isPlainObject(appendedEntry) || typeof appendedEntry.entryId !== "string") {
        throw makeValidationError(
          "ERR_INVALID_INPUT",
          "append path requires chain.appendEntry(...) to return an entry with string entryId"
        );
      }
      appendedEntryIds.push(appendedEntry.entryId);
    }

    return {
      route: "/confidence-transitions",
      action: "append",
      appendRequested: true,
      generatedCount: generatedEntries.length,
      generatedEntries: cloneValue(generatedEntries),
      appendedCount: appendedEntryIds.length,
      appendedEntryIds,
    };
  }
}

module.exports = {
  ConfidenceTransitionsSkill,
  SKILL_ROUTES,
};
