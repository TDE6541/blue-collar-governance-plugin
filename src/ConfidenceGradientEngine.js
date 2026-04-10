"use strict";

const { ControlRodMode } = require("./ControlRodMode");

const MARKER_FAMILY = "slash";
const RESERVED_MARKER_FAMILY = "semicolon";
const TIER_ORDER = Object.freeze(["WATCH", "GAP", "HOLD", "KILL"]);
const TIER_DEFINITIONS = Object.freeze([
  Object.freeze({ tier: "WATCH", marker: "///", slashCount: 3, severityRank: 1 }),
  Object.freeze({ tier: "GAP", marker: "////", slashCount: 4, severityRank: 2 }),
  Object.freeze({ tier: "HOLD", marker: "/////", slashCount: 5, severityRank: 3 }),
  Object.freeze({ tier: "KILL", marker: "//////", slashCount: 6, severityRank: 4 }),
]);
const SCAN_FENCE = Object.freeze({
  roots: Object.freeze(["src", "hooks", "scripts", ".claude"]),
  extension: ".js",
});
const UNCLASSIFIED_DOMAIN = Object.freeze({
  domainId: "unclassified",
  label: "Unclassified",
});
const EXCLUDED_GROUPING_DOMAINS = new Set([
  "protected_destructive_ops",
  "existing_file_modification",
  "new_file_creation",
]);
const GLOBAL_FILE_PATTERNS = new Set(["**/*"]);
const LEADING_MARKER_PATTERN = /^[ \t]*(\/{3,6})(?=$|[ \t])/;
const TIER_BY_MARKER = new Map(
  TIER_DEFINITIONS.map((definition) => [definition.marker, definition])
);
const SCAN_ROOTS_LONGEST_FIRST = Object.freeze(
  [...SCAN_FENCE.roots].sort((left, right) => right.length - left.length)
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

function assertRequiredString(input, fieldName) {
  if (typeof input[fieldName] !== "string" || input[fieldName].trim() === "") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a non-empty string`
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

function incrementTierTotals(tierTotals, tier) {
  tierTotals[tier] += 1;
}

function mergeTierTotals(target, source) {
  for (const tier of TIER_ORDER) {
    target[tier] += source[tier];
  }
}

function escapeRegexCharacter(character) {
  return /[\\^$+?.()|[\]{}]/.test(character) ? `\\${character}` : character;
}

function globToRegExp(pattern) {
  let expression = "^";

  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    const nextCharacter = pattern[index + 1];

    if (character === "*" && nextCharacter === "*") {
      expression += ".*";
      index += 1;
      continue;
    }

    if (character === "*") {
      expression += "[^/]*";
      continue;
    }

    expression += escapeRegexCharacter(character);
  }

  expression += "$";
  return new RegExp(expression);
}

function normalizePathSlashes(filePath) {
  return filePath.replace(/\\/g, "/");
}

function trimToScanFencePath(filePath) {
  const normalized = normalizePathSlashes(filePath).replace(/^\.\//, "");

  for (const root of SCAN_ROOTS_LONGEST_FIRST) {
    if (normalized === root || normalized.startsWith(`${root}/`)) {
      return normalized;
    }
  }

  for (const root of SCAN_ROOTS_LONGEST_FIRST) {
    const marker = `/${root}/`;
    const index = normalized.indexOf(marker);
    if (index !== -1) {
      return normalized.slice(index + 1);
    }
  }

  return normalized.replace(/^\/+/, "");
}

function normalizeFileInput(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError("INVALID_FILE", "each file must be an object");
  }

  assertRequiredString(input, "filePath");

  if (typeof input.content !== "string") {
    throw makeValidationError("INVALID_FIELD", "'content' must be a string");
  }

  return {
    filePath: trimToScanFencePath(input.filePath.trim()),
    content: input.content,
  };
}

function isWithinScanFence(filePath) {
  const withinRoot = SCAN_FENCE.roots.some(
    (root) => filePath.startsWith(`${root}/`) || filePath === root
  );

  return withinRoot && filePath.endsWith(SCAN_FENCE.extension);
}

function buildDomainGroupingRules() {
  const controlRodMode = new ControlRodMode();
  const profile = controlRodMode.resolveProfile("conservative");

  return Object.freeze(
    profile.domainRules
      .filter((rule) => !EXCLUDED_GROUPING_DOMAINS.has(rule.domainId))
      .map((rule) => ({
        domainId: rule.domainId,
        label: rule.label,
        patterns: rule.filePatterns.filter(
          (pattern) => !GLOBAL_FILE_PATTERNS.has(pattern)
        ),
      }))
      .filter((rule) => rule.patterns.length > 0)
      .map((rule) =>
        Object.freeze({
          domainId: rule.domainId,
          label: rule.label,
          matchers: Object.freeze(
            rule.patterns.map((pattern) =>
              Object.freeze({
                pattern,
                regex: globToRegExp(pattern),
              })
            )
          ),
        })
      )
  );
}

const DOMAIN_GROUPING_RULES = buildDomainGroupingRules();
const DOMAIN_GROUP_ORDER = Object.freeze([
  ...DOMAIN_GROUPING_RULES.map((rule) => rule.domainId),
  UNCLASSIFIED_DOMAIN.domainId,
]);

function cloneDomain(domain) {
  return {
    domainId: domain.domainId,
    label: domain.label,
  };
}

function classifyFileDomain(filePath) {
  for (const rule of DOMAIN_GROUPING_RULES) {
    if (rule.matchers.some((matcher) => matcher.regex.test(filePath))) {
      return {
        domainId: rule.domainId,
        label: rule.label,
      };
    }
  }

  return cloneDomain(UNCLASSIFIED_DOMAIN);
}

function parseMarkers(content) {
  const markers = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = LEADING_MARKER_PATTERN.exec(line);

    if (!match) {
      continue;
    }

    const definition = TIER_BY_MARKER.get(match[1]);
    if (!definition) {
      continue;
    }

    markers.push({
      lineNumber: index + 1,
      tier: definition.tier,
      marker: definition.marker,
      slashCount: definition.slashCount,
    });
  }

  return markers;
}

function compareFilePaths(left, right) {
  return left.localeCompare(right);
}

function compareMarkers(left, right) {
  return left.lineNumber - right.lineNumber;
}

function normalizeFiles(files) {
  if (!Array.isArray(files)) {
    throw makeValidationError("INVALID_INPUT", "'files' must be an array");
  }

  const seen = new Set();
  const normalized = files.map(normalizeFileInput);

  for (const file of normalized) {
    if (seen.has(file.filePath)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'filePath' must be unique after normalization: ${file.filePath}`
      );
    }

    seen.add(file.filePath);
  }

  return normalized.sort((left, right) => compareFilePaths(left.filePath, right.filePath));
}

function cloneMarker(marker) {
  return {
    lineNumber: marker.lineNumber,
    tier: marker.tier,
    marker: marker.marker,
    slashCount: marker.slashCount,
  };
}

function buildFileReport(filePath, domain, markers) {
  const sortedMarkers = [...markers].sort(compareMarkers).map(cloneMarker);
  const tierTotals = createTierTotals();

  for (const marker of sortedMarkers) {
    incrementTierTotals(tierTotals, marker.tier);
  }

  return {
    filePath,
    domain: cloneDomain(domain),
    markerCount: sortedMarkers.length,
    tierTotals,
    markers: sortedMarkers,
  };
}

function buildDomainGroups(files) {
  const groupsById = new Map();

  for (const file of files) {
    const domainId = file.domain.domainId;
    const existingGroup = groupsById.get(domainId);

    if (!existingGroup) {
      groupsById.set(domainId, {
        domainId,
        label: file.domain.label,
        fileCount: 1,
        markerCount: file.markerCount,
        tierTotals: cloneTierTotals(file.tierTotals),
        filePaths: [file.filePath],
      });
      continue;
    }

    existingGroup.fileCount += 1;
    existingGroup.markerCount += file.markerCount;
    mergeTierTotals(existingGroup.tierTotals, file.tierTotals);
    existingGroup.filePaths.push(file.filePath);
  }

  return DOMAIN_GROUP_ORDER
    .map((domainId) => groupsById.get(domainId))
    .filter(Boolean)
    .map((group) => ({
      domainId: group.domainId,
      label: group.label,
      fileCount: group.fileCount,
      markerCount: group.markerCount,
      tierTotals: cloneTierTotals(group.tierTotals),
      filePaths: [...group.filePaths],
    }));
}

class ConfidenceGradientEngine {
  scan(files) {
    const normalizedFiles = normalizeFiles(files);
    const scannedFiles = normalizedFiles.filter((file) =>
      isWithinScanFence(file.filePath)
    );

    const totals = {
      scannedFileCount: scannedFiles.length,
      markerFileCount: 0,
      markerCount: 0,
      tierTotals: createTierTotals(),
    };
    const markerFiles = [];

    for (const file of scannedFiles) {
      const markers = parseMarkers(file.content);

      if (markers.length === 0) {
        continue;
      }

      const fileReport = buildFileReport(
        file.filePath,
        classifyFileDomain(file.filePath),
        markers
      );

      markerFiles.push(fileReport);
      totals.markerFileCount += 1;
      totals.markerCount += fileReport.markerCount;
      mergeTierTotals(totals.tierTotals, fileReport.tierTotals);
    }

    return {
      markerFamily: MARKER_FAMILY,
      reservedMarkerFamily: RESERVED_MARKER_FAMILY,
      scanFence: {
        roots: [...SCAN_FENCE.roots],
        extension: SCAN_FENCE.extension,
      },
      totals: {
        scannedFileCount: totals.scannedFileCount,
        markerFileCount: totals.markerFileCount,
        markerCount: totals.markerCount,
        tierTotals: cloneTierTotals(totals.tierTotals),
      },
      files: markerFiles.map((file) => ({
        filePath: file.filePath,
        domain: cloneDomain(file.domain),
        markerCount: file.markerCount,
        tierTotals: cloneTierTotals(file.tierTotals),
        markers: file.markers.map(cloneMarker),
      })),
      domainGroups: buildDomainGroups(markerFiles),
    };
  }
}

module.exports = {
  ConfidenceGradientEngine,
  MARKER_FAMILY,
  RESERVED_MARKER_FAMILY,
  SCAN_FENCE,
  TIER_DEFINITIONS,
  TIER_ORDER,
  UNCLASSIFIED_DOMAIN,
};

