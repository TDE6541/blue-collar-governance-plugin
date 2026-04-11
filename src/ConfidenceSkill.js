"use strict";

const {
  MARKER_FAMILY,
  REQUIRED_COVERAGE_MISSING_CODE,
  REQUIRED_COVERAGE_MINIMUM_MARKER_COUNT,
  REQUIRED_COVERAGE_POLICY_ERROR_CODES,
  REQUIRED_COVERAGE_POLICY_MODE,
  TIER_DEFINITIONS,
  TIER_ORDER,
} = require("./ConfidenceGradientEngine");
const {
  AMBIGUOUS_STATUS,
  COMPARISON_VERSION,
  MATCHED_STATUS,
  MATCH_FLAGS,
  NEWLY_OBSERVED_STATUS,
  NO_LONGER_OBSERVED_STATUS,
} = require("./MarkerContinuityEngine");
const {
  TEMPORAL_ERROR_CODES,
  TEMPORAL_FINDING_CODES,
  TEMPORAL_SIGNALS_VERSION,
} = require("./MarkerTemporalSignalsEngine");

const SKILL_ROUTES = Object.freeze(["/confidence"]);
const HIGH_SEVERITY_TIERS = new Set(["HOLD", "KILL"]);
const REQUIRED_COVERAGE_POLICY_ERROR_SET = new Set(
  REQUIRED_COVERAGE_POLICY_ERROR_CODES
);
const CONTINUITY_CHANGE_STATUS_SET = new Set([
  MATCHED_STATUS,
  NEWLY_OBSERVED_STATUS,
  NO_LONGER_OBSERVED_STATUS,
]);
const MATCH_FLAG_SET = new Set(MATCH_FLAGS);
const TEMPORAL_FINDING_CODE_SET = new Set(TEMPORAL_FINDING_CODES);
const TEMPORAL_ERROR_CODE_SET = new Set(TEMPORAL_ERROR_CODES);
const TIER_BY_NAME = new Map(
  TIER_DEFINITIONS.map((definition) => [definition.tier, definition])
);
const MARKER_BY_TIER = new Map(
  TIER_DEFINITIONS.map((definition) => [definition.tier, definition.marker])
);

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

function assertNonNegativeInteger(input, fieldName, parentName = "input") {
  const value = input[fieldName];
  if (!Number.isInteger(value) || value < 0) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be a non-negative integer`
    );
  }
}

function assertInteger(input, fieldName, parentName = "input") {
  const value = input[fieldName];
  if (!Number.isInteger(value)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be an integer`
    );
  }
}

function cloneTierTotals(tierTotals) {
  return {
    WATCH: tierTotals.WATCH,
    GAP: tierTotals.GAP,
    HOLD: tierTotals.HOLD,
    KILL: tierTotals.KILL,
  };
}

function normalizeTierTotals(input, parentName) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  for (const tier of TIER_ORDER) {
    assertNonNegativeInteger(input, tier, parentName);
  }

  return cloneTierTotals(input);
}

function normalizeOptionalStringOrNull(input, fieldName, parentName = "input") {
  const value = input[fieldName];

  if (value === null) {
    return null;
  }

  if (typeof value !== "string" || value.trim() === "") {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be a non-empty string or null`
    );
  }

  return value;
}

function cloneDomain(domain) {
  return {
    domainId: domain.domainId,
    label: domain.label,
  };
}

function normalizeDomain(input, parentName) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(input, "domainId", parentName);
  assertRequiredString(input, "label", parentName);

  return cloneDomain(input);
}

function normalizeMarker(input, parentName) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertNonNegativeInteger(input, "lineNumber", parentName);
  assertRequiredString(input, "tier", parentName);
  assertRequiredString(input, "marker", parentName);

  if (input.lineNumber < 1) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.lineNumber' must be greater than or equal to 1`
    );
  }

  if (!TIER_BY_NAME.has(input.tier)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.tier' must be one of: ${TIER_ORDER.join(", ")}`
    );
  }

  if (MARKER_BY_TIER.get(input.tier) !== input.marker) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.marker' must match the marker for tier '${input.tier}'`
    );
  }

  return {
    lineNumber: input.lineNumber,
    tier: input.tier,
    marker: input.marker,
  };
}

function normalizeFileMarkerMap(input) {
  if (!Array.isArray(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'confidenceGradientView.files' must be an array"
    );
  }

  return input.map((file, index) => {
    const parentName = `confidenceGradientView.files[${index}]`;

    if (!isPlainObject(file)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'${parentName}' must be an object`
      );
    }

    assertRequiredString(file, "filePath", parentName);
    assertNonNegativeInteger(file, "markerCount", parentName);

    if (!Array.isArray(file.markers)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'${parentName}.markers' must be an array`
      );
    }

    return {
      filePath: file.filePath,
      domain: normalizeDomain(file.domain, `${parentName}.domain`),
      markerCount: file.markerCount,
      tierTotals: normalizeTierTotals(file.tierTotals, `${parentName}.tierTotals`),
      markers: file.markers.map((marker, markerIndex) =>
        normalizeMarker(marker, `${parentName}.markers[${markerIndex}]`)
      ),
    };
  });
}

function normalizeDomainGrouping(input) {
  if (!Array.isArray(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'confidenceGradientView.domainGroups' must be an array"
    );
  }

  return input.map((group, index) => {
    const parentName = `confidenceGradientView.domainGroups[${index}]`;

    if (!isPlainObject(group)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'${parentName}' must be an object`
      );
    }

    assertRequiredString(group, "domainId", parentName);
    assertRequiredString(group, "label", parentName);
    assertNonNegativeInteger(group, "fileCount", parentName);
    assertNonNegativeInteger(group, "markerCount", parentName);

    if (
      !Array.isArray(group.filePaths) ||
      group.filePaths.some(
        (filePath) => typeof filePath !== "string" || filePath.trim() === ""
      )
    ) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'${parentName}.filePaths' must be an array of non-empty strings`
      );
    }

    return {
      domainId: group.domainId,
      label: group.label,
      fileCount: group.fileCount,
      markerCount: group.markerCount,
      tierTotals: normalizeTierTotals(group.tierTotals, `${parentName}.tierTotals`),
      filePaths: [...group.filePaths],
    };
  });
}

function normalizeConfidenceGradientView(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'confidenceGradientView' must be an object"
    );
  }

  assertRequiredString(input, "markerFamily", "confidenceGradientView");

  if (input.markerFamily !== MARKER_FAMILY) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'confidenceGradientView.markerFamily' must be 'slash'"
    );
  }

  if (!isPlainObject(input.totals)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'confidenceGradientView.totals' must be an object"
    );
  }

  return {
    markerFamily: input.markerFamily,
    tierTotals: normalizeTierTotals(
      input.totals.tierTotals,
      "confidenceGradientView.totals.tierTotals"
    ),
    files: normalizeFileMarkerMap(input.files),
    domainGroups: normalizeDomainGrouping(input.domainGroups),
  };
}

function compareTopLocations(left, right) {
  const leftRank = TIER_BY_NAME.get(left.tier).severityRank;
  const rightRank = TIER_BY_NAME.get(right.tier).severityRank;

  if (leftRank !== rightRank) {
    return rightRank - leftRank;
  }

  const filePathComparison = left.filePath.localeCompare(right.filePath);
  if (filePathComparison !== 0) {
    return filePathComparison;
  }

  return left.lineNumber - right.lineNumber;
}

function buildTopHoldKillLocations(files) {
  const locations = [];

  for (const file of files) {
    for (const marker of file.markers) {
      if (!HIGH_SEVERITY_TIERS.has(marker.tier)) {
        continue;
      }

      locations.push({
        filePath: file.filePath,
        lineNumber: marker.lineNumber,
        tier: marker.tier,
        marker: marker.marker,
        domainId: file.domain.domainId,
        domainLabel: file.domain.label,
      });
    }
  }

  return locations.sort(compareTopLocations);
}

function normalizeRequiredCoverageFinding(input, parentName) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(input, "code", parentName);
  assertRequiredString(input, "policyTargetId", parentName);
  assertRequiredString(input, "filePath", parentName);
  assertNonNegativeInteger(input, "markerCount", parentName);
  assertNonNegativeInteger(input, "minimumMarkerCount", parentName);

  if (input.code !== REQUIRED_COVERAGE_MISSING_CODE) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.code' must be '${REQUIRED_COVERAGE_MISSING_CODE}'`
    );
  }

  if (input.minimumMarkerCount !== REQUIRED_COVERAGE_MINIMUM_MARKER_COUNT) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.minimumMarkerCount' must be ${REQUIRED_COVERAGE_MINIMUM_MARKER_COUNT}`
    );
  }

  return {
    code: input.code,
    policyTargetId: input.policyTargetId,
    filePath: input.filePath,
    domain: normalizeDomain(input.domain, `${parentName}.domain`),
    markerCount: input.markerCount,
    minimumMarkerCount: input.minimumMarkerCount,
  };
}

function normalizeRequiredCoveragePolicyError(input, parentName) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(input, "code", parentName);

  if (!REQUIRED_COVERAGE_POLICY_ERROR_SET.has(input.code)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.code' must be one of: ${REQUIRED_COVERAGE_POLICY_ERROR_CODES.join(", ")}`
    );
  }

  return {
    code: input.code,
    policyTargetId: normalizeOptionalStringOrNull(input, "policyTargetId", parentName),
    filePath: normalizeOptionalStringOrNull(input, "filePath", parentName),
  };
}

function normalizeRequiredCoverageView(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'requiredCoverageView' must be an object"
    );
  }

  assertRequiredString(input, "policyMode", "requiredCoverageView");
  assertRequiredString(input, "markerFamily", "requiredCoverageView");
  assertNonNegativeInteger(input, "targetCount", "requiredCoverageView");
  assertNonNegativeInteger(input, "evaluatedTargetCount", "requiredCoverageView");

  if (input.policyMode !== REQUIRED_COVERAGE_POLICY_MODE) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'requiredCoverageView.policyMode' must be '${REQUIRED_COVERAGE_POLICY_MODE}'`
    );
  }

  if (input.markerFamily !== MARKER_FAMILY) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'requiredCoverageView.markerFamily' must be 'slash'"
    );
  }

  if (input.evaluatedTargetCount > input.targetCount) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'requiredCoverageView.evaluatedTargetCount' must be less than or equal to 'requiredCoverageView.targetCount'"
    );
  }

  if (!Array.isArray(input.findings)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'requiredCoverageView.findings' must be an array"
    );
  }

  if (!Array.isArray(input.policyErrors)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'requiredCoverageView.policyErrors' must be an array"
    );
  }

  return {
    policyMode: input.policyMode,
    markerFamily: input.markerFamily,
    targetCount: input.targetCount,
    evaluatedTargetCount: input.evaluatedTargetCount,
    findings: input.findings.map((finding, index) =>
      normalizeRequiredCoverageFinding(
        finding,
        `requiredCoverageView.findings[${index}]`
      )
    ),
    policyErrors: input.policyErrors.map((policyError, index) =>
      normalizeRequiredCoveragePolicyError(
        policyError,
        `requiredCoverageView.policyErrors[${index}]`
      )
    ),
  };
}

function normalizeComparisonMarker(input, parentName) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertNonNegativeInteger(input, "lineNumber", parentName);
  assertRequiredString(input, "tier", parentName);
  assertRequiredString(input, "marker", parentName);
  assertNonNegativeInteger(input, "slashCount", parentName);

  if (input.lineNumber < 1) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.lineNumber' must be greater than or equal to 1`
    );
  }

  if (!TIER_BY_NAME.has(input.tier)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.tier' must be one of: ${TIER_ORDER.join(", ")}`
    );
  }

  if (MARKER_BY_TIER.get(input.tier) !== input.marker) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.marker' must match the marker for tier '${input.tier}'`
    );
  }

  if (input.slashCount !== input.marker.length) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.slashCount' must match '${parentName}.marker' length`
    );
  }

  return {
    lineNumber: input.lineNumber,
    tier: input.tier,
    marker: input.marker,
    slashCount: input.slashCount,
    trailingText: normalizeOptionalStringOrNull(input, "trailingText", parentName),
  };
}

function normalizeMatchFlags(input, parentName, status) {
  if (input === undefined) {
    return [];
  }

  if (!Array.isArray(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.flags' must be an array`
    );
  }

  const uniqueFlags = [...new Set(input)];

  if (
    uniqueFlags.some((flag) => typeof flag !== "string" || !MATCH_FLAG_SET.has(flag))
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

function normalizeContinuityChange(input, parentName) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(input, "status", parentName);
  assertRequiredString(input, "filePath", parentName);

  if (!CONTINUITY_CHANGE_STATUS_SET.has(input.status)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.status' must be one of: ${[
        MATCHED_STATUS,
        NEWLY_OBSERVED_STATUS,
        NO_LONGER_OBSERVED_STATUS,
      ].join(", ")}`
    );
  }

  const normalizedFlags = normalizeMatchFlags(input.flags, parentName, input.status);
  const normalizedPreviousMarker =
    input.previousMarker === undefined
      ? undefined
      : normalizeComparisonMarker(input.previousMarker, `${parentName}.previousMarker`);
  const normalizedCurrentMarker =
    input.currentMarker === undefined
      ? undefined
      : normalizeComparisonMarker(input.currentMarker, `${parentName}.currentMarker`);

  if (input.status === MATCHED_STATUS) {
    if (normalizedPreviousMarker === undefined || normalizedCurrentMarker === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'${parentName}' must include previous and current markers for '${MATCHED_STATUS}'`
      );
    }
  }

  if (input.status === NEWLY_OBSERVED_STATUS) {
    if (normalizedPreviousMarker !== undefined || normalizedCurrentMarker === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'${parentName}' must include only currentMarker for '${NEWLY_OBSERVED_STATUS}'`
      );
    }
  }

  if (input.status === NO_LONGER_OBSERVED_STATUS) {
    if (normalizedPreviousMarker === undefined || normalizedCurrentMarker !== undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'${parentName}' must include only previousMarker for '${NO_LONGER_OBSERVED_STATUS}'`
      );
    }
  }

  return {
    status: input.status,
    filePath: input.filePath,
    ...(input.status === MATCHED_STATUS ? { flags: normalizedFlags } : {}),
    ...(normalizedPreviousMarker === undefined
      ? {}
      : { previousMarker: normalizedPreviousMarker }),
    ...(normalizedCurrentMarker === undefined
      ? {}
      : { currentMarker: normalizedCurrentMarker }),
  };
}

function normalizeAmbiguousCase(input, parentName) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(input, "status", parentName);
  assertRequiredString(input, "filePath", parentName);

  if (input.status !== AMBIGUOUS_STATUS) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.status' must be '${AMBIGUOUS_STATUS}'`
    );
  }

  if (!Array.isArray(input.previousCandidates) || !Array.isArray(input.currentCandidates)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must include previousCandidates and currentCandidates arrays`
    );
  }

  if (input.previousCandidates.length === 0 || input.currentCandidates.length === 0) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must include at least one previous and current candidate`
    );
  }

  return {
    status: input.status,
    filePath: input.filePath,
    previousCandidates: input.previousCandidates.map((marker, index) =>
      normalizeComparisonMarker(marker, `${parentName}.previousCandidates[${index}]`)
    ),
    currentCandidates: input.currentCandidates.map((marker, index) =>
      normalizeComparisonMarker(marker, `${parentName}.currentCandidates[${index}]`)
    ),
  };
}

function normalizeSnapshotVersion(input, fieldName, parentName) {
  const value = input[fieldName];

  if (value === null) {
    return null;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be a positive integer or null`
    );
  }

  return value;
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
  assertNonNegativeInteger(input, "currentSnapshotVersion", "markerContinuityView");

  if (input.comparisonVersion !== COMPARISON_VERSION) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'markerContinuityView.comparisonVersion' must be ${COMPARISON_VERSION}`
    );
  }

  if (input.markerFamily !== MARKER_FAMILY) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerContinuityView.markerFamily' must be 'slash'"
    );
  }

  if (input.currentSnapshotVersion < 1) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerContinuityView.currentSnapshotVersion' must be greater than or equal to 1"
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
    previousSnapshotVersion: normalizeSnapshotVersion(
      input,
      "previousSnapshotVersion",
      "markerContinuityView"
    ),
    currentSnapshotVersion: input.currentSnapshotVersion,
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

function normalizeMarkerTemporalSignalsThresholds(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerTemporalSignalsView.thresholds' must be an object"
    );
  }

  assertNonNegativeInteger(input, "staleHoldDays", "markerTemporalSignalsView.thresholds");
  assertNonNegativeInteger(
    input,
    "unresolvedKillDays",
    "markerTemporalSignalsView.thresholds"
  );

  return {
    staleHoldDays: input.staleHoldDays,
    unresolvedKillDays: input.unresolvedKillDays,
  };
}

function normalizeMarkerTemporalSignalFinding(input, parentName) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(input, "code", parentName);
  assertRequiredString(input, "filePath", parentName);
  assertRequiredString(input, "currentTierEnteredAt", parentName);
  assertRequiredString(input, "observedAt", parentName);
  assertNonNegativeInteger(input, "ageDays", parentName);
  assertNonNegativeInteger(input, "thresholdDays", parentName);

  if (!TEMPORAL_FINDING_CODE_SET.has(input.code)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.code' must be one of: ${TEMPORAL_FINDING_CODES.join(", ")}`
    );
  }

  return {
    code: input.code,
    filePath: input.filePath,
    currentMarker: normalizeComparisonMarker(
      input.currentMarker,
      `${parentName}.currentMarker`
    ),
    currentTierEnteredAt: input.currentTierEnteredAt,
    observedAt: input.observedAt,
    ageDays: input.ageDays,
    thresholdDays: input.thresholdDays,
  };
}

function normalizeMarkerTemporalSignalErrorDetails(input, parentName) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  const normalized = {};

  if (Object.prototype.hasOwnProperty.call(input, "timelineIndex")) {
    if (input.timelineIndex !== null) {
      assertNonNegativeInteger(input, "timelineIndex", parentName);
    }
    normalized.timelineIndex = input.timelineIndex;
  }

  for (const fieldName of [
    "observedAt",
    "previousObservedAt",
    "currentObservedAt",
    "markerFamily",
    "filePath",
  ]) {
    if (Object.prototype.hasOwnProperty.call(input, fieldName)) {
      normalized[fieldName] = normalizeOptionalStringOrNull(input, fieldName, parentName);
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "currentMarker")) {
    normalized.currentMarker =
      input.currentMarker === null
        ? null
        : normalizeComparisonMarker(input.currentMarker, `${parentName}.currentMarker`);
  }

  return normalized;
}

function normalizeMarkerTemporalSignalError(input, parentName) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(input, "code", parentName);

  if (!TEMPORAL_ERROR_CODE_SET.has(input.code)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.code' must be one of: ${TEMPORAL_ERROR_CODES.join(", ")}`
    );
  }

  return {
    code: input.code,
    details: normalizeMarkerTemporalSignalErrorDetails(
      input.details,
      `${parentName}.details`
    ),
  };
}

function normalizeMarkerTemporalSignalTimeline(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerTemporalSignalsView.timeline' must be an object"
    );
  }

  assertNonNegativeInteger(input, "entryCount", "markerTemporalSignalsView.timeline");

  return {
    entryCount: input.entryCount,
    earliestObservedAt: normalizeOptionalStringOrNull(
      input,
      "earliestObservedAt",
      "markerTemporalSignalsView.timeline"
    ),
    latestObservedAt: normalizeOptionalStringOrNull(
      input,
      "latestObservedAt",
      "markerTemporalSignalsView.timeline"
    ),
  };
}

function normalizeMarkerTemporalSignalTrendSummary(input) {
  if (input === null) {
    return null;
  }

  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerTemporalSignalsView.trendSummary' must be an object or null"
    );
  }

  assertRequiredString(
    input,
    "earliestObservedAt",
    "markerTemporalSignalsView.trendSummary"
  );
  assertRequiredString(
    input,
    "latestObservedAt",
    "markerTemporalSignalsView.trendSummary"
  );

  if (!isPlainObject(input.continuityCounts)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerTemporalSignalsView.trendSummary.continuityCounts' must be an object"
    );
  }

  if (!isPlainObject(input.netTierDeltas)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerTemporalSignalsView.trendSummary.netTierDeltas' must be an object"
    );
  }

  for (const fieldName of [
    "matched",
    "newlyObserved",
    "noLongerObserved",
    "moved",
    "retiered",
    "ambiguous",
  ]) {
    assertNonNegativeInteger(
      input.continuityCounts,
      fieldName,
      "markerTemporalSignalsView.trendSummary.continuityCounts"
    );
  }

  for (const tier of TIER_ORDER) {
    assertInteger(
      input.netTierDeltas,
      tier,
      "markerTemporalSignalsView.trendSummary.netTierDeltas"
    );
  }

  return {
    earliestObservedAt: input.earliestObservedAt,
    latestObservedAt: input.latestObservedAt,
    earliestTierTotals: normalizeTierTotals(
      input.earliestTierTotals,
      "markerTemporalSignalsView.trendSummary.earliestTierTotals"
    ),
    latestTierTotals: normalizeTierTotals(
      input.latestTierTotals,
      "markerTemporalSignalsView.trendSummary.latestTierTotals"
    ),
    netTierDeltas: {
      WATCH: input.netTierDeltas.WATCH,
      GAP: input.netTierDeltas.GAP,
      HOLD: input.netTierDeltas.HOLD,
      KILL: input.netTierDeltas.KILL,
    },
    continuityCounts: {
      matched: input.continuityCounts.matched,
      newlyObserved: input.continuityCounts.newlyObserved,
      noLongerObserved: input.continuityCounts.noLongerObserved,
      moved: input.continuityCounts.moved,
      retiered: input.continuityCounts.retiered,
      ambiguous: input.continuityCounts.ambiguous,
    },
  };
}

function normalizeMarkerTemporalSignalsView(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerTemporalSignalsView' must be an object"
    );
  }

  assertNonNegativeInteger(input, "temporalVersion", "markerTemporalSignalsView");
  assertRequiredString(input, "markerFamily", "markerTemporalSignalsView");

  if (input.temporalVersion !== TEMPORAL_SIGNALS_VERSION) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'markerTemporalSignalsView.temporalVersion' must be ${TEMPORAL_SIGNALS_VERSION}`
    );
  }

  if (input.markerFamily !== MARKER_FAMILY) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerTemporalSignalsView.markerFamily' must be 'slash'"
    );
  }

  if (!Array.isArray(input.findings)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerTemporalSignalsView.findings' must be an array"
    );
  }

  if (!Array.isArray(input.errors)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'markerTemporalSignalsView.errors' must be an array"
    );
  }

  return {
    temporalVersion: input.temporalVersion,
    markerFamily: input.markerFamily,
    thresholds: normalizeMarkerTemporalSignalsThresholds(input.thresholds),
    timeline: normalizeMarkerTemporalSignalTimeline(input.timeline),
    findings: input.findings.map((finding, index) =>
      normalizeMarkerTemporalSignalFinding(
        finding,
        `markerTemporalSignalsView.findings[${index}]`
      )
    ),
    errors: input.errors.map((error, index) =>
      normalizeMarkerTemporalSignalError(
        error,
        `markerTemporalSignalsView.errors[${index}]`
      )
    ),
    trendSummary: normalizeMarkerTemporalSignalTrendSummary(input.trendSummary),
  };
}

class ConfidenceSkill {
  renderConfidence(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
    }

    if (input.confidenceGradientView === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'confidenceGradientView' is required"
      );
    }

    const normalizedView = normalizeConfidenceGradientView(
      input.confidenceGradientView
    );
    const normalizedRequiredCoverage =
      input.requiredCoverageView === undefined
        ? null
        : normalizeRequiredCoverageView(input.requiredCoverageView);
    const normalizedMarkerContinuity =
      input.markerContinuityView === undefined
        ? null
        : normalizeMarkerContinuityView(input.markerContinuityView);
    const normalizedMarkerTemporalSignals =
      input.markerTemporalSignalsView === undefined
        ? null
        : normalizeMarkerTemporalSignalsView(input.markerTemporalSignalsView);

    const routeView = {
      route: "/confidence",
      markerFamily: normalizedView.markerFamily,
      tierTotals: cloneTierTotals(normalizedView.tierTotals),
      fileMarkerMap: normalizedView.files.map((file) => ({
        filePath: file.filePath,
        domain: cloneDomain(file.domain),
        markerCount: file.markerCount,
        tierTotals: cloneTierTotals(file.tierTotals),
        markers: file.markers.map((marker) => ({
          lineNumber: marker.lineNumber,
          tier: marker.tier,
          marker: marker.marker,
        })),
      })),
      domainGrouping: normalizedView.domainGroups.map((group) => ({
        domainId: group.domainId,
        label: group.label,
        fileCount: group.fileCount,
        markerCount: group.markerCount,
        tierTotals: cloneTierTotals(group.tierTotals),
        filePaths: [...group.filePaths],
      })),
      topHoldKillLocations: buildTopHoldKillLocations(normalizedView.files),
    };

    if (normalizedRequiredCoverage === null) {
      if (
        normalizedMarkerContinuity === null &&
        normalizedMarkerTemporalSignals === null
      ) {
        return routeView;
      }
    } else {
      routeView.requiredCoverage = {
        policyMode: normalizedRequiredCoverage.policyMode,
        markerFamily: normalizedRequiredCoverage.markerFamily,
        targetCount: normalizedRequiredCoverage.targetCount,
        evaluatedTargetCount: normalizedRequiredCoverage.evaluatedTargetCount,
        findings: normalizedRequiredCoverage.findings.map((finding) => ({
          code: finding.code,
          policyTargetId: finding.policyTargetId,
          filePath: finding.filePath,
          domain: cloneDomain(finding.domain),
          markerCount: finding.markerCount,
          minimumMarkerCount: finding.minimumMarkerCount,
        })),
        policyErrors: normalizedRequiredCoverage.policyErrors.map((policyError) => ({
          code: policyError.code,
          policyTargetId: policyError.policyTargetId,
          filePath: policyError.filePath,
        })),
      };
    }

    if (normalizedMarkerContinuity !== null) {
      routeView.markerContinuity = {
        comparisonVersion: normalizedMarkerContinuity.comparisonVersion,
        markerFamily: normalizedMarkerContinuity.markerFamily,
        previousSnapshotVersion: normalizedMarkerContinuity.previousSnapshotVersion,
        currentSnapshotVersion: normalizedMarkerContinuity.currentSnapshotVersion,
        continuityChanges: normalizedMarkerContinuity.continuityChanges.map((change) => ({
          status: change.status,
          filePath: change.filePath,
          ...(change.flags === undefined ? {} : { flags: [...change.flags] }),
          ...(change.previousMarker === undefined
            ? {}
            : {
                previousMarker: {
                  ...change.previousMarker,
                },
              }),
          ...(change.currentMarker === undefined
            ? {}
            : {
                currentMarker: {
                  ...change.currentMarker,
                },
              }),
        })),
        ambiguousCases: normalizedMarkerContinuity.ambiguousCases.map(
          (ambiguousCase) => ({
            status: ambiguousCase.status,
            filePath: ambiguousCase.filePath,
            previousCandidates: ambiguousCase.previousCandidates.map((marker) => ({
              ...marker,
            })),
            currentCandidates: ambiguousCase.currentCandidates.map((marker) => ({
              ...marker,
            })),
          })
        ),
      };
    }

    if (normalizedMarkerTemporalSignals !== null) {
      routeView.markerTemporalSignals = {
        temporalVersion: normalizedMarkerTemporalSignals.temporalVersion,
        markerFamily: normalizedMarkerTemporalSignals.markerFamily,
        thresholds: {
          staleHoldDays: normalizedMarkerTemporalSignals.thresholds.staleHoldDays,
          unresolvedKillDays:
            normalizedMarkerTemporalSignals.thresholds.unresolvedKillDays,
        },
        timeline: {
          entryCount: normalizedMarkerTemporalSignals.timeline.entryCount,
          earliestObservedAt:
            normalizedMarkerTemporalSignals.timeline.earliestObservedAt,
          latestObservedAt: normalizedMarkerTemporalSignals.timeline.latestObservedAt,
        },
        findings: normalizedMarkerTemporalSignals.findings.map((finding) => ({
          code: finding.code,
          filePath: finding.filePath,
          currentMarker: {
            ...finding.currentMarker,
          },
          currentTierEnteredAt: finding.currentTierEnteredAt,
          observedAt: finding.observedAt,
          ageDays: finding.ageDays,
          thresholdDays: finding.thresholdDays,
        })),
        errors: normalizedMarkerTemporalSignals.errors.map((error) => ({
          code: error.code,
          details: {
            ...error.details,
            ...(error.details.currentMarker === undefined ||
            error.details.currentMarker === null
              ? {}
              : {
                  currentMarker: {
                    ...error.details.currentMarker,
                  },
                }),
          },
        })),
        trendSummary:
          normalizedMarkerTemporalSignals.trendSummary === null
            ? null
            : {
                earliestObservedAt:
                  normalizedMarkerTemporalSignals.trendSummary.earliestObservedAt,
                latestObservedAt:
                  normalizedMarkerTemporalSignals.trendSummary.latestObservedAt,
                earliestTierTotals: cloneTierTotals(
                  normalizedMarkerTemporalSignals.trendSummary.earliestTierTotals
                ),
                latestTierTotals: cloneTierTotals(
                  normalizedMarkerTemporalSignals.trendSummary.latestTierTotals
                ),
                netTierDeltas: {
                  WATCH: normalizedMarkerTemporalSignals.trendSummary.netTierDeltas.WATCH,
                  GAP: normalizedMarkerTemporalSignals.trendSummary.netTierDeltas.GAP,
                  HOLD: normalizedMarkerTemporalSignals.trendSummary.netTierDeltas.HOLD,
                  KILL: normalizedMarkerTemporalSignals.trendSummary.netTierDeltas.KILL,
                },
                continuityCounts: {
                  matched:
                    normalizedMarkerTemporalSignals.trendSummary.continuityCounts
                      .matched,
                  newlyObserved:
                    normalizedMarkerTemporalSignals.trendSummary.continuityCounts
                      .newlyObserved,
                  noLongerObserved:
                    normalizedMarkerTemporalSignals.trendSummary.continuityCounts
                      .noLongerObserved,
                  moved:
                    normalizedMarkerTemporalSignals.trendSummary.continuityCounts
                      .moved,
                  retiered:
                    normalizedMarkerTemporalSignals.trendSummary.continuityCounts
                      .retiered,
                  ambiguous:
                    normalizedMarkerTemporalSignals.trendSummary.continuityCounts
                      .ambiguous,
                },
              },
      };
    }

    return routeView;
  }
}

module.exports = {
  ConfidenceSkill,
  SKILL_ROUTES,
};
