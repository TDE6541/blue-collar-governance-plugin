"use strict";

const {
  MARKER_FAMILY,
  SCAN_FENCE,
  TIER_ORDER,
} = require("./ConfidenceGradientEngine");
const {
  MATCHED_STATUS,
  MarkerContinuityEngine,
  NEWLY_OBSERVED_STATUS,
  NO_LONGER_OBSERVED_STATUS,
} = require("./MarkerContinuityEngine");

const TEMPORAL_SIGNALS_VERSION = 1;
const STALE_HOLD_CODE = "STALE_HOLD";
const UNRESOLVED_KILL_CODE = "UNRESOLVED_KILL";
const TEMPORAL_FINDING_CODES = Object.freeze([
  STALE_HOLD_CODE,
  UNRESOLVED_KILL_CODE,
]);
const TIMELINE_TOO_SHORT_CODE = "TIMELINE_TOO_SHORT";
const TIMELINE_TIMESTAMP_INVALID_CODE = "TIMELINE_TIMESTAMP_INVALID";
const TIMELINE_ORDER_INVALID_CODE = "TIMELINE_ORDER_INVALID";
const TIMELINE_MARKER_FAMILY_MISMATCH_CODE = "TIMELINE_MARKER_FAMILY_MISMATCH";
const TIMELINE_SCAN_FENCE_MISMATCH_CODE = "TIMELINE_SCAN_FENCE_MISMATCH";
const TEMPORAL_LINEAGE_AMBIGUOUS_CODE = "TEMPORAL_LINEAGE_AMBIGUOUS";
const TEMPORAL_ERROR_CODES = Object.freeze([
  TIMELINE_TOO_SHORT_CODE,
  TIMELINE_TIMESTAMP_INVALID_CODE,
  TIMELINE_ORDER_INVALID_CODE,
  TIMELINE_MARKER_FAMILY_MISMATCH_CODE,
  TIMELINE_SCAN_FENCE_MISMATCH_CODE,
  TEMPORAL_LINEAGE_AMBIGUOUS_CODE,
]);
const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_UTC_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/;
const FINDING_CODE_ORDER = new Map(
  TEMPORAL_FINDING_CODES.map((code, index) => [code, index])
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

function assertNonNegativeInteger(input, fieldName, parentName) {
  const value = input[fieldName];

  if (!Number.isInteger(value) || value < 0) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be a non-negative integer`
    );
  }
}

function createTierTotals() {
  return {
    WATCH: 0,
    GAP: 0,
    HOLD: 0,
    KILL: 0,
  };
}

function cloneTierTotals(tierTotals) {
  return {
    WATCH: tierTotals.WATCH,
    GAP: tierTotals.GAP,
    HOLD: tierTotals.HOLD,
    KILL: tierTotals.KILL,
  };
}

function createContinuityCounts() {
  return {
    matched: 0,
    newlyObserved: 0,
    noLongerObserved: 0,
    moved: 0,
    retiered: 0,
    ambiguous: 0,
  };
}

function cloneContinuityCounts(continuityCounts) {
  return {
    matched: continuityCounts.matched,
    newlyObserved: continuityCounts.newlyObserved,
    noLongerObserved: continuityCounts.noLongerObserved,
    moved: continuityCounts.moved,
    retiered: continuityCounts.retiered,
    ambiguous: continuityCounts.ambiguous,
  };
}

function normalizeMarker(marker, parentName) {
  if (!isPlainObject(marker)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertNonNegativeInteger(marker, "lineNumber", parentName);
  assertNonNegativeInteger(marker, "slashCount", parentName);

  if (marker.lineNumber < 1) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.lineNumber' must be greater than or equal to 1`
    );
  }

  if (typeof marker.tier !== "string" || !TIER_ORDER.includes(marker.tier)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.tier' must be one of: ${TIER_ORDER.join(", ")}`
    );
  }

  if (typeof marker.marker !== "string" || marker.marker.trim() === "") {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.marker' must be a non-empty string`
    );
  }

  if (marker.slashCount !== marker.marker.length) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.slashCount' must match '${parentName}.marker' length`
    );
  }

  if (
    marker.trailingText !== null &&
    (typeof marker.trailingText !== "string" || marker.trailingText.trim() === "")
  ) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.trailingText' must be a non-empty string or null`
    );
  }

  return {
    lineNumber: marker.lineNumber,
    tier: marker.tier,
    marker: marker.marker,
    slashCount: marker.slashCount,
    trailingText: marker.trailingText,
  };
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

function buildMarkerKey(filePath, marker) {
  return [
    filePath,
    marker.lineNumber,
    marker.tier,
    marker.marker,
    marker.slashCount,
    marker.trailingText === null ? "<null>" : marker.trailingText,
  ].join("|");
}

function cloneErrorDetails(details) {
  const cloned = {};

  if (details.timelineIndex !== undefined) {
    cloned.timelineIndex = details.timelineIndex;
  }

  if (details.observedAt !== undefined) {
    cloned.observedAt = details.observedAt;
  }

  if (details.previousObservedAt !== undefined) {
    cloned.previousObservedAt = details.previousObservedAt;
  }

  if (details.currentObservedAt !== undefined) {
    cloned.currentObservedAt = details.currentObservedAt;
  }

  if (details.markerFamily !== undefined) {
    cloned.markerFamily = details.markerFamily;
  }

  if (details.filePath !== undefined) {
    cloned.filePath = details.filePath;
  }

  if (details.currentMarker !== undefined) {
    cloned.currentMarker = cloneMarker(details.currentMarker);
  }

  return cloned;
}

function cloneTemporalError(error) {
  return {
    code: error.code,
    details: cloneErrorDetails(error.details),
  };
}

function cloneTemporalFinding(finding) {
  return {
    code: finding.code,
    filePath: finding.filePath,
    currentMarker: cloneMarker(finding.currentMarker),
    currentTierEnteredAt: finding.currentTierEnteredAt,
    observedAt: finding.observedAt,
    ageDays: finding.ageDays,
    thresholdDays: finding.thresholdDays,
  };
}

function compareFindings(left, right) {
  const codeComparison =
    FINDING_CODE_ORDER.get(left.code) - FINDING_CODE_ORDER.get(right.code);

  if (codeComparison !== 0) {
    return codeComparison;
  }

  const filePathComparison = left.filePath.localeCompare(right.filePath);
  if (filePathComparison !== 0) {
    return filePathComparison;
  }

  return left.currentMarker.lineNumber - right.currentMarker.lineNumber;
}

function compareTemporalErrors(left, right) {
  const leftFilePath = left.details.filePath || "";
  const rightFilePath = right.details.filePath || "";
  const filePathComparison = leftFilePath.localeCompare(rightFilePath);

  if (filePathComparison !== 0) {
    return filePathComparison;
  }

  const leftLineNumber =
    left.details.currentMarker === undefined ? 0 : left.details.currentMarker.lineNumber;
  const rightLineNumber =
    right.details.currentMarker === undefined ? 0 : right.details.currentMarker.lineNumber;

  if (leftLineNumber !== rightLineNumber) {
    return leftLineNumber - rightLineNumber;
  }

  return left.code.localeCompare(right.code);
}

function normalizeOptions(options) {
  if (!isPlainObject(options)) {
    throw makeValidationError("ERR_INVALID_INPUT", "'options' must be an object");
  }

  assertNonNegativeInteger(options, "staleHoldDays", "options");
  assertNonNegativeInteger(options, "unresolvedKillDays", "options");

  return {
    staleHoldDays: options.staleHoldDays,
    unresolvedKillDays: options.unresolvedKillDays,
  };
}

function normalizeTimelineEntries(timelineEntries) {
  if (!Array.isArray(timelineEntries)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'timelineEntries' must be an array"
    );
  }

  return timelineEntries.map((entry, index) => {
    const parentName = `timelineEntries[${index}]`;

    if (!isPlainObject(entry)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'${parentName}' must be an object`
      );
    }

    if (!isPlainObject(entry.snapshot)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'${parentName}.snapshot' must be an object`
      );
    }

    return {
      observedAt: entry.observedAt,
      snapshot: entry.snapshot,
    };
  });
}

function parseObservedAt(observedAt) {
  if (typeof observedAt !== "string") {
    return null;
  }

  const match = ISO_UTC_TIMESTAMP_PATTERN.exec(observedAt);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const millisecond =
    match[7] === undefined ? 0 : Number(match[7].padEnd(3, "0"));
  const observedAtMs = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond
  );
  const date = new Date(observedAtMs);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second ||
    date.getUTCMilliseconds() !== millisecond
  ) {
    return null;
  }

  return {
    observedAt,
    observedAtMs,
  };
}

function matchesScanFence(scanFence) {
  return (
    isPlainObject(scanFence) &&
    Array.isArray(scanFence.roots) &&
    scanFence.roots.length === SCAN_FENCE.roots.length &&
    scanFence.roots.every((root, index) => root === SCAN_FENCE.roots[index]) &&
    scanFence.extension === SCAN_FENCE.extension
  );
}

function extractTierTotals(snapshot, parentName) {
  if (!isPlainObject(snapshot.totals) || !isPlainObject(snapshot.totals.tierTotals)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.totals.tierTotals' must be an object`
    );
  }

  const tierTotals = snapshot.totals.tierTotals;

  for (const tier of TIER_ORDER) {
    assertNonNegativeInteger(tierTotals, tier, `${parentName}.totals.tierTotals`);
  }

  return cloneTierTotals(tierTotals);
}

function buildBaseReport(entryCount, thresholds, earliestObservedAt, latestObservedAt) {
  return {
    temporalVersion: TEMPORAL_SIGNALS_VERSION,
    markerFamily: MARKER_FAMILY,
    thresholds: {
      staleHoldDays: thresholds.staleHoldDays,
      unresolvedKillDays: thresholds.unresolvedKillDays,
    },
    timeline: {
      entryCount,
      earliestObservedAt,
      latestObservedAt,
    },
    findings: [],
    errors: [],
    trendSummary: null,
  };
}

function validateTimeline(entries) {
  const errors = [];
  const parsedObservedAt = [];

  if (entries.length < 2) {
    errors.push({
      code: TIMELINE_TOO_SHORT_CODE,
      details: {},
    });
  }

  for (let index = 0; index < entries.length; index += 1) {
    const parsed = parseObservedAt(entries[index].observedAt);
    parsedObservedAt.push(parsed);

    if (parsed === null) {
      errors.push({
        code: TIMELINE_TIMESTAMP_INVALID_CODE,
        details: {
          timelineIndex: index,
          observedAt:
            typeof entries[index].observedAt === "string"
              ? entries[index].observedAt
              : null,
        },
      });
    }
  }

  if (parsedObservedAt.every(Boolean)) {
    for (let index = 1; index < parsedObservedAt.length; index += 1) {
      if (parsedObservedAt[index].observedAtMs <= parsedObservedAt[index - 1].observedAtMs) {
        errors.push({
          code: TIMELINE_ORDER_INVALID_CODE,
          details: {
            timelineIndex: index,
            previousObservedAt: parsedObservedAt[index - 1].observedAt,
            currentObservedAt: parsedObservedAt[index].observedAt,
          },
        });
      }
    }
  }

  for (let index = 0; index < entries.length; index += 1) {
    if (entries[index].snapshot.markerFamily !== MARKER_FAMILY) {
      errors.push({
        code: TIMELINE_MARKER_FAMILY_MISMATCH_CODE,
        details: {
          timelineIndex: index,
          markerFamily: entries[index].snapshot.markerFamily,
        },
      });
    }

    if (!matchesScanFence(entries[index].snapshot.scanFence)) {
      errors.push({
        code: TIMELINE_SCAN_FENCE_MISMATCH_CODE,
        details: {
          timelineIndex: index,
        },
      });
    }
  }

  const earliestObservedAt =
    parsedObservedAt.length > 0 && parsedObservedAt.every(Boolean)
      ? parsedObservedAt[0].observedAt
      : null;
  const latestObservedAt =
    parsedObservedAt.length > 0 && parsedObservedAt.every(Boolean)
      ? parsedObservedAt[parsedObservedAt.length - 1].observedAt
      : null;

  if (errors.length > 0) {
    return {
      errors,
      earliestObservedAt,
      latestObservedAt,
      timeline: null,
    };
  }

  return {
    errors: [],
    earliestObservedAt,
    latestObservedAt,
    timeline: entries.map((entry, index) => ({
      observedAt: parsedObservedAt[index].observedAt,
      observedAtMs: parsedObservedAt[index].observedAtMs,
      snapshot: entry.snapshot,
      tierTotals: extractTierTotals(entry.snapshot, `timelineEntries[${index}].snapshot`),
    })),
  };
}

function buildPairwiseState(timeline) {
  const continuityEngine = new MarkerContinuityEngine();
  const predecessorMaps = timeline.map(() => new Map());
  const ambiguousKeys = timeline.map(() => new Set());
  const continuityCounts = createContinuityCounts();

  for (let index = 1; index < timeline.length; index += 1) {
    const comparison = continuityEngine.compare(
      timeline[index - 1].snapshot,
      timeline[index].snapshot
    );

    for (const change of comparison.continuityChanges) {
      if (change.status === MATCHED_STATUS) {
        continuityCounts.matched += 1;
        continuityCounts.moved += change.flags.includes("moved") ? 1 : 0;
        continuityCounts.retiered += change.flags.includes("retiered") ? 1 : 0;
        predecessorMaps[index].set(buildMarkerKey(change.filePath, change.currentMarker), {
          previousKey: buildMarkerKey(change.filePath, change.previousMarker),
          previousMarker: cloneMarker(change.previousMarker),
        });
        continue;
      }

      if (change.status === NEWLY_OBSERVED_STATUS) {
        continuityCounts.newlyObserved += 1;
        continue;
      }

      if (change.status === NO_LONGER_OBSERVED_STATUS) {
        continuityCounts.noLongerObserved += 1;
      }
    }

    continuityCounts.ambiguous += comparison.ambiguousCases.length;

    for (const ambiguousCase of comparison.ambiguousCases) {
      for (const marker of ambiguousCase.previousCandidates) {
        ambiguousKeys[index - 1].add(buildMarkerKey(ambiguousCase.filePath, marker));
      }

      for (const marker of ambiguousCase.currentCandidates) {
        ambiguousKeys[index].add(buildMarkerKey(ambiguousCase.filePath, marker));
      }
    }
  }

  return {
    predecessorMaps,
    ambiguousKeys,
    continuityCounts,
  };
}

function resolveCurrentTierAge(timeline, predecessorMaps, ambiguousKeys, latestIndex, filePath, marker) {
  const currentTier = marker.tier;
  let entryIndex = latestIndex;
  let currentMarker = cloneMarker(marker);

  while (true) {
    const currentKey = buildMarkerKey(filePath, currentMarker);

    if (ambiguousKeys[entryIndex].has(currentKey)) {
      return {
        ambiguous: true,
      };
    }

    const predecessor = predecessorMaps[entryIndex].get(currentKey);

    if (!predecessor) {
      const currentTierEnteredAt = timeline[entryIndex].observedAt;
      return {
        ambiguous: false,
        currentTierEnteredAt,
        currentTierEnteredAtMs: timeline[entryIndex].observedAtMs,
        ageDays: Math.floor(
          (timeline[latestIndex].observedAtMs - timeline[entryIndex].observedAtMs) / DAY_MS
        ),
        persistedAcrossEntries: entryIndex < latestIndex,
      };
    }

    if (predecessor.previousMarker.tier !== currentTier) {
      const currentTierEnteredAt = timeline[entryIndex].observedAt;
      return {
        ambiguous: false,
        currentTierEnteredAt,
        currentTierEnteredAtMs: timeline[entryIndex].observedAtMs,
        ageDays: Math.floor(
          (timeline[latestIndex].observedAtMs - timeline[entryIndex].observedAtMs) / DAY_MS
        ),
        persistedAcrossEntries: entryIndex < latestIndex,
      };
    }

    if (ambiguousKeys[entryIndex - 1].has(predecessor.previousKey)) {
      return {
        ambiguous: true,
      };
    }

    entryIndex -= 1;
    currentMarker = predecessor.previousMarker;
  }
}

function buildTrendSummary(timeline, continuityCounts) {
  const earliest = timeline[0];
  const latest = timeline[timeline.length - 1];
  const netTierDeltas = createTierTotals();

  for (const tier of TIER_ORDER) {
    netTierDeltas[tier] = latest.tierTotals[tier] - earliest.tierTotals[tier];
  }

  return {
    earliestObservedAt: earliest.observedAt,
    latestObservedAt: latest.observedAt,
    earliestTierTotals: cloneTierTotals(earliest.tierTotals),
    latestTierTotals: cloneTierTotals(latest.tierTotals),
    netTierDeltas,
    continuityCounts: cloneContinuityCounts(continuityCounts),
  };
}

class MarkerTemporalSignalsEngine {
  evaluateTimeline(timelineEntries, options) {
    const thresholds = normalizeOptions(options);
    const entries = normalizeTimelineEntries(timelineEntries);
    const validation = validateTimeline(entries);
    const report = buildBaseReport(
      entries.length,
      thresholds,
      validation.earliestObservedAt,
      validation.latestObservedAt
    );

    if (validation.errors.length > 0) {
      report.errors = validation.errors.map(cloneTemporalError);
      return report;
    }

    const timeline = validation.timeline;
    const latestEntry = timeline[timeline.length - 1];
    const latestSnapshotFiles = Array.isArray(latestEntry.snapshot.files)
      ? latestEntry.snapshot.files
      : [];
    const pairwiseState = buildPairwiseState(timeline);
    const findings = [];
    const errors = [];

    for (const file of latestSnapshotFiles) {
      for (const marker of file.markers) {
        if (marker.tier !== "HOLD" && marker.tier !== "KILL") {
          continue;
        }

        const currentMarker = normalizeMarker(
          marker,
          `timelineEntries[${timeline.length - 1}].snapshot.files[${file.filePath}]`
        );
        const ageState = resolveCurrentTierAge(
          timeline,
          pairwiseState.predecessorMaps,
          pairwiseState.ambiguousKeys,
          timeline.length - 1,
          file.filePath,
          currentMarker
        );

        if (ageState.ambiguous) {
          errors.push({
            code: TEMPORAL_LINEAGE_AMBIGUOUS_CODE,
            details: {
              filePath: file.filePath,
              currentMarker,
            },
          });
          continue;
        }

        if (currentMarker.tier === "HOLD" && ageState.ageDays >= thresholds.staleHoldDays) {
          findings.push({
            code: STALE_HOLD_CODE,
            filePath: file.filePath,
            currentMarker,
            currentTierEnteredAt: ageState.currentTierEnteredAt,
            observedAt: latestEntry.observedAt,
            ageDays: ageState.ageDays,
            thresholdDays: thresholds.staleHoldDays,
          });
          continue;
        }

        if (
          currentMarker.tier === "KILL" &&
          ageState.persistedAcrossEntries &&
          ageState.ageDays >= thresholds.unresolvedKillDays
        ) {
          findings.push({
            code: UNRESOLVED_KILL_CODE,
            filePath: file.filePath,
            currentMarker,
            currentTierEnteredAt: ageState.currentTierEnteredAt,
            observedAt: latestEntry.observedAt,
            ageDays: ageState.ageDays,
            thresholdDays: thresholds.unresolvedKillDays,
          });
        }
      }
    }

    report.findings = findings.sort(compareFindings).map(cloneTemporalFinding);
    report.errors = errors.sort(compareTemporalErrors).map(cloneTemporalError);
    report.trendSummary = buildTrendSummary(timeline, pairwiseState.continuityCounts);
    return report;
  }
}

module.exports = {
  MarkerTemporalSignalsEngine,
  STALE_HOLD_CODE,
  TEMPORAL_ERROR_CODES,
  TEMPORAL_FINDING_CODES,
  TEMPORAL_LINEAGE_AMBIGUOUS_CODE,
  TEMPORAL_SIGNALS_VERSION,
  TIMELINE_MARKER_FAMILY_MISMATCH_CODE,
  TIMELINE_ORDER_INVALID_CODE,
  TIMELINE_SCAN_FENCE_MISMATCH_CODE,
  TIMELINE_TIMESTAMP_INVALID_CODE,
  TIMELINE_TOO_SHORT_CODE,
  UNRESOLVED_KILL_CODE,
};
