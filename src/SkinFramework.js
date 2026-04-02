"use strict";

const SUPPORTED_SKINS = Object.freeze([
  "whiteboard",
  "punch-list",
  "inspection-report",
]);
const SUPPORTED_SKIN_SET = new Set(SUPPORTED_SKINS);

const DEFAULT_SKIN_ID = "whiteboard";

const ROUTE_SUPPORT_MATRIX = Object.freeze({
  whiteboard: Object.freeze(["/toolbox-talk", "/receipt", "/as-built", "/walk"]),
  "punch-list": Object.freeze(["/toolbox-talk", "/receipt", "/as-built", "/walk"]),
  "inspection-report": Object.freeze(["/receipt", "/as-built", "/walk"]),
});

const ROUTE_LABELS = Object.freeze({
  "/toolbox-talk": "Toolbox Talk",
  "/receipt": "Receipt",
  "/as-built": "As-Built",
  "/walk": "Walk",
});

const SKIN_DEFINITIONS = Object.freeze({
  whiteboard: Object.freeze({
    skinLabel: "Whiteboard",
    layoutTemplate: Object.freeze({
      "/toolbox-talk": Object.freeze([
        "board-summary",
        "board-counts",
        "hazards-and-refs",
      ]),
      "/receipt": Object.freeze([
        "board-summary",
        "board-worklog",
        "board-record",
      ]),
      "/as-built": Object.freeze([
        "board-summary",
        "board-open-items",
        "board-record",
      ]),
      "/walk": Object.freeze([
        "board-summary",
        "finding-totals",
        "field-notes",
        "as-built-status",
      ]),
    }),
    labelMap: Object.freeze({
      "board-summary": "Board Summary",
      "board-counts": "Board Counts",
      "hazards-and-refs": "Hazards And Refs",
      "board-worklog": "Board Worklog",
      "board-record": "Board Record",
      "board-open-items": "Board Open Items",
      "finding-totals": "Finding Totals",
      "field-notes": "Field Notes",
      "as-built-status": "As-Built Status Counts",
    }),
  }),
  "punch-list": Object.freeze({
    skinLabel: "Punch List",
    layoutTemplate: Object.freeze({
      "/toolbox-talk": Object.freeze([
        "startup-status",
        "punch-items",
        "signoff-notes",
      ]),
      "/receipt": Object.freeze([
        "closeout-status",
        "punch-items",
        "signoff-record",
      ]),
      "/as-built": Object.freeze([
        "closeout-status",
        "punch-items",
        "completed-work",
      ]),
      "/walk": Object.freeze([
        "closeout-status",
        "punch-findings",
        "signoff-counts",
      ]),
    }),
    labelMap: Object.freeze({
      "startup-status": "Startup Status",
      "punch-items": "Punch Items",
      "signoff-notes": "Signoff Notes",
      "closeout-status": "Closeout Status",
      "signoff-record": "Signoff Record",
      "completed-work": "Completed Work",
      "punch-findings": "Punch Findings",
      "signoff-counts": "Signoff Counts",
    }),
  }),
  "inspection-report": Object.freeze({
    skinLabel: "Inspection Report",
    layoutTemplate: Object.freeze({
      "/receipt": Object.freeze([
        "observation-summary",
        "evaluation",
        "corrections-and-follow-up",
      ]),
      "/as-built": Object.freeze([
        "observation-summary",
        "evaluation",
        "corrections-and-follow-up",
        "observed-modifications",
      ]),
      "/walk": Object.freeze([
        "observation-summary",
        "evaluation-totals",
        "observations",
        "corrections-required",
      ]),
    }),
    labelMap: Object.freeze({
      "observation-summary": "Observation Summary",
      evaluation: "Evaluation",
      "corrections-and-follow-up": "Corrections And Follow-Up",
      "observed-modifications": "Observed Modifications",
      "evaluation-totals": "Evaluation Totals",
      observations: "Observations",
      "corrections-required": "Corrections Required",
    }),
  }),
});

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

  if (isPlainObject(value)) {
    const clone = {};

    for (const [key, entry] of Object.entries(value)) {
      clone[key] = cloneValue(entry);
    }

    return clone;
  }

  return value;
}

function normalizeOptions(options) {
  if (options === undefined) {
    return {};
  }

  if (!isPlainObject(options)) {
    throw makeValidationError("ERR_INVALID_INPUT", "'options' must be an object");
  }

  return options;
}

function normalizeSkinId(skinId) {
  if (skinId === undefined) {
    return DEFAULT_SKIN_ID;
  }

  if (!hasNonEmptyString(skinId)) {
    throw makeValidationError("ERR_INVALID_INPUT", "'options.skinId' must be a non-empty string");
  }

  const normalized = skinId.trim();

  if (!SUPPORTED_SKIN_SET.has(normalized)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'options.skinId' must be one of ${SUPPORTED_SKINS.join(", ")}`
    );
  }

  return normalized;
}

function assertCanonicalView(rawView) {
  if (!isPlainObject(rawView)) {
    throw makeValidationError("ERR_INVALID_INPUT", "'rawView' must be an object");
  }

  if (!hasNonEmptyString(rawView.route)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'rawView.route' must be a non-empty string"
    );
  }
}

function supportsRoute(skinId, route) {
  return ROUTE_SUPPORT_MATRIX[skinId].includes(route);
}

function labelizeKey(key) {
  return `${key}`
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatScalar(value) {
  if (value === null || value === undefined || value === "") {
    return "None";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return `${value}`;
}

function makeLine(label, value) {
  return `${label}: ${formatScalar(value)}`;
}

function formatObjectLines(value, emptyText) {
  if (!isPlainObject(value) || Object.keys(value).length === 0) {
    return [emptyText];
  }

  return Object.entries(value).map(([key, entry]) => makeLine(labelizeKey(key), entry));
}

function formatTaggedList(tag, value, emptyText) {
  if (!Array.isArray(value) || value.length === 0) {
    return [emptyText];
  }

  return value.map((entry) => `${tag}: ${entry}`);
}

function formatOptionalTaggedLine(tag, value) {
  if (!hasNonEmptyString(value)) {
    return [];
  }

  return [makeLine(tag, value)];
}

function buildSections(skinId, route, sectionLinesById) {
  const definition = SKIN_DEFINITIONS[skinId];
  const sectionIds = definition.layoutTemplate[route];

  return sectionIds.map((sectionId) => {
    const lines = sectionLinesById[sectionId];

    return {
      sectionId,
      heading: definition.labelMap[sectionId],
      lines:
        Array.isArray(lines) && lines.length > 0
          ? lines.map((line) => `${line}`)
          : ["No canonical data supplied for this section."],
    };
  });
}

function buildPresentation(skinId, rawView, sectionLinesById) {
  return {
    skinId,
    skinLabel: SKIN_DEFINITIONS[skinId].skinLabel,
    title: `${SKIN_DEFINITIONS[skinId].skinLabel}: ${
      ROUTE_LABELS[rawView.route] || rawView.route
    }`,
    sections: buildSections(skinId, rawView.route, sectionLinesById),
  };
}

function formatWalkObservation(finding) {
  return `${finding.issueRef} | ${finding.findingType} | ${finding.severity} | ${finding.summary}`;
}

function formatWalkCorrection(finding) {
  return `${finding.issueRef} | Evidence Refs: ${
    Array.isArray(finding.evidenceRefs) && finding.evidenceRefs.length > 0
      ? finding.evidenceRefs.join(", ")
      : "None"
  }`;
}

function renderWhiteboard(rawView) {
  switch (rawView.route) {
    case "/toolbox-talk":
      return buildPresentation("whiteboard", rawView, {
        "board-summary": [
          makeLine("Brief", rawView.briefId),
          makeLine("Available", rawView.available),
          makeLine("Summary", rawView.summary),
        ],
        "board-counts": formatObjectLines(rawView.counts, "No board counts in canonical view."),
        "hazards-and-refs": [
          ...formatTaggedList(
            "Hazard",
            rawView.currentHazards,
            "No current hazards in canonical view."
          ),
          ...formatOptionalTaggedLine(
            "Deferred Change Order",
            rawView.activeDeferredChangeOrderSummary
          ),
          ...formatOptionalTaggedLine("Permit / Lockout", rawView.permitLockoutSummary),
          ...formatOptionalTaggedLine(
            "Standing Risk",
            rawView.continuityStandingRiskSummary
          ),
          ...formatTaggedList("Ref", rawView.refs, "No refs in canonical view."),
        ],
      });
    case "/receipt":
      return buildPresentation("whiteboard", rawView, {
        "board-summary": [
          makeLine("Receipt", rawView.receiptId),
          makeLine("Brief Ref", rawView.briefRef),
          makeLine("Outcome", rawView.outcome),
          makeLine("Signoff Required", rawView.signoffRequired),
        ],
        "board-worklog": [
          makeLine("Summary", rawView.summary),
          ...formatTaggedList("Hold", rawView.holdsRaised, "No holds raised in canonical view."),
          ...formatTaggedList(
            "Approved Drift",
            rawView.approvedDrift,
            "No approved drift in canonical view."
          ),
          ...formatTaggedList(
            "Excluded Work",
            rawView.excludedWork,
            "No excluded work in canonical view."
          ),
        ],
        "board-record": [
          ...formatTaggedList(
            "Artifact",
            rawView.artifactsChanged,
            "No artifacts changed in canonical view."
          ),
          makeLine("Created By", rawView.createdBy),
          makeLine("Created At", rawView.createdAt),
          makeLine("Updated At", rawView.updatedAt),
        ],
      });
    case "/as-built":
      return buildPresentation("whiteboard", rawView, {
        "board-summary": [
          makeLine("Receipt", rawView.receiptId),
          makeLine("Outcome", rawView.outcome),
          makeLine("Signoff Required", rawView.signoffRequired),
          makeLine("Summary", rawView.summary),
        ],
        "board-open-items": [
          ...formatTaggedList(
            "Planned But Incomplete",
            rawView.plannedButIncomplete,
            "No planned-but-incomplete items in canonical view."
          ),
          ...formatTaggedList(
            "Hold",
            rawView.holdsRaised,
            "No holds raised in canonical view."
          ),
          ...formatTaggedList(
            "Excluded Work",
            rawView.excludedWork,
            "No excluded work in canonical view."
          ),
        ],
        "board-record": [
          ...formatTaggedList(
            "Unplanned Completed",
            rawView.unplannedCompleted,
            "No unplanned-completed items in canonical view."
          ),
          ...formatTaggedList(
            "Approved Drift",
            rawView.approvedDrift,
            "No approved drift in canonical view."
          ),
        ],
      });
    case "/walk":
      return buildPresentation("whiteboard", rawView, {
        "board-summary": [
          makeLine("Finding Count", rawView.findingCount),
          makeLine("Session Of Record Ref", rawView.sessionOfRecordRef),
        ],
        "finding-totals": formatObjectLines(
          rawView.findingSummary,
          "No finding totals in canonical view."
        ),
        "field-notes":
          Array.isArray(rawView.findings) && rawView.findings.length > 0
            ? rawView.findings.map((finding) => formatWalkObservation(finding))
            : ["No findings in canonical walk view."],
        "as-built-status": formatObjectLines(
          rawView.asBuiltStatusCounts,
          "No As-Built status counts in canonical view."
        ),
      });
    default:
      throw makeValidationError("ERR_INVALID_INPUT", `'rawView.route' is unsupported for skin rendering`);
  }
}

function renderPunchList(rawView) {
  switch (rawView.route) {
    case "/toolbox-talk":
      return buildPresentation("punch-list", rawView, {
        "startup-status": [
          makeLine("Brief", rawView.briefId),
          makeLine("Available", rawView.available),
          makeLine("Summary", rawView.summary),
        ],
        "punch-items": [
          ...formatObjectLines(rawView.counts, "No punch counts in canonical view."),
          ...formatTaggedList(
            "Hazard",
            rawView.currentHazards,
            "No current hazards in canonical view."
          ),
        ],
        "signoff-notes": [
          ...formatOptionalTaggedLine(
            "Deferred Change Order",
            rawView.activeDeferredChangeOrderSummary
          ),
          ...formatOptionalTaggedLine("Permit / Lockout", rawView.permitLockoutSummary),
          ...formatOptionalTaggedLine(
            "Standing Risk",
            rawView.continuityStandingRiskSummary
          ),
          ...formatTaggedList("Ref", rawView.refs, "No refs in canonical view."),
        ],
      });
    case "/receipt":
      return buildPresentation("punch-list", rawView, {
        "closeout-status": [
          makeLine("Outcome", rawView.outcome),
          makeLine("Signoff Required", rawView.signoffRequired),
          makeLine("Summary", rawView.summary),
        ],
        "punch-items": [
          ...formatTaggedList("Hold", rawView.holdsRaised, "No holds raised in canonical view."),
          ...formatTaggedList(
            "Excluded Work",
            rawView.excludedWork,
            "No excluded work in canonical view."
          ),
        ],
        "signoff-record": [
          ...formatTaggedList(
            "Approved Drift",
            rawView.approvedDrift,
            "No approved drift in canonical view."
          ),
          ...formatTaggedList(
            "Artifact",
            rawView.artifactsChanged,
            "No artifacts changed in canonical view."
          ),
          makeLine("Created By", rawView.createdBy),
          makeLine("Created At", rawView.createdAt),
        ],
      });
    case "/as-built":
      return buildPresentation("punch-list", rawView, {
        "closeout-status": [
          makeLine("Outcome", rawView.outcome),
          makeLine("Signoff Required", rawView.signoffRequired),
          makeLine("Summary", rawView.summary),
        ],
        "punch-items": [
          ...formatTaggedList(
            "Planned But Incomplete",
            rawView.plannedButIncomplete,
            "No planned-but-incomplete items in canonical view."
          ),
          ...formatTaggedList(
            "Hold",
            rawView.holdsRaised,
            "No holds raised in canonical view."
          ),
          ...formatTaggedList(
            "Excluded Work",
            rawView.excludedWork,
            "No excluded work in canonical view."
          ),
        ],
        "completed-work": [
          ...formatTaggedList(
            "Unplanned Completed",
            rawView.unplannedCompleted,
            "No unplanned-completed items in canonical view."
          ),
          ...formatTaggedList(
            "Approved Drift",
            rawView.approvedDrift,
            "No approved drift in canonical view."
          ),
        ],
      });
    case "/walk":
      return buildPresentation("punch-list", rawView, {
        "closeout-status": [
          makeLine("Finding Count", rawView.findingCount),
          makeLine("Session Of Record Ref", rawView.sessionOfRecordRef),
        ],
        "punch-findings":
          Array.isArray(rawView.findings) && rawView.findings.length > 0
            ? rawView.findings.map((finding) => formatWalkObservation(finding))
            : ["No punch findings in canonical walk view."],
        "signoff-counts": [
          ...formatObjectLines(rawView.findingSummary, "No finding totals in canonical view."),
          ...formatObjectLines(
            rawView.asBuiltStatusCounts,
            "No As-Built status counts in canonical view."
          ),
        ],
      });
    default:
      throw makeValidationError("ERR_INVALID_INPUT", `'rawView.route' is unsupported for skin rendering`);
  }
}

function renderInspectionReport(rawView) {
  switch (rawView.route) {
    case "/receipt":
      return buildPresentation("inspection-report", rawView, {
        "observation-summary": [
          makeLine("Receipt", rawView.receiptId),
          makeLine("Brief Ref", rawView.briefRef),
          makeLine("Summary", rawView.summary),
        ],
        evaluation: [
          makeLine("Outcome", rawView.outcome),
          makeLine("Signoff Required", rawView.signoffRequired),
          makeLine("Created By", rawView.createdBy),
          makeLine("Created At", rawView.createdAt),
        ],
        "corrections-and-follow-up": [
          ...formatTaggedList("Hold", rawView.holdsRaised, "No holds raised in canonical view."),
          ...formatTaggedList(
            "Approved Drift",
            rawView.approvedDrift,
            "No approved drift in canonical view."
          ),
          ...formatTaggedList(
            "Excluded Work",
            rawView.excludedWork,
            "No excluded work in canonical view."
          ),
          ...formatTaggedList(
            "Artifact",
            rawView.artifactsChanged,
            "No artifacts changed in canonical view."
          ),
        ],
      });
    case "/as-built":
      return buildPresentation("inspection-report", rawView, {
        "observation-summary": [
          makeLine("Receipt", rawView.receiptId),
          makeLine("Summary", rawView.summary),
        ],
        evaluation: [
          makeLine("Outcome", rawView.outcome),
          makeLine("Signoff Required", rawView.signoffRequired),
        ],
        "corrections-and-follow-up": [
          ...formatTaggedList(
            "Planned But Incomplete",
            rawView.plannedButIncomplete,
            "No planned-but-incomplete items in canonical view."
          ),
          ...formatTaggedList(
            "Hold",
            rawView.holdsRaised,
            "No holds raised in canonical view."
          ),
          ...formatTaggedList(
            "Excluded Work",
            rawView.excludedWork,
            "No excluded work in canonical view."
          ),
        ],
        "observed-modifications": [
          ...formatTaggedList(
            "Unplanned Completed",
            rawView.unplannedCompleted,
            "No unplanned-completed items in canonical view."
          ),
          ...formatTaggedList(
            "Approved Drift",
            rawView.approvedDrift,
            "No approved drift in canonical view."
          ),
        ],
      });
    case "/walk":
      return buildPresentation("inspection-report", rawView, {
        "observation-summary": [
          makeLine("Finding Count", rawView.findingCount),
          makeLine("Session Of Record Ref", rawView.sessionOfRecordRef),
        ],
        "evaluation-totals": [
          ...formatObjectLines(rawView.findingSummary, "No finding totals in canonical view."),
          ...formatObjectLines(
            rawView.asBuiltStatusCounts,
            "No As-Built status counts in canonical view."
          ),
        ],
        observations:
          Array.isArray(rawView.findings) && rawView.findings.length > 0
            ? rawView.findings.map((finding) => formatWalkObservation(finding))
            : ["No observations in canonical walk view."],
        "corrections-required":
          Array.isArray(rawView.findings) && rawView.findings.length > 0
            ? rawView.findings.map((finding) => formatWalkCorrection(finding))
            : ["No corrections required in canonical walk view."],
      });
    default:
      throw makeValidationError("ERR_INVALID_INPUT", `'rawView.route' is unsupported for skin rendering`);
  }
}

function renderSupportedPresentation(skinId, rawView) {
  switch (skinId) {
    case "whiteboard":
      return renderWhiteboard(rawView);
    case "punch-list":
      return renderPunchList(rawView);
    case "inspection-report":
      return renderInspectionReport(rawView);
    default:
      throw makeValidationError("ERR_INVALID_INPUT", `'options.skinId' is unsupported`);
  }
}

class SkinFramework {
  render(rawView, options = {}) {
    assertCanonicalView(rawView);

    const normalizedOptions = normalizeOptions(options);
    const requestedSkinId = normalizeSkinId(normalizedOptions.skinId);
    const route = rawView.route;
    const rawViewClone = cloneValue(rawView);

    if (!supportsRoute(requestedSkinId, route)) {
      return {
        route,
        requestedSkinId,
        appliedSkinId: null,
        supported: false,
        fallbackMode: "raw_canonical_view",
        rawView: rawViewClone,
        presentation: null,
        renderNote: `skin '${requestedSkinId}' does not support route '${route}'; returning raw canonical view`,
      };
    }

    return {
      route,
      requestedSkinId,
      appliedSkinId: requestedSkinId,
      supported: true,
      fallbackMode: "none",
      rawView: rawViewClone,
      presentation: renderSupportedPresentation(requestedSkinId, rawViewClone),
      renderNote: `rendered from existing canonical route view using '${requestedSkinId}' skin`,
    };
  }
}

module.exports = {
  SkinFramework,
  SUPPORTED_SKINS,
  DEFAULT_SKIN_ID,
  ROUTE_SUPPORT_MATRIX,
};
