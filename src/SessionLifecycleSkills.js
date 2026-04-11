"use strict";

const SKILL_ROUTES = Object.freeze([
  "/toolbox-talk",
  "/receipt",
  "/as-built",
  "/walk",
]);

const RECEIPT_OUTCOMES = new Set([
  "complete",
  "complete_with_holds",
  "partial",
  "stopped",
]);

const AS_BUILT_STATUSES = Object.freeze([
  "MATCHED",
  "MODIFIED",
  "ADDED",
  "DEFERRED",
  "HELD",
]);

const WALK_CONFIDENCE_SOURCE = "confidence";
const WALK_CONFIDENCE_SECTION_ORDER = Object.freeze([
  "observedMarkers",
  "requiredCoverage",
  "markerContinuity",
]);

const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneJsonValue(entry));
  }

  if (isPlainObject(value)) {
    const cloned = {};

    for (const [key, entry] of Object.entries(value)) {
      cloned[key] = cloneJsonValue(entry);
    }

    return cloned;
  }

  return value;
}

function isIso8601Timestamp(value) {
  if (typeof value !== "string" || !ISO_8601_PATTERN.test(value)) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function assertRequiredString(input, fieldName) {
  if (typeof input[fieldName] !== "string" || input[fieldName].trim() === "") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a non-empty string`
    );
  }
}

function assertOptionalString(input, fieldName) {
  if (input[fieldName] === undefined) {
    return;
  }

  if (typeof input[fieldName] !== "string") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a string when provided`
    );
  }
}

function assertRequiredBoolean(input, fieldName) {
  if (typeof input[fieldName] !== "boolean") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a boolean`
    );
  }
}

function assertStringArray(value, fieldName) {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string")
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an array of strings`
    );
  }
}

function cloneCountMap(value, fieldName) {
  if (!isPlainObject(value)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an object`
    );
  }

  const cloned = {};
  for (const [key, mapValue] of Object.entries(value)) {
    if (!Number.isInteger(mapValue) || mapValue < 0) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'${fieldName}.${key}' must be a non-negative integer`
      );
    }

    cloned[key] = mapValue;
  }

  return cloned;
}

function normalizeToolboxTalk(toolboxTalk) {
  if (!isPlainObject(toolboxTalk)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'toolboxTalk' must be an object when provided"
    );
  }

  assertRequiredString(toolboxTalk, "summary");
  assertRequiredString(toolboxTalk, "activeDeferredChangeOrderSummary");
  assertRequiredString(toolboxTalk, "permitLockoutSummary");
  assertRequiredString(toolboxTalk, "continuityStandingRiskSummary");

  return {
    summary: toolboxTalk.summary,
    counts: cloneCountMap(toolboxTalk.counts, "toolboxTalk.counts"),
    refs: [...normalizeStringArray(toolboxTalk.refs, "toolboxTalk.refs")],
    currentHazards: [
      ...normalizeStringArray(toolboxTalk.currentHazards, "toolboxTalk.currentHazards"),
    ],
    activeDeferredChangeOrderSummary: toolboxTalk.activeDeferredChangeOrderSummary,
    permitLockoutSummary: toolboxTalk.permitLockoutSummary,
    continuityStandingRiskSummary: toolboxTalk.continuityStandingRiskSummary,
  };
}

function normalizeStringArray(value, fieldName) {
  assertStringArray(value, fieldName);
  return value;
}

function normalizeSessionBrief(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'sessionBrief' must be an object"
    );
  }

  assertRequiredString(input, "briefId");

  return {
    briefId: input.briefId,
    toolboxTalk:
      input.toolboxTalk === undefined
        ? undefined
        : normalizeToolboxTalk(input.toolboxTalk),
  };
}

function normalizeSessionReceipt(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'sessionReceipt' must be an object"
    );
  }

  assertRequiredString(input, "receiptId");
  assertOptionalString(input, "briefRef");
  assertRequiredString(input, "outcome");
  assertRequiredBoolean(input, "signoffRequired");
  assertRequiredString(input, "summary");
  assertRequiredString(input, "createdBy");
  assertRequiredString(input, "createdAt");

  if (!RECEIPT_OUTCOMES.has(input.outcome)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'outcome' must be one of: complete, complete_with_holds, partial, stopped"
    );
  }

  if (!isIso8601Timestamp(input.createdAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'createdAt' must be an ISO 8601 timestamp"
    );
  }

  if (input.updatedAt !== undefined && !isIso8601Timestamp(input.updatedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'updatedAt' must be an ISO 8601 timestamp when provided"
    );
  }

  const holdsRaised = [...normalizeStringArray(input.holdsRaised, "holdsRaised")];
  const approvedDrift = [
    ...normalizeStringArray(input.approvedDrift, "approvedDrift"),
  ];
  const excludedWork = [...normalizeStringArray(input.excludedWork, "excludedWork")];
  const artifactsChanged = [
    ...normalizeStringArray(input.artifactsChanged, "artifactsChanged"),
  ];

  return {
    receiptId: input.receiptId,
    briefRef: input.briefRef,
    outcome: input.outcome,
    signoffRequired: input.signoffRequired,
    summary: input.summary,
    holdsRaised,
    approvedDrift,
    excludedWork,
    artifactsChanged,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

function normalizeAsBuiltSummary(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'asBuiltSummary' must be an object"
    );
  }

  assertRequiredString(input, "receiptId");
  assertRequiredString(input, "outcome");
  assertRequiredBoolean(input, "signoffRequired");
  assertRequiredString(input, "summary");

  if (!RECEIPT_OUTCOMES.has(input.outcome)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'outcome' must be one of: complete, complete_with_holds, partial, stopped"
    );
  }

  return {
    receiptId: input.receiptId,
    outcome: input.outcome,
    signoffRequired: input.signoffRequired,
    plannedButIncomplete: [
      ...normalizeStringArray(input.plannedButIncomplete, "plannedButIncomplete"),
    ],
    unplannedCompleted: [
      ...normalizeStringArray(input.unplannedCompleted, "unplannedCompleted"),
    ],
    holdsRaised: [...normalizeStringArray(input.holdsRaised, "holdsRaised")],
    approvedDrift: [...normalizeStringArray(input.approvedDrift, "approvedDrift")],
    excludedWork: [...normalizeStringArray(input.excludedWork, "excludedWork")],
    summary: input.summary,
  };
}

function normalizeWalkFinding(input, index) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'findings[${index}]' must be an object`
    );
  }

  assertRequiredString(input, "issueRef");
  assertRequiredString(input, "findingType");
  assertRequiredString(input, "severity");
  assertRequiredString(input, "pass");
  assertRequiredString(input, "summary");

  return {
    issueRef: input.issueRef,
    findingType: input.findingType,
    severity: input.severity,
    pass: input.pass,
    summary: input.summary,
    evidenceRefs: [...normalizeStringArray(input.evidenceRefs, "evidenceRefs")],
  };
}

function normalizeFindingSummary(input) {
  return cloneCountMap(input, "findingSummary");
}

function normalizeAsBuiltStatusCounts(input) {
  const cloned = cloneCountMap(input, "asBuilt.statusCounts");

  for (const status of AS_BUILT_STATUSES) {
    if (!Object.prototype.hasOwnProperty.call(cloned, status)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'asBuilt.statusCounts.${status}' is required`
      );
    }
  }

  return cloned;
}

function normalizeWalkEvaluation(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'walkEvaluation' must be an object"
    );
  }

  if (!Array.isArray(input.findings)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'findings' must be an array"
    );
  }

  if (!isPlainObject(input.asBuilt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'asBuilt' must be an object"
    );
  }

  assertRequiredString(input.asBuilt, "sessionOfRecordRef");

  return {
    findings: input.findings.map(normalizeWalkFinding),
    findingSummary: normalizeFindingSummary(input.findingSummary),
    asBuilt: {
      sessionOfRecordRef: input.asBuilt.sessionOfRecordRef,
      statusCounts: normalizeAsBuiltStatusCounts(input.asBuilt.statusCounts),
    },
  };
}

function normalizeWalkRenderOptions(input) {
  if (input === undefined) {
    return {
      confidence: undefined,
    };
  }

  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'options' must be an object"
    );
  }

  return {
    confidence:
      input.confidenceSidecarView === undefined
        ? undefined
        : normalizeConfidenceSidecarView(input.confidenceSidecarView),
  };
}

function normalizeConfidenceSidecarView(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'confidenceSidecarView' must be an object"
    );
  }

  if (
    input.source !== undefined &&
    input.source !== WALK_CONFIDENCE_SOURCE
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'confidenceSidecarView.source' must be '${WALK_CONFIDENCE_SOURCE}' when provided`
    );
  }

  const sections = [];

  for (const sectionId of WALK_CONFIDENCE_SECTION_ORDER) {
    const sectionView = input[sectionId];

    if (sectionView === undefined) {
      continue;
    }

    if (!isPlainObject(sectionView)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'confidenceSidecarView.${sectionId}' must be an object when provided`
      );
    }

    sections.push({
      sectionId,
      view: cloneJsonValue(sectionView),
    });
  }

  if (sections.length === 0) {
    return undefined;
  }

  return {
    source: WALK_CONFIDENCE_SOURCE,
    sections,
  };
}

class SessionLifecycleSkills {
  renderToolboxTalk(sessionBrief) {
    const normalized = normalizeSessionBrief(sessionBrief);

    if (!normalized.toolboxTalk) {
      return {
        route: "/toolbox-talk",
        briefId: normalized.briefId,
        available: false,
        summary: "No toolbox talk enrichment is present for this brief.",
        counts: {},
        refs: [],
        currentHazards: [],
        activeDeferredChangeOrderSummary: null,
        permitLockoutSummary: null,
        continuityStandingRiskSummary: null,
      };
    }

    return {
      route: "/toolbox-talk",
      briefId: normalized.briefId,
      available: true,
      summary: normalized.toolboxTalk.summary,
      counts: { ...normalized.toolboxTalk.counts },
      refs: [...normalized.toolboxTalk.refs],
      currentHazards: [...normalized.toolboxTalk.currentHazards],
      activeDeferredChangeOrderSummary:
        normalized.toolboxTalk.activeDeferredChangeOrderSummary,
      permitLockoutSummary: normalized.toolboxTalk.permitLockoutSummary,
      continuityStandingRiskSummary:
        normalized.toolboxTalk.continuityStandingRiskSummary,
    };
  }

  renderReceipt(sessionReceipt) {
    const normalized = normalizeSessionReceipt(sessionReceipt);

    return {
      route: "/receipt",
      receiptId: normalized.receiptId,
      briefRef: normalized.briefRef,
      outcome: normalized.outcome,
      signoffRequired: normalized.signoffRequired,
      summary: normalized.summary,
      holdsRaised: [...normalized.holdsRaised],
      approvedDrift: [...normalized.approvedDrift],
      excludedWork: [...normalized.excludedWork],
      artifactsChanged: [...normalized.artifactsChanged],
      createdBy: normalized.createdBy,
      createdAt: normalized.createdAt,
      updatedAt: normalized.updatedAt,
    };
  }

  renderAsBuilt(asBuiltSummary) {
    const normalized = normalizeAsBuiltSummary(asBuiltSummary);

    return {
      route: "/as-built",
      receiptId: normalized.receiptId,
      outcome: normalized.outcome,
      signoffRequired: normalized.signoffRequired,
      plannedButIncomplete: [...normalized.plannedButIncomplete],
      unplannedCompleted: [...normalized.unplannedCompleted],
      holdsRaised: [...normalized.holdsRaised],
      approvedDrift: [...normalized.approvedDrift],
      excludedWork: [...normalized.excludedWork],
      summary: normalized.summary,
    };
  }

  renderWalk(walkEvaluation, options) {
    const normalized = normalizeWalkEvaluation(walkEvaluation);
    const normalizedOptions = normalizeWalkRenderOptions(options);

    const rendered = {
      route: "/walk",
      findingCount: normalized.findings.length,
      findingSummary: { ...normalized.findingSummary },
      findings: normalized.findings.map((finding) => ({
        ...finding,
        evidenceRefs: [...finding.evidenceRefs],
      })),
      sessionOfRecordRef: normalized.asBuilt.sessionOfRecordRef,
      asBuiltStatusCounts: { ...normalized.asBuilt.statusCounts },
    };

    if (normalizedOptions.confidence) {
      rendered.confidence = normalizedOptions.confidence;
    }

    return rendered;
  }
}

module.exports = {
  SessionLifecycleSkills,
  SKILL_ROUTES,
};
