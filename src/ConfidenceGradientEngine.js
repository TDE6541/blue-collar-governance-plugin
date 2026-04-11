"use strict";

const { ControlRodMode } = require("./ControlRodMode");

const MARKER_FAMILY = "slash";
const RESERVED_MARKER_FAMILY = "semicolon";
const SNAPSHOT_VERSION = 1;
const REQUIRED_COVERAGE_POLICY_VERSION = 1;
const REQUIRED_COVERAGE_POLICY_MODE = "explicit_opt_in";
const REQUIRED_COVERAGE_MINIMUM_MARKER_COUNT = 1;
const REQUIRED_COVERAGE_MISSING_CODE = "REQUIRED_COVERAGE_MISSING";
const REQUIRED_COVERAGE_POLICY_ERROR_CODES = Object.freeze([
  "POLICY_TARGET_INVALID",
  "POLICY_TARGET_DUPLICATE",
  "POLICY_TARGET_OUTSIDE_SCAN_FENCE",
  "POLICY_TARGET_NOT_IN_SCAN_INPUT",
]);
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
const SNAPSHOT_CONTEXT_WINDOW_RADIUS = 3;

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

function normalizeOptionalTrimmedString(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function normalizeCollapsedText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed.replace(/\s+/g, " ");
}

function getLeadingMarkerMatch(line) {
  return LEADING_MARKER_PATTERN.exec(line);
}

function isValidMarkerLine(line) {
  const match = getLeadingMarkerMatch(line);
  return Boolean(match) && TIER_BY_MARKER.has(match[1]);
}

function normalizeTrailingMarkerText(line) {
  const match = getLeadingMarkerMatch(line);

  if (!match) {
    return null;
  }

  return normalizeCollapsedText(line.slice(match[0].length));
}

function collectNeighborhoodLines(lines, markerLineIndex) {
  const neighborhoodLines = [];
  const start = Math.max(0, markerLineIndex - SNAPSHOT_CONTEXT_WINDOW_RADIUS);
  const end = Math.min(lines.length - 1, markerLineIndex + SNAPSHOT_CONTEXT_WINDOW_RADIUS);

  for (let index = start; index <= end; index += 1) {
    if (index === markerLineIndex) {
      continue;
    }

    const line = lines[index];

    if (isValidMarkerLine(line)) {
      continue;
    }

    const normalizedLine = normalizeCollapsedText(line);

    if (normalizedLine === null) {
      continue;
    }

    neighborhoodLines.push(normalizedLine);
  }

  return [...new Set(neighborhoodLines)].sort((left, right) => left.localeCompare(right));
}

function buildContextFingerprint(neighborhoodLines) {
  return neighborhoodLines.length === 0
    ? "<empty-neighborhood>"
    : neighborhoodLines.join(" || ");
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

function buildSnapshotMarker(marker, lines) {
  const lineIndex = marker.lineNumber - 1;
  const neighborhoodLines = collectNeighborhoodLines(lines, lineIndex);

  return {
    lineNumber: marker.lineNumber,
    tier: marker.tier,
    marker: marker.marker,
    slashCount: marker.slashCount,
    trailingText: normalizeTrailingMarkerText(lines[lineIndex] || ""),
    anchor: {
      contextFingerprint: buildContextFingerprint(neighborhoodLines),
      neighborhoodLines,
    },
  };
}

function buildSnapshotFile(filePath, markers, content) {
  const lines = content.split(/\r?\n/);
  const snapshotMarkers = [...markers]
    .sort(compareMarkers)
    .map((marker) => buildSnapshotMarker(marker, lines));

  return {
    filePath,
    markerCount: snapshotMarkers.length,
    markers: snapshotMarkers,
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

function makeRequiredCoveragePolicyError(code, policyTargetId = null, filePath = null) {
  return {
    code,
    policyTargetId,
    filePath,
  };
}

function cloneRequiredCoveragePolicyError(policyError) {
  return {
    code: policyError.code,
    policyTargetId: policyError.policyTargetId,
    filePath: policyError.filePath,
  };
}

function cloneRequiredCoverageFinding(finding) {
  return {
    code: finding.code,
    policyTargetId: finding.policyTargetId,
    filePath: finding.filePath,
    domain: cloneDomain(finding.domain),
    markerCount: finding.markerCount,
    minimumMarkerCount: finding.minimumMarkerCount,
  };
}

function normalizeRequiredCoveragePolicy(policy) {
  const targetCount =
    isPlainObject(policy) && Array.isArray(policy.targets) ? policy.targets.length : 0;

  if (
    !isPlainObject(policy) ||
    policy.version !== REQUIRED_COVERAGE_POLICY_VERSION ||
    !Array.isArray(policy.targets)
  ) {
    return {
      targetCount,
      targets: [],
      policyErrors: [makeRequiredCoveragePolicyError("POLICY_TARGET_INVALID")],
    };
  }

  const targets = [];
  const policyErrors = [];
  const seenIds = new Set();
  const seenFilePaths = new Set();

  for (const target of policy.targets) {
    if (!isPlainObject(target)) {
      policyErrors.push(makeRequiredCoveragePolicyError("POLICY_TARGET_INVALID"));
      continue;
    }

    const policyTargetId = normalizeOptionalTrimmedString(target.id);
    const normalizedFilePath =
      typeof target.filePath === "string" && target.filePath.trim() !== ""
        ? trimToScanFencePath(target.filePath.trim())
        : null;

    if (policyTargetId === null || normalizedFilePath === null) {
      policyErrors.push(
        makeRequiredCoveragePolicyError(
          "POLICY_TARGET_INVALID",
          policyTargetId,
          normalizedFilePath
        )
      );
      continue;
    }

    if (!isWithinScanFence(normalizedFilePath)) {
      policyErrors.push(
        makeRequiredCoveragePolicyError(
          "POLICY_TARGET_OUTSIDE_SCAN_FENCE",
          policyTargetId,
          normalizedFilePath
        )
      );
      continue;
    }

    if (seenIds.has(policyTargetId) || seenFilePaths.has(normalizedFilePath)) {
      policyErrors.push(
        makeRequiredCoveragePolicyError(
          "POLICY_TARGET_DUPLICATE",
          policyTargetId,
          normalizedFilePath
        )
      );
      continue;
    }

    seenIds.add(policyTargetId);
    seenFilePaths.add(normalizedFilePath);
    targets.push({
      policyTargetId,
      filePath: normalizedFilePath,
    });
  }

  return {
    targetCount,
    targets,
    policyErrors,
  };
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

  buildSnapshot(files) {
    const normalizedFiles = normalizeFiles(files);
    const scannedFiles = normalizedFiles.filter((file) =>
      isWithinScanFence(file.filePath)
    );
    const scannedFilesByPath = new Map(
      scannedFiles.map((file) => [file.filePath, file])
    );
    const scanReport = this.scan(files);

    return {
      snapshotVersion: SNAPSHOT_VERSION,
      markerFamily: MARKER_FAMILY,
      scanFence: {
        roots: [...SCAN_FENCE.roots],
        extension: SCAN_FENCE.extension,
      },
      totals: {
        scannedFileCount: scanReport.totals.scannedFileCount,
        markerFileCount: scanReport.totals.markerFileCount,
        markerCount: scanReport.totals.markerCount,
        tierTotals: cloneTierTotals(scanReport.totals.tierTotals),
      },
      files: scanReport.files.map((file) =>
        buildSnapshotFile(
          file.filePath,
          file.markers,
          scannedFilesByPath.get(file.filePath).content
        )
      ),
    };
  }

  evaluateRequiredCoverage(files, policy) {
    const normalizedFiles = normalizeFiles(files);
    const scannedFiles = normalizedFiles.filter((file) =>
      isWithinScanFence(file.filePath)
    );
    const normalizedPolicy = normalizeRequiredCoveragePolicy(policy);
    const scannedFilesByPath = new Map(
      scannedFiles.map((file) => [file.filePath, file])
    );
    const findings = [];
    const policyErrors = normalizedPolicy.policyErrors.map(
      cloneRequiredCoveragePolicyError
    );
    let evaluatedTargetCount = 0;

    for (const target of normalizedPolicy.targets) {
      const matchedFile = scannedFilesByPath.get(target.filePath);

      if (!matchedFile) {
        policyErrors.push(
          makeRequiredCoveragePolicyError(
            "POLICY_TARGET_NOT_IN_SCAN_INPUT",
            target.policyTargetId,
            target.filePath
          )
        );
        continue;
      }

      const markers = parseMarkers(matchedFile.content);
      evaluatedTargetCount += 1;

      if (markers.length >= REQUIRED_COVERAGE_MINIMUM_MARKER_COUNT) {
        continue;
      }

      findings.push({
        code: REQUIRED_COVERAGE_MISSING_CODE,
        policyTargetId: target.policyTargetId,
        filePath: target.filePath,
        domain: classifyFileDomain(target.filePath),
        markerCount: markers.length,
        minimumMarkerCount: REQUIRED_COVERAGE_MINIMUM_MARKER_COUNT,
      });
    }

    return {
      policyMode: REQUIRED_COVERAGE_POLICY_MODE,
      markerFamily: MARKER_FAMILY,
      targetCount: normalizedPolicy.targetCount,
      evaluatedTargetCount,
      findings: findings.map(cloneRequiredCoverageFinding),
      policyErrors: policyErrors.map(cloneRequiredCoveragePolicyError),
    };
  }
}

module.exports = {
  ConfidenceGradientEngine,
  MARKER_FAMILY,
  REQUIRED_COVERAGE_MISSING_CODE,
  REQUIRED_COVERAGE_MINIMUM_MARKER_COUNT,
  REQUIRED_COVERAGE_POLICY_ERROR_CODES,
  REQUIRED_COVERAGE_POLICY_MODE,
  REQUIRED_COVERAGE_POLICY_VERSION,
  RESERVED_MARKER_FAMILY,
  SCAN_FENCE,
  SNAPSHOT_VERSION,
  TIER_DEFINITIONS,
  TIER_ORDER,
  UNCLASSIFIED_DOMAIN,
};

