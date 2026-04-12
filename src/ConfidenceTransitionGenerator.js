"use strict";

const { MARKER_FAMILY, TIER_ORDER } = require("./ConfidenceGradientEngine");
const {
  AMBIGUOUS_STATUS,
  COMPARISON_VERSION,
  MATCH_FLAGS,
  MATCHED_STATUS,
  NEWLY_OBSERVED_STATUS,
  NO_LONGER_OBSERVED_STATUS,
} = require("./MarkerContinuityEngine");

const TRANSITION_ENTRY_TYPE = "FINDING";
const RETIERED_FLAG = "retiered";
const NEWLY_OBSERVED_CLASS = "NEWLY_OBSERVED";
const NO_LONGER_OBSERVED_CLASS = "NO_LONGER_OBSERVED";
const RETIERED_CLASS = "RETIERED";
const TRANSITION_CLASSES = Object.freeze([
  NEWLY_OBSERVED_CLASS,
  NO_LONGER_OBSERVED_CLASS,
  RETIERED_CLASS,
]);
const MATCH_FLAG_SET = new Set(MATCH_FLAGS);
const TIER_SET = new Set(TIER_ORDER);

const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const DEFAULT_ENTRY_ID_PREFIX = "confidence_transition";
const DEFAULT_SOURCE_ARTIFACT = "skill:confidence-transitions";
const DEFAULT_SOURCE_LOCATION_PREFIX = "transition";

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function assertIso8601Timestamp(input, fieldName, parentName = "input") {
  const value = input[fieldName];

  if (
    typeof value !== "string" ||
    !ISO_8601_PATTERN.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be an ISO 8601 timestamp`
    );
  }
}

function assertNonNegativeInteger(input, fieldName, parentName = "input") {
  const value = input[fieldName];
  if (!Number.isInteger(value) || value < 0) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be a non-negative integer`
    );
  }
}

function normalizeOptionalString(input, fieldName, fallback, parentName = "input") {
  const value = input[fieldName];
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "string" || value.trim() === "") {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be a non-empty string when provided`
    );
  }

  return value;
}

function normalizeMarker(markerInput, parentName) {
  if (!isPlainObject(markerInput)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertNonNegativeInteger(markerInput, "lineNumber", parentName);
  assertRequiredString(markerInput, "tier", parentName);
  assertRequiredString(markerInput, "marker", parentName);
  assertNonNegativeInteger(markerInput, "slashCount", parentName);

  if (markerInput.lineNumber < 1) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.lineNumber' must be greater than or equal to 1`
    );
  }

  if (!TIER_SET.has(markerInput.tier)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.tier' must be one of: ${TIER_ORDER.join(", ")}`
    );
  }

  if (markerInput.slashCount !== markerInput.marker.length) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.slashCount' must match '${parentName}.marker' length`
    );
  }

  if (
    markerInput.trailingText !== null &&
    (typeof markerInput.trailingText !== "string" ||
      markerInput.trailingText.trim() === "")
  ) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.trailingText' must be a non-empty string or null`
    );
  }

  return {
    lineNumber: markerInput.lineNumber,
    tier: markerInput.tier,
    marker: markerInput.marker,
    slashCount: markerInput.slashCount,
    trailingText: markerInput.trailingText,
  };
}

function normalizeMatchFlags(flagsInput, parentName, status) {
  if (flagsInput === undefined) {
    return [];
  }

  if (!Array.isArray(flagsInput)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.flags' must be an array`
    );
  }

  const uniqueFlags = [...new Set(flagsInput)];
  if (
    uniqueFlags.some(
      (flag) => typeof flag !== "string" || !MATCH_FLAG_SET.has(flag)
    )
  ) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.flags' must use only: ${MATCH_FLAGS.join(", ")}`
    );
  }

  if (status !== MATCHED_STATUS && uniqueFlags.length > 0) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.flags' may be present only for '${MATCHED_STATUS}' entries`
    );
  }

  return [...uniqueFlags].sort();
}

function normalizeContinuityChange(changeInput, parentName) {
  if (!isPlainObject(changeInput)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(changeInput, "status", parentName);
  assertRequiredString(changeInput, "filePath", parentName);

  if (
    changeInput.status !== MATCHED_STATUS &&
    changeInput.status !== NEWLY_OBSERVED_STATUS &&
    changeInput.status !== NO_LONGER_OBSERVED_STATUS
  ) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.status' must be one of: ${[
        MATCHED_STATUS,
        NEWLY_OBSERVED_STATUS,
        NO_LONGER_OBSERVED_STATUS,
      ].join(", ")}`
    );
  }

  const flags = normalizeMatchFlags(changeInput.flags, parentName, changeInput.status);
  const previousMarker =
    changeInput.previousMarker === undefined
      ? undefined
      : normalizeMarker(changeInput.previousMarker, `${parentName}.previousMarker`);
  const currentMarker =
    changeInput.currentMarker === undefined
      ? undefined
      : normalizeMarker(changeInput.currentMarker, `${parentName}.currentMarker`);

  if (changeInput.status === MATCHED_STATUS) {
    if (previousMarker === undefined || currentMarker === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'${parentName}' must include previousMarker and currentMarker for '${MATCHED_STATUS}'`
      );
    }
  }

  if (changeInput.status === NEWLY_OBSERVED_STATUS) {
    if (previousMarker !== undefined || currentMarker === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'${parentName}' must include only currentMarker for '${NEWLY_OBSERVED_STATUS}'`
      );
    }
  }

  if (changeInput.status === NO_LONGER_OBSERVED_STATUS) {
    if (previousMarker === undefined || currentMarker !== undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'${parentName}' must include only previousMarker for '${NO_LONGER_OBSERVED_STATUS}'`
      );
    }
  }

  return {
    status: changeInput.status,
    filePath: changeInput.filePath,
    flags,
    ...(previousMarker === undefined ? {} : { previousMarker }),
    ...(currentMarker === undefined ? {} : { currentMarker }),
  };
}

function normalizeAmbiguousCase(caseInput, parentName) {
  if (!isPlainObject(caseInput)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(caseInput, "status", parentName);
  assertRequiredString(caseInput, "filePath", parentName);

  if (caseInput.status !== AMBIGUOUS_STATUS) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.status' must be '${AMBIGUOUS_STATUS}'`
    );
  }

  return {
    status: caseInput.status,
    filePath: caseInput.filePath,
  };
}

function normalizeMarkerContinuityView(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerContinuityView' must be an object"
    );
  }

  assertNonNegativeInteger(input, "comparisonVersion", "markerContinuityView");
  assertRequiredString(input, "markerFamily", "markerContinuityView");

  if (input.comparisonVersion !== COMPARISON_VERSION) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'markerContinuityView.comparisonVersion' must be ${COMPARISON_VERSION}`
    );
  }

  if (input.markerFamily !== MARKER_FAMILY) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'markerContinuityView.markerFamily' must be '${MARKER_FAMILY}'`
    );
  }

  if (!Array.isArray(input.continuityChanges)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerContinuityView.continuityChanges' must be an array"
    );
  }

  if (!Array.isArray(input.ambiguousCases)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerContinuityView.ambiguousCases' must be an array"
    );
  }

  return {
    comparisonVersion: input.comparisonVersion,
    markerFamily: input.markerFamily,
    continuityChanges: input.continuityChanges.map((change, index) =>
      normalizeContinuityChange(
        change,
        `markerContinuityView.continuityChanges[${index}]`
      )
    ),
    ambiguousCases: input.ambiguousCases.map((ambiguousCase, index) =>
      normalizeAmbiguousCase(
        ambiguousCase,
        `markerContinuityView.ambiguousCases[${index}]`
      )
    ),
  };
}

function normalizeGenerationInput(input = {}) {
  if (!isPlainObject(input)) {
    throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
  }

  if (input.markerContinuityView === undefined) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerContinuityView' is required"
    );
  }

  assertRequiredString(input, "sessionId");
  assertIso8601Timestamp(input, "recordedAt");

  return {
    markerContinuityView: normalizeMarkerContinuityView(input.markerContinuityView),
    sessionId: input.sessionId,
    recordedAt: input.recordedAt,
    entryIdPrefix: normalizeOptionalString(
      input,
      "entryIdPrefix",
      DEFAULT_ENTRY_ID_PREFIX
    ),
    sourceArtifact: normalizeOptionalString(
      input,
      "sourceArtifact",
      DEFAULT_SOURCE_ARTIFACT
    ),
    sourceLocationPrefix: normalizeOptionalString(
      input,
      "sourceLocationPrefix",
      DEFAULT_SOURCE_LOCATION_PREFIX
    ),
  };
}

function buildEntryId(prefix, index) {
  return `${prefix}_${String(index + 1).padStart(3, "0")}`;
}

function buildSourceLocation(prefix, transitionClass, filePath, marker) {
  return `${prefix}:${transitionClass}:${filePath}:${marker.lineNumber}:${marker.tier}`;
}

function cloneMarker(marker) {
  return {
    lineNumber: marker.lineNumber,
    tier: marker.tier,
    marker: marker.marker,
    slashCount: marker.slashCount,
    trailingText: marker.trailingText,
  };
}

function buildEntry({
  entryIndex,
  entryIdPrefix,
  sessionId,
  recordedAt,
  sourceArtifact,
  sourceLocationPrefix,
  transitionClass,
  filePath,
  previousMarker,
  currentMarker,
}) {
  const markerForLocation = currentMarker || previousMarker;

  const payload = {
    transitionClass,
    filePath,
    ...(previousMarker === undefined ? {} : { previousMarker: cloneMarker(previousMarker) }),
    ...(currentMarker === undefined ? {} : { currentMarker: cloneMarker(currentMarker) }),
    ...(transitionClass === RETIERED_CLASS
      ? {
          previousTier: previousMarker.tier,
          currentTier: currentMarker.tier,
        }
      : {}),
  };

  return {
    entryId: buildEntryId(entryIdPrefix, entryIndex),
    entryType: TRANSITION_ENTRY_TYPE,
    recordedAt,
    sessionId,
    sourceArtifact,
    sourceLocation: buildSourceLocation(
      sourceLocationPrefix,
      transitionClass,
      filePath,
      markerForLocation
    ),
    payload,
    linkedEntryRefs: [],
  };
}

function generateConfidenceTransitionEntries(input = {}) {
  const normalized = normalizeGenerationInput(input);
  const generated = [];

  for (const change of normalized.markerContinuityView.continuityChanges) {
    if (change.status === NEWLY_OBSERVED_STATUS) {
      generated.push(
        buildEntry({
          entryIndex: generated.length,
          entryIdPrefix: normalized.entryIdPrefix,
          sessionId: normalized.sessionId,
          recordedAt: normalized.recordedAt,
          sourceArtifact: normalized.sourceArtifact,
          sourceLocationPrefix: normalized.sourceLocationPrefix,
          transitionClass: NEWLY_OBSERVED_CLASS,
          filePath: change.filePath,
          currentMarker: change.currentMarker,
        })
      );
      continue;
    }

    if (change.status === NO_LONGER_OBSERVED_STATUS) {
      generated.push(
        buildEntry({
          entryIndex: generated.length,
          entryIdPrefix: normalized.entryIdPrefix,
          sessionId: normalized.sessionId,
          recordedAt: normalized.recordedAt,
          sourceArtifact: normalized.sourceArtifact,
          sourceLocationPrefix: normalized.sourceLocationPrefix,
          transitionClass: NO_LONGER_OBSERVED_CLASS,
          filePath: change.filePath,
          previousMarker: change.previousMarker,
        })
      );
      continue;
    }

    if (!change.flags.includes(RETIERED_FLAG)) {
      continue;
    }

    if (change.previousMarker.tier === change.currentMarker.tier) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "retiered transitions must include different previous and current tiers"
      );
    }

    generated.push(
      buildEntry({
        entryIndex: generated.length,
        entryIdPrefix: normalized.entryIdPrefix,
        sessionId: normalized.sessionId,
        recordedAt: normalized.recordedAt,
        sourceArtifact: normalized.sourceArtifact,
        sourceLocationPrefix: normalized.sourceLocationPrefix,
        transitionClass: RETIERED_CLASS,
        filePath: change.filePath,
        previousMarker: change.previousMarker,
        currentMarker: change.currentMarker,
      })
    );
  }

  return generated;
}

module.exports = {
  generateConfidenceTransitionEntries,
  NEWLY_OBSERVED_CLASS,
  NO_LONGER_OBSERVED_CLASS,
  RETIERED_CLASS,
  TRANSITION_CLASSES,
  TRANSITION_ENTRY_TYPE,
};
