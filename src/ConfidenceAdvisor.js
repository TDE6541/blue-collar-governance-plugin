"use strict";

const fs = require("node:fs");

const {
  ConfidenceGradientEngine,
  MARKER_FAMILY,
} = require("./ConfidenceGradientEngine");

const ADVISORY_TIERS = Object.freeze(["HOLD", "KILL"]);
const SUMMARY_TIER_ORDER = Object.freeze(["KILL", "HOLD"]);

function createTierTotals() {
  return {
    HOLD: 0,
    KILL: 0,
  };
}

function normalizeFilePath(filePath) {
  if (typeof filePath !== "string" || filePath.trim() === "") {
    return null;
  }

  return filePath.trim().replace(/\\/g, "/");
}

function createEmptyAdvisory(filePath) {
  return {
    markerFamily: MARKER_FAMILY,
    filePath: normalizeFilePath(filePath),
    present: false,
    tierTotals: createTierTotals(),
    markers: [],
    summary: "",
  };
}

function cloneMarker(marker) {
  return {
    lineNumber: marker.lineNumber,
    tier: marker.tier,
    marker: marker.marker,
    slashCount: marker.slashCount,
  };
}

function formatLineList(lineNumbers) {
  return lineNumbers.length === 1
    ? `line ${lineNumbers[0]}`
    : `lines ${lineNumbers.join(", ")}`;
}

function buildSummary(markers) {
  const lineNumbersByTier = {
    HOLD: [],
    KILL: [],
  };

  for (const marker of markers) {
    lineNumbersByTier[marker.tier].push(marker.lineNumber);
  }

  const parts = [];
  for (const tier of SUMMARY_TIER_ORDER) {
    if (lineNumbersByTier[tier].length === 0) {
      continue;
    }

    parts.push(`${tier} at ${formatLineList(lineNumbersByTier[tier])}`);
  }

  return parts.length === 0
    ? ""
    : `Advisory: existing on-disk confidence markers present (${parts.join("; ")}).`;
}

function isAdvisoryTier(tier) {
  return ADVISORY_TIERS.includes(tier);
}

function buildConfidenceAdvisory(filePath) {
  const emptyAdvisory = createEmptyAdvisory(filePath);
  if (!emptyAdvisory.filePath) {
    return emptyAdvisory;
  }

  const confidenceGradientEngine = new ConfidenceGradientEngine();
  const scanPreview = confidenceGradientEngine.scan([
    {
      filePath: emptyAdvisory.filePath,
      content: "",
    },
  ]);

  if (scanPreview.totals.scannedFileCount === 0) {
    return emptyAdvisory;
  }

  if (!fs.existsSync(filePath)) {
    return emptyAdvisory;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (_error) {
    return emptyAdvisory;
  }

  let scanReport;
  try {
    scanReport = confidenceGradientEngine.scan([
      {
        filePath: emptyAdvisory.filePath,
        content,
      },
    ]);
  } catch (_error) {
    return emptyAdvisory;
  }

  const markers = scanReport.files
    .flatMap((file) => file.markers)
    .filter((marker) => isAdvisoryTier(marker.tier))
    .map(cloneMarker);

  if (markers.length === 0) {
    return emptyAdvisory;
  }

  const tierTotals = createTierTotals();
  for (const marker of markers) {
    tierTotals[marker.tier] += 1;
  }

  return {
    markerFamily: MARKER_FAMILY,
    filePath: emptyAdvisory.filePath,
    present: true,
    tierTotals,
    markers,
    summary: buildSummary(markers),
  };
}

module.exports = {
  ADVISORY_TIERS,
  buildConfidenceAdvisory,
};
