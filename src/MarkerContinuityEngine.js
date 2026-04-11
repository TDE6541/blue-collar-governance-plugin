"use strict";

const {
  MARKER_FAMILY,
  SCAN_FENCE,
  SNAPSHOT_VERSION,
  TIER_DEFINITIONS,
  TIER_ORDER,
} = require("./ConfidenceGradientEngine");

const COMPARISON_VERSION = 1;
const MATCHED_STATUS = "MATCHED";
const NEWLY_OBSERVED_STATUS = "NEWLY_OBSERVED";
const NO_LONGER_OBSERVED_STATUS = "NO_LONGER_OBSERVED";
const AMBIGUOUS_STATUS = "AMBIGUOUS";
const CONTINUITY_CHANGE_STATUSES = Object.freeze([
  MATCHED_STATUS,
  NEWLY_OBSERVED_STATUS,
  NO_LONGER_OBSERVED_STATUS,
]);
const CONTINUITY_STATUSES = Object.freeze([
  ...CONTINUITY_CHANGE_STATUSES,
  AMBIGUOUS_STATUS,
]);
const MATCH_FLAGS = Object.freeze(["moved", "retiered"]);
const CHANGE_STATUS_ORDER = new Map(
  CONTINUITY_CHANGE_STATUSES.map((status, index) => [status, index])
);
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

function assertRequiredString(input, fieldName, parentName) {
  const value = input[fieldName];

  if (typeof value !== "string" || value.trim() === "") {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be a non-empty string`
    );
  }
}

function assertNonNegativeInteger(input, fieldName, parentName) {
  const value = input[fieldName];

  if (!Number.isInteger(value) || value < 0) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be a non-negative integer`
    );
  }
}

function normalizeOptionalStringOrNull(input, fieldName, parentName) {
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

function cloneComparisonMarker(marker) {
  return {
    lineNumber: marker.lineNumber,
    tier: marker.tier,
    marker: marker.marker,
    slashCount: marker.slashCount,
    trailingText: marker.trailingText,
  };
}

function compareStrings(left, right) {
  return left.localeCompare(right);
}

function compareMarkers(left, right) {
  if (left.lineNumber !== right.lineNumber) {
    return left.lineNumber - right.lineNumber;
  }

  if (left.tier !== right.tier) {
    return left.tier.localeCompare(right.tier);
  }

  return left.marker.localeCompare(right.marker);
}

function compareContinuityChanges(left, right) {
  const filePathComparison = left.filePath.localeCompare(right.filePath);

  if (filePathComparison !== 0) {
    return filePathComparison;
  }

  const leftStatusRank = CHANGE_STATUS_ORDER.get(left.status);
  const rightStatusRank = CHANGE_STATUS_ORDER.get(right.status);

  if (leftStatusRank !== rightStatusRank) {
    return leftStatusRank - rightStatusRank;
  }

  const leftLineNumber =
    left.currentMarker === undefined
      ? left.previousMarker.lineNumber
      : left.currentMarker.lineNumber;
  const rightLineNumber =
    right.currentMarker === undefined
      ? right.previousMarker.lineNumber
      : right.currentMarker.lineNumber;

  return leftLineNumber - rightLineNumber;
}

function compareAmbiguousCases(left, right) {
  const filePathComparison = left.filePath.localeCompare(right.filePath);

  if (filePathComparison !== 0) {
    return filePathComparison;
  }

  const leftPreviousLine =
    left.previousCandidates.length === 0 ? 0 : left.previousCandidates[0].lineNumber;
  const rightPreviousLine =
    right.previousCandidates.length === 0 ? 0 : right.previousCandidates[0].lineNumber;

  if (leftPreviousLine !== rightPreviousLine) {
    return leftPreviousLine - rightPreviousLine;
  }

  const leftCurrentLine =
    left.currentCandidates.length === 0 ? 0 : left.currentCandidates[0].lineNumber;
  const rightCurrentLine =
    right.currentCandidates.length === 0 ? 0 : right.currentCandidates[0].lineNumber;

  return leftCurrentLine - rightCurrentLine;
}

function groupMarkersByFingerprint(markers) {
  const groups = new Map();

  for (const marker of markers) {
    const fingerprint = marker.anchor.contextFingerprint;
    const existingGroup = groups.get(fingerprint);

    if (existingGroup) {
      existingGroup.push(marker);
      continue;
    }

    groups.set(fingerprint, [marker]);
  }

  return groups;
}

function buildTextKey(marker) {
  return marker.trailingText === null ? "<null>" : marker.trailingText;
}

function removeMatchedMarker(markers, markerId) {
  return markers.filter((marker) => marker._internalId !== markerId);
}

function resolveFingerprintGroup(previousGroup, currentGroup) {
  const matches = [];
  let remainingPrevious = [...previousGroup];
  let remainingCurrent = [...currentGroup];
  const textKeys = new Set([
    ...remainingPrevious.map(buildTextKey),
    ...remainingCurrent.map(buildTextKey),
  ]);

  for (const textKey of [...textKeys].sort(compareStrings)) {
    const previousMatches = remainingPrevious.filter(
      (marker) => buildTextKey(marker) === textKey
    );
    const currentMatches = remainingCurrent.filter(
      (marker) => buildTextKey(marker) === textKey
    );

    if (previousMatches.length !== 1 || currentMatches.length !== 1) {
      continue;
    }

    const previousMarker = previousMatches[0];
    const currentMarker = currentMatches[0];

    matches.push({
      previousMarker,
      currentMarker,
    });
    remainingPrevious = removeMatchedMarker(
      remainingPrevious,
      previousMarker._internalId
    );
    remainingCurrent = removeMatchedMarker(
      remainingCurrent,
      currentMarker._internalId
    );
  }

  return {
    matches,
    remainingPrevious,
    remainingCurrent,
  };
}

function normalizeSnapshotMarker(input, parentName) {
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

  const trailingText = normalizeOptionalStringOrNull(input, "trailingText", parentName);

  if (!isPlainObject(input.anchor)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.anchor' must be an object`
    );
  }

  assertRequiredString(input.anchor, "contextFingerprint", `${parentName}.anchor`);

  if (
    !Array.isArray(input.anchor.neighborhoodLines) ||
    input.anchor.neighborhoodLines.some(
      (line) => typeof line !== "string" || line.trim() === ""
    )
  ) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.anchor.neighborhoodLines' must be an array of non-empty strings`
    );
  }

  return {
    lineNumber: input.lineNumber,
    tier: input.tier,
    marker: input.marker,
    slashCount: input.slashCount,
    trailingText,
    anchor: {
      contextFingerprint: input.anchor.contextFingerprint,
      neighborhoodLines: [...input.anchor.neighborhoodLines].sort(compareStrings),
    },
  };
}

function normalizeSnapshotFile(input, parentName) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(input, "filePath", parentName);
  assertNonNegativeInteger(input, "markerCount", parentName);

  if (!Array.isArray(input.markers)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.markers' must be an array`
    );
  }

  const normalizedMarkers = input.markers
    .map((marker, index) =>
      normalizeSnapshotMarker(marker, `${parentName}.markers[${index}]`)
    )
    .sort(compareMarkers);

  if (input.markerCount !== normalizedMarkers.length) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.markerCount' must equal '${parentName}.markers.length'`
    );
  }

  return {
    filePath: input.filePath,
    markerCount: input.markerCount,
    markers: normalizedMarkers,
  };
}

function normalizeSnapshot(input, parentName, { allowNull = false } = {}) {
  if (allowNull && input === null) {
    return null;
  }

  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertNonNegativeInteger(input, "snapshotVersion", parentName);
  assertRequiredString(input, "markerFamily", parentName);

  if (input.snapshotVersion !== SNAPSHOT_VERSION) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.snapshotVersion' must be ${SNAPSHOT_VERSION}`
    );
  }

  if (input.markerFamily !== MARKER_FAMILY) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.markerFamily' must be '${MARKER_FAMILY}'`
    );
  }

  if (!isPlainObject(input.scanFence)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.scanFence' must be an object`
    );
  }

  if (
    !Array.isArray(input.scanFence.roots) ||
    input.scanFence.roots.length !== SCAN_FENCE.roots.length ||
    input.scanFence.roots.some((root, index) => root !== SCAN_FENCE.roots[index])
  ) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.scanFence.roots' must match the Confidence scan fence`
    );
  }

  if (input.scanFence.extension !== SCAN_FENCE.extension) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.scanFence.extension' must be '${SCAN_FENCE.extension}'`
    );
  }

  if (!Array.isArray(input.files)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.files' must be an array`
    );
  }

  const normalizedFiles = input.files
    .map((file, index) => normalizeSnapshotFile(file, `${parentName}.files[${index}]`))
    .sort((left, right) => left.filePath.localeCompare(right.filePath));
  const seen = new Set();

  for (const file of normalizedFiles) {
    if (seen.has(file.filePath)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'${parentName}.files' must have unique file paths`
      );
    }

    seen.add(file.filePath);
  }

  return {
    snapshotVersion: input.snapshotVersion,
    markerFamily: input.markerFamily,
    scanFence: {
      roots: [...input.scanFence.roots],
      extension: input.scanFence.extension,
    },
    files: normalizedFiles,
  };
}

function buildMarkerInstance(marker, filePath, prefix, index) {
  return {
    ...marker,
    filePath,
    _internalId: `${prefix}:${filePath}:${index}`,
  };
}

function compareFileMarkers(filePath, previousMarkers, currentMarkers) {
  const continuityChanges = [];
  const ambiguousCases = [];
  const unresolvedPreviousIds = new Set(
    previousMarkers.map((marker) => marker._internalId)
  );
  const unresolvedCurrentIds = new Set(
    currentMarkers.map((marker) => marker._internalId)
  );
  const previousByFingerprint = groupMarkersByFingerprint(previousMarkers);
  const currentByFingerprint = groupMarkersByFingerprint(currentMarkers);
  const fingerprints = new Set([
    ...previousByFingerprint.keys(),
    ...currentByFingerprint.keys(),
  ]);

  for (const fingerprint of [...fingerprints].sort(compareStrings)) {
    const previousGroup = (previousByFingerprint.get(fingerprint) || []).filter((marker) =>
      unresolvedPreviousIds.has(marker._internalId)
    );
    const currentGroup = (currentByFingerprint.get(fingerprint) || []).filter((marker) =>
      unresolvedCurrentIds.has(marker._internalId)
    );

    if (previousGroup.length === 0 || currentGroup.length === 0) {
      continue;
    }

    const resolution = resolveFingerprintGroup(previousGroup, currentGroup);

    for (const match of resolution.matches) {
      unresolvedPreviousIds.delete(match.previousMarker._internalId);
      unresolvedCurrentIds.delete(match.currentMarker._internalId);

      const flags = [];

      if (match.previousMarker.lineNumber !== match.currentMarker.lineNumber) {
        flags.push("moved");
      }

      if (match.previousMarker.tier !== match.currentMarker.tier) {
        flags.push("retiered");
      }

      continuityChanges.push({
        status: MATCHED_STATUS,
        filePath,
        flags,
        previousMarker: cloneComparisonMarker(match.previousMarker),
        currentMarker: cloneComparisonMarker(match.currentMarker),
      });
    }

    if (
      resolution.remainingPrevious.length > 0 &&
      resolution.remainingCurrent.length > 0
    ) {
      for (const marker of resolution.remainingPrevious) {
        unresolvedPreviousIds.delete(marker._internalId);
      }

      for (const marker of resolution.remainingCurrent) {
        unresolvedCurrentIds.delete(marker._internalId);
      }

      ambiguousCases.push({
        status: AMBIGUOUS_STATUS,
        filePath,
        previousCandidates: resolution.remainingPrevious
          .map(cloneComparisonMarker)
          .sort(compareMarkers),
        currentCandidates: resolution.remainingCurrent
          .map(cloneComparisonMarker)
          .sort(compareMarkers),
      });
    }
  }

  for (const marker of previousMarkers) {
    if (!unresolvedPreviousIds.has(marker._internalId)) {
      continue;
    }

    continuityChanges.push({
      status: NO_LONGER_OBSERVED_STATUS,
      filePath,
      previousMarker: cloneComparisonMarker(marker),
    });
  }

  for (const marker of currentMarkers) {
    if (!unresolvedCurrentIds.has(marker._internalId)) {
      continue;
    }

    continuityChanges.push({
      status: NEWLY_OBSERVED_STATUS,
      filePath,
      currentMarker: cloneComparisonMarker(marker),
    });
  }

  return {
    continuityChanges,
    ambiguousCases,
  };
}

class MarkerContinuityEngine {
  compare(previousSnapshot, currentSnapshot) {
    const normalizedPrevious = normalizeSnapshot(previousSnapshot, "previousSnapshot", {
      allowNull: true,
    });
    const normalizedCurrent = normalizeSnapshot(currentSnapshot, "currentSnapshot");

    if (normalizedPrevious === null) {
      return {
        comparisonVersion: COMPARISON_VERSION,
        markerFamily: normalizedCurrent.markerFamily,
        previousSnapshotVersion: null,
        currentSnapshotVersion: normalizedCurrent.snapshotVersion,
        continuityChanges: [],
        ambiguousCases: [],
      };
    }

    const previousFilesByPath = new Map(
      normalizedPrevious.files.map((file) => [file.filePath, file])
    );
    const currentFilesByPath = new Map(
      normalizedCurrent.files.map((file) => [file.filePath, file])
    );
    const filePaths = new Set([
      ...previousFilesByPath.keys(),
      ...currentFilesByPath.keys(),
    ]);
    const continuityChanges = [];
    const ambiguousCases = [];

    for (const filePath of [...filePaths].sort(compareStrings)) {
      const previousFile = previousFilesByPath.get(filePath);
      const currentFile = currentFilesByPath.get(filePath);
      const previousMarkers =
        previousFile === undefined
          ? []
          : previousFile.markers.map((marker, index) =>
              buildMarkerInstance(marker, filePath, "previous", index)
            );
      const currentMarkers =
        currentFile === undefined
          ? []
          : currentFile.markers.map((marker, index) =>
              buildMarkerInstance(marker, filePath, "current", index)
            );
      const fileComparison = compareFileMarkers(
        filePath,
        previousMarkers,
        currentMarkers
      );

      continuityChanges.push(...fileComparison.continuityChanges);
      ambiguousCases.push(...fileComparison.ambiguousCases);
    }

    return {
      comparisonVersion: COMPARISON_VERSION,
      markerFamily: normalizedCurrent.markerFamily,
      previousSnapshotVersion: normalizedPrevious.snapshotVersion,
      currentSnapshotVersion: normalizedCurrent.snapshotVersion,
      continuityChanges: continuityChanges.sort(compareContinuityChanges),
      ambiguousCases: ambiguousCases.sort(compareAmbiguousCases),
    };
  }
}

module.exports = {
  AMBIGUOUS_STATUS,
  COMPARISON_VERSION,
  CONTINUITY_CHANGE_STATUSES,
  CONTINUITY_STATUSES,
  MATCHED_STATUS,
  MATCH_FLAGS,
  MarkerContinuityEngine,
  NEWLY_OBSERVED_STATUS,
  NO_LONGER_OBSERVED_STATUS,
};
