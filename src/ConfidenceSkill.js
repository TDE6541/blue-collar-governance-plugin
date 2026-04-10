"use strict";

const {
  MARKER_FAMILY,
  TIER_DEFINITIONS,
  TIER_ORDER,
} = require("./ConfidenceGradientEngine");

const SKILL_ROUTES = Object.freeze(["/confidence"]);
const HIGH_SEVERITY_TIERS = new Set(["HOLD", "KILL"]);
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

    return {
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
  }
}

module.exports = {
  ConfidenceSkill,
  SKILL_ROUTES,
};
