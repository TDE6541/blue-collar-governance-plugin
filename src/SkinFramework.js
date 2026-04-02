"use strict";

const SUPPORTED_SKINS = Object.freeze([
  "whiteboard",
  "punch-list",
  "inspection-report",
  "work-order",
  "dispatch-board",
  "ticket-system",
  "daily-log",
  "repair-order",
  "kitchen-ticket",
]);
const SUPPORTED_SKIN_SET = new Set(SUPPORTED_SKINS);

const DEFAULT_SKIN_ID = "whiteboard";

const ROUTE_SUPPORT_MATRIX = Object.freeze({
  whiteboard: Object.freeze(["/toolbox-talk", "/receipt", "/as-built", "/walk"]),
  "punch-list": Object.freeze(["/toolbox-talk", "/receipt", "/as-built", "/walk"]),
  "inspection-report": Object.freeze(["/receipt", "/as-built", "/walk"]),
  "work-order": Object.freeze(["/toolbox-talk", "/receipt", "/as-built"]),
  "dispatch-board": Object.freeze(["/walk", "/phantoms", "/change-order", "/control-rods"]),
  "ticket-system": Object.freeze(["/receipt", "/walk", "/phantoms", "/change-order"]),
  "daily-log": Object.freeze(["/toolbox-talk", "/receipt", "/as-built", "/walk"]),
  "repair-order": Object.freeze(["/receipt", "/as-built"]),
  "kitchen-ticket": Object.freeze(["/walk", "/phantoms", "/change-order"]),
});

const ROUTE_LABELS = Object.freeze({
  "/toolbox-talk": "Toolbox Talk",
  "/receipt": "Receipt",
  "/as-built": "As-Built",
  "/walk": "Walk",
  "/phantoms": "Phantoms",
  "/change-order": "Change Order",
  "/control-rods": "Control Rods",
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
  "work-order": Object.freeze({
    skinLabel: "Work Order",
    layoutTemplate: Object.freeze({
      "/toolbox-talk": Object.freeze([
        "work-order-header",
        "scope-of-work",
        "blockers-and-do-notes",
      ]),
      "/receipt": Object.freeze([
        "work-order-header",
        "scope-of-work",
        "blockers-and-do-notes",
        "document-record",
      ]),
      "/as-built": Object.freeze([
        "work-order-header",
        "scope-of-work",
        "blockers-and-do-notes",
      ]),
    }),
    labelMap: Object.freeze({
      "work-order-header": "Work Order Header",
      "scope-of-work": "Scope Of Work",
      "blockers-and-do-notes": "Blockers And Do-Not Notes",
      "document-record": "Document Record",
    }),
  }),
  "dispatch-board": Object.freeze({
    skinLabel: "Dispatch Board",
    layoutTemplate: Object.freeze({
      "/walk": Object.freeze([
        "dispatch-overview",
        "finding-queue",
        "status-queue",
      ]),
      "/phantoms": Object.freeze([
        "dispatch-overview",
        "phantom-lane",
        "ghost-lane",
        "partial-verification-lane",
      ]),
      "/change-order": Object.freeze([
        "dispatch-overview",
        "deferred-lane",
        "approved-lane",
        "rejected-lane",
      ]),
      "/control-rods": Object.freeze([
        "dispatch-overview",
        "hard-stop-lane",
        "supervised-lane",
        "full-auto-lane",
      ]),
    }),
    labelMap: Object.freeze({
      "dispatch-overview": "Board Overview",
      "finding-queue": "Finding Queue",
      "status-queue": "Status Queue",
      "phantom-lane": "Phantom Lane",
      "ghost-lane": "Ghost Lane",
      "partial-verification-lane": "Partial Verification Lane",
      "deferred-lane": "Deferred Lane",
      "approved-lane": "Approved Lane",
      "rejected-lane": "Rejected Lane",
      "hard-stop-lane": "Hard Stop Lane",
      "supervised-lane": "Supervised Lane",
      "full-auto-lane": "Full Auto Lane",
    }),
  }),
  "ticket-system": Object.freeze({
    skinLabel: "Ticket System",
    layoutTemplate: Object.freeze({
      "/receipt": Object.freeze([
        "ticket-record",
        "lifecycle-detail",
        "ticket-detail",
      ]),
      "/walk": Object.freeze([
        "ticket-record",
        "lifecycle-detail",
        "evidence-detail",
      ]),
      "/phantoms": Object.freeze([
        "ticket-record",
        "lifecycle-detail",
        "evidence-detail",
      ]),
      "/change-order": Object.freeze([
        "ticket-record",
        "lifecycle-detail",
        "evidence-detail",
      ]),
    }),
    labelMap: Object.freeze({
      "ticket-record": "Ticket Record",
      "lifecycle-detail": "Lifecycle Detail",
      "ticket-detail": "Ticket Detail",
      "evidence-detail": "Evidence Detail",
    }),
  }),
  "daily-log": Object.freeze({
    skinLabel: "Daily Log",
    layoutTemplate: Object.freeze({
      "/toolbox-talk": Object.freeze([
        "daily-header",
        "work-notes",
        "safety-notes",
        "daily-notes",
      ]),
      "/receipt": Object.freeze([
        "daily-header",
        "work-notes",
        "issue-notes",
        "daily-notes",
      ]),
      "/as-built": Object.freeze([
        "daily-header",
        "work-notes",
        "issue-notes",
        "daily-notes",
      ]),
      "/walk": Object.freeze([
        "daily-header",
        "issue-log",
        "count-snapshot",
        "daily-notes",
      ]),
    }),
    labelMap: Object.freeze({
      "daily-header": "Daily Header",
      "work-notes": "Work Notes",
      "safety-notes": "Safety And Hazards",
      "issue-notes": "Issues And Delays",
      "issue-log": "Issue Log",
      "count-snapshot": "Count Snapshot",
      "daily-notes": "Daily Notes",
    }),
  }),
  "repair-order": Object.freeze({
    skinLabel: "Repair Order",
    layoutTemplate: Object.freeze({
      "/receipt": Object.freeze([
        "reported-condition",
        "diagnostic-findings",
        "performed-work",
      ]),
      "/as-built": Object.freeze([
        "reported-condition",
        "diagnostic-findings",
        "performed-work",
        "unresolved-exceptions",
      ]),
    }),
    labelMap: Object.freeze({
      "reported-condition": "Reported Condition",
      "diagnostic-findings": "Diagnostic Findings",
      "performed-work": "Performed Work",
      "unresolved-exceptions": "Unresolved Exceptions",
    }),
  }),
  "kitchen-ticket": Object.freeze({
    skinLabel: "Kitchen Ticket",
    layoutTemplate: Object.freeze({
      "/walk": Object.freeze([
        "ticket-rail",
        "short-items",
        "pass-notes",
      ]),
      "/phantoms": Object.freeze([
        "ticket-rail",
        "short-items",
        "pass-notes",
      ]),
      "/change-order": Object.freeze([
        "ticket-rail",
        "short-items",
        "pass-notes",
      ]),
    }),
    labelMap: Object.freeze({
      "ticket-rail": "Ticket Rail",
      "short-items": "Short Items",
      "pass-notes": "Pass Notes",
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

function formatMappedList(value, formatter, emptyText) {
  if (!Array.isArray(value) || value.length === 0) {
    return [emptyText];
  }

  return value.map((entry) => formatter(entry));
}

function filterEntries(value, fieldName, expectedValue) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry) => isPlainObject(entry) && entry[fieldName] === expectedValue
  );
}

function joinListOrNone(values) {
  return Array.isArray(values) && values.length > 0 ? values.join(", ") : "None";
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

function formatChangeOrderCard(entry) {
  return `${entry.changeOrderId} | ${entry.status} | ${entry.decisionReason}`;
}

function formatChangeOrderLifecycle(entry) {
  return `${entry.changeOrderId} | Decision By: ${formatScalar(entry.decisionBy)} | Decided At: ${formatScalar(entry.decidedAt)}`;
}

function formatChangeOrderEvidence(entry) {
  return `${entry.changeOrderId} | Source Refs: ${joinListOrNone(entry.sourceRefs)} | Evidence Refs: ${joinListOrNone(entry.evidenceRefs)}`;
}

function formatDomainCard(rule) {
  return `${rule.domainId} | ${rule.label} | ${rule.autonomyLevel} | ${rule.justification}`;
}

function mapObjectLines(value) {
  if (!isPlainObject(value) || Object.keys(value).length === 0) {
    return [];
  }

  return Object.entries(value).map(([key, entry]) => makeLine(labelizeKey(key), entry));
}

function mapTaggedList(tag, value) {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  return value.map((entry) => `${tag}: ${entry}`);
}

function withFallbackLines(lines, fallbackText) {
  return Array.isArray(lines) && lines.length > 0 ? lines : [fallbackText];
}

function formatCompactFindingLine(finding) {
  return `${finding.issueRef} | ${finding.findingType} | ${finding.summary}`;
}

function formatChangeOrderPassNote(entry) {
  return `${entry.changeOrderId} | Decision By: ${formatScalar(entry.decisionBy)} | Source Refs: ${joinListOrNone(entry.sourceRefs)} | Evidence Refs: ${joinListOrNone(entry.evidenceRefs)}`;
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

function renderWorkOrder(rawView) {
  switch (rawView.route) {
    case "/toolbox-talk":
      return buildPresentation("work-order", rawView, {
        "work-order-header": [
          makeLine("Brief", rawView.briefId),
          makeLine("Available", rawView.available),
          makeLine("Summary", rawView.summary),
        ],
        "scope-of-work": [
          ...formatObjectLines(rawView.counts, "No scope counts in canonical view."),
          ...formatTaggedList("Ref", rawView.refs, "No refs in canonical view."),
        ],
        "blockers-and-do-notes": [
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
        ],
      });
    case "/receipt":
      return buildPresentation("work-order", rawView, {
        "work-order-header": [
          makeLine("Receipt", rawView.receiptId),
          makeLine("Brief Ref", rawView.briefRef),
          makeLine("Outcome", rawView.outcome),
          makeLine("Signoff Required", rawView.signoffRequired),
        ],
        "scope-of-work": [
          makeLine("Summary", rawView.summary),
          ...formatTaggedList(
            "Artifact",
            rawView.artifactsChanged,
            "No artifacts changed in canonical view."
          ),
          ...formatTaggedList(
            "Approved Drift",
            rawView.approvedDrift,
            "No approved drift in canonical view."
          ),
        ],
        "blockers-and-do-notes": [
          ...formatTaggedList("Hold", rawView.holdsRaised, "No holds raised in canonical view."),
          ...formatTaggedList(
            "Excluded Work",
            rawView.excludedWork,
            "No excluded work in canonical view."
          ),
        ],
        "document-record": [
          makeLine("Created By", rawView.createdBy),
          makeLine("Created At", rawView.createdAt),
          makeLine("Updated At", rawView.updatedAt),
        ],
      });
    case "/as-built":
      return buildPresentation("work-order", rawView, {
        "work-order-header": [
          makeLine("Receipt", rawView.receiptId),
          makeLine("Outcome", rawView.outcome),
          makeLine("Signoff Required", rawView.signoffRequired),
          makeLine("Summary", rawView.summary),
        ],
        "scope-of-work": [
          ...formatTaggedList(
            "Planned But Incomplete",
            rawView.plannedButIncomplete,
            "No planned-but-incomplete scope items in canonical view."
          ),
          ...formatTaggedList(
            "Unplanned Completed",
            rawView.unplannedCompleted,
            "No unplanned-completed scope items in canonical view."
          ),
          ...formatTaggedList(
            "Approved Drift",
            rawView.approvedDrift,
            "No approved drift in canonical view."
          ),
        ],
        "blockers-and-do-notes": [
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
      });
    default:
      throw makeValidationError("ERR_INVALID_INPUT", `'rawView.route' is unsupported for skin rendering`);
  }
}
function renderDispatchBoard(rawView) {
  switch (rawView.route) {
    case "/walk":
      return buildPresentation("dispatch-board", rawView, {
        "dispatch-overview": [
          makeLine("Finding Count", rawView.findingCount),
          makeLine("Session Of Record Ref", rawView.sessionOfRecordRef),
        ],
        "finding-queue": formatMappedList(
          rawView.findings,
          (finding) => formatWalkObservation(finding),
          "No finding cards in canonical walk view."
        ),
        "status-queue": [
          ...formatObjectLines(rawView.findingSummary, "No finding totals in canonical view."),
          ...formatObjectLines(
            rawView.asBuiltStatusCounts,
            "No As-Built status counts in canonical view."
          ),
        ],
      });
    case "/phantoms":
      return buildPresentation("dispatch-board", rawView, {
        "dispatch-overview": [
          makeLine("Finding Count", rawView.findingCount),
          ...formatObjectLines(rawView.findingSummary, "No phantom totals in canonical view."),
        ],
        "phantom-lane": formatMappedList(
          filterEntries(rawView.findings, "findingType", "PHANTOM"),
          (finding) => formatWalkObservation(finding),
          "No phantom cards in canonical view."
        ),
        "ghost-lane": formatMappedList(
          filterEntries(rawView.findings, "findingType", "GHOST"),
          (finding) => formatWalkObservation(finding),
          "No ghost cards in canonical view."
        ),
        "partial-verification-lane": formatMappedList(
          filterEntries(rawView.findings, "findingType", "PARTIAL_VERIFICATION"),
          (finding) => formatWalkObservation(finding),
          "No partial-verification cards in canonical view."
        ),
      });
    case "/change-order":
      return buildPresentation("dispatch-board", rawView, {
        "dispatch-overview": [
          makeLine("Change Order Count", rawView.changeOrderCount),
          makeLine("Snapshot State", rawView.snapshotState),
        ],
        "deferred-lane": formatMappedList(
          filterEntries(rawView.changeOrders, "status", "DEFERRED"),
          (entry) => formatChangeOrderCard(entry),
          "No deferred change orders in canonical view."
        ),
        "approved-lane": formatMappedList(
          filterEntries(rawView.changeOrders, "status", "APPROVED"),
          (entry) => formatChangeOrderCard(entry),
          "No approved change orders in canonical view."
        ),
        "rejected-lane": formatMappedList(
          filterEntries(rawView.changeOrders, "status", "REJECTED"),
          (entry) => formatChangeOrderCard(entry),
          "No rejected change orders in canonical view."
        ),
      });
    case "/control-rods":
      return buildPresentation("dispatch-board", rawView, {
        "dispatch-overview": [
          makeLine("Profile Id", rawView.profile && rawView.profile.profileId),
          makeLine("Profile Label", rawView.profile && rawView.profile.profileLabel),
          makeLine("Starter Profiles", joinListOrNone(rawView.starterProfileIds)),
          ...formatObjectLines(rawView.summary, "No control-rod summary in canonical view."),
        ],
        "hard-stop-lane": formatMappedList(
          filterEntries(rawView.domains, "autonomyLevel", "HARD_STOP"),
          (rule) => formatDomainCard(rule),
          "No HARD_STOP domains in canonical view."
        ),
        "supervised-lane": formatMappedList(
          filterEntries(rawView.domains, "autonomyLevel", "SUPERVISED"),
          (rule) => formatDomainCard(rule),
          "No SUPERVISED domains in canonical view."
        ),
        "full-auto-lane": formatMappedList(
          filterEntries(rawView.domains, "autonomyLevel", "FULL_AUTO"),
          (rule) => formatDomainCard(rule),
          "No FULL_AUTO domains in canonical view."
        ),
      });
    default:
      throw makeValidationError("ERR_INVALID_INPUT", `'rawView.route' is unsupported for skin rendering`);
  }
}

function renderTicketSystem(rawView) {
  switch (rawView.route) {
    case "/receipt":
      return buildPresentation("ticket-system", rawView, {
        "ticket-record": [
          makeLine("Receipt", rawView.receiptId),
          makeLine("Brief Ref", rawView.briefRef),
          makeLine("Summary", rawView.summary),
        ],
        "lifecycle-detail": [
          makeLine("Outcome", rawView.outcome),
          makeLine("Signoff Required", rawView.signoffRequired),
          makeLine("Created By", rawView.createdBy),
          makeLine("Created At", rawView.createdAt),
          makeLine("Updated At", rawView.updatedAt),
        ],
        "ticket-detail": [
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
    case "/walk":
      return buildPresentation("ticket-system", rawView, {
        "ticket-record": [
          makeLine("Finding Count", rawView.findingCount),
          makeLine("Session Of Record Ref", rawView.sessionOfRecordRef),
          ...formatMappedList(
            rawView.findings,
            (finding) => formatWalkObservation(finding),
            "No ticket records in canonical walk view."
          ),
        ],
        "lifecycle-detail": [
          ...formatObjectLines(rawView.findingSummary, "No lifecycle counts in canonical view."),
          ...formatObjectLines(
            rawView.asBuiltStatusCounts,
            "No As-Built status counts in canonical view."
          ),
        ],
        "evidence-detail": formatMappedList(
          rawView.findings,
          (finding) => formatWalkCorrection(finding),
          "No evidence detail in canonical walk view."
        ),
      });
    case "/phantoms":
      return buildPresentation("ticket-system", rawView, {
        "ticket-record": [
          makeLine("Finding Count", rawView.findingCount),
          ...formatMappedList(
            rawView.findings,
            (finding) => formatWalkObservation(finding),
            "No ticket records in canonical phantoms view."
          ),
        ],
        "lifecycle-detail": formatObjectLines(
          rawView.findingSummary,
          "No lifecycle counts in canonical view."
        ),
        "evidence-detail": formatMappedList(
          rawView.findings,
          (finding) => formatWalkCorrection(finding),
          "No evidence detail in canonical phantoms view."
        ),
      });
    case "/change-order":
      return buildPresentation("ticket-system", rawView, {
        "ticket-record": [
          makeLine("Change Order Count", rawView.changeOrderCount),
          makeLine("Snapshot State", rawView.snapshotState),
          ...formatMappedList(
            rawView.changeOrders,
            (entry) => formatChangeOrderCard(entry),
            "No ticket records in canonical change-order view."
          ),
        ],
        "lifecycle-detail": formatMappedList(
          rawView.changeOrders,
          (entry) => formatChangeOrderLifecycle(entry),
          "No lifecycle detail in canonical change-order view."
        ),
        "evidence-detail": formatMappedList(
          rawView.changeOrders,
          (entry) => formatChangeOrderEvidence(entry),
          "No evidence detail in canonical change-order view."
        ),
      });
    default:
      throw makeValidationError("ERR_INVALID_INPUT", `'rawView.route' is unsupported for skin rendering`);
  }
}

function renderDailyLog(rawView) {
  switch (rawView.route) {
    case "/toolbox-talk": {
      const safetyLines = [
        ...mapTaggedList("Hazard", rawView.currentHazards),
        ...formatOptionalTaggedLine("Permit / Lockout", rawView.permitLockoutSummary),
        ...formatOptionalTaggedLine("Standing Risk", rawView.continuityStandingRiskSummary),
      ];

      return buildPresentation("daily-log", rawView, {
        "daily-header": [
          makeLine("Brief", rawView.briefId),
          makeLine("Available", rawView.available),
          makeLine("Summary", rawView.summary),
        ],
        "work-notes": withFallbackLines(
          [
            ...mapObjectLines(rawView.counts),
            ...formatOptionalTaggedLine(
              "Deferred Change Order",
              rawView.activeDeferredChangeOrderSummary
            ),
          ],
          "No work notes in canonical view."
        ),
        "safety-notes": withFallbackLines(
          safetyLines,
          "No safety or hazard notes in canonical view."
        ),
        "daily-notes": withFallbackLines(
          mapTaggedList("Ref", rawView.refs),
          "No daily notes in canonical view."
        ),
      });
    }
    case "/receipt":
      return buildPresentation("daily-log", rawView, {
        "daily-header": [
          makeLine("Receipt", rawView.receiptId),
          makeLine("Brief Ref", rawView.briefRef),
          makeLine("Outcome", rawView.outcome),
        ],
        "work-notes": withFallbackLines(
          [
            makeLine("Summary", rawView.summary),
            ...mapTaggedList("Artifact", rawView.artifactsChanged),
            ...mapTaggedList("Approved Drift", rawView.approvedDrift),
          ],
          "No work notes in canonical view."
        ),
        "issue-notes": withFallbackLines(
          [
            ...mapTaggedList("Hold", rawView.holdsRaised),
            ...mapTaggedList("Excluded Work", rawView.excludedWork),
          ],
          "No issues or delays in canonical view."
        ),
        "daily-notes": [
          makeLine("Signoff Required", rawView.signoffRequired),
          makeLine("Created By", rawView.createdBy),
          makeLine("Created At", rawView.createdAt),
          makeLine("Updated At", rawView.updatedAt),
        ],
      });
    case "/as-built":
      return buildPresentation("daily-log", rawView, {
        "daily-header": [
          makeLine("Receipt", rawView.receiptId),
          makeLine("Outcome", rawView.outcome),
          makeLine("Summary", rawView.summary),
        ],
        "work-notes": withFallbackLines(
          [
            ...mapTaggedList("Unplanned Completed", rawView.unplannedCompleted),
            ...mapTaggedList("Approved Drift", rawView.approvedDrift),
          ],
          "No work notes in canonical view."
        ),
        "issue-notes": withFallbackLines(
          [
            ...mapTaggedList("Planned But Incomplete", rawView.plannedButIncomplete),
            ...mapTaggedList("Hold", rawView.holdsRaised),
            ...mapTaggedList("Excluded Work", rawView.excludedWork),
          ],
          "No issues or delays in canonical view."
        ),
        "daily-notes": [makeLine("Signoff Required", rawView.signoffRequired)],
      });
    case "/walk":
      return buildPresentation("daily-log", rawView, {
        "daily-header": [
          makeLine("Finding Count", rawView.findingCount),
          makeLine("Session Of Record Ref", rawView.sessionOfRecordRef),
        ],
        "issue-log": formatMappedList(
          rawView.findings,
          (finding) => formatWalkObservation(finding),
          "No issue log entries in canonical walk view."
        ),
        "count-snapshot": withFallbackLines(
          [
            ...mapObjectLines(rawView.findingSummary),
            ...mapObjectLines(rawView.asBuiltStatusCounts),
          ],
          "No count snapshot in canonical walk view."
        ),
        "daily-notes": formatMappedList(
          rawView.findings,
          (finding) => formatWalkCorrection(finding),
          "No daily notes in canonical walk view."
        ),
      });
    default:
      throw makeValidationError("ERR_INVALID_INPUT", `'rawView.route' is unsupported for skin rendering`);
  }
}

function renderRepairOrder(rawView) {
  switch (rawView.route) {
    case "/receipt":
      return buildPresentation("repair-order", rawView, {
        "reported-condition": [
          makeLine("Receipt", rawView.receiptId),
          makeLine("Brief Ref", rawView.briefRef),
          makeLine("Summary", rawView.summary),
        ],
        "diagnostic-findings": withFallbackLines(
          [
            makeLine("Outcome", rawView.outcome),
            makeLine("Signoff Required", rawView.signoffRequired),
            ...mapTaggedList("Hold", rawView.holdsRaised),
            ...mapTaggedList("Excluded Work", rawView.excludedWork),
          ],
          "No diagnostic findings in canonical view."
        ),
        "performed-work": withFallbackLines(
          [
            ...mapTaggedList("Artifact", rawView.artifactsChanged),
            ...mapTaggedList("Approved Drift", rawView.approvedDrift),
            makeLine("Created By", rawView.createdBy),
            makeLine("Created At", rawView.createdAt),
            makeLine("Updated At", rawView.updatedAt),
          ],
          "No performed work in canonical view."
        ),
      });
    case "/as-built":
      return buildPresentation("repair-order", rawView, {
        "reported-condition": [
          makeLine("Receipt", rawView.receiptId),
          makeLine("Outcome", rawView.outcome),
          makeLine("Summary", rawView.summary),
        ],
        "diagnostic-findings": withFallbackLines(
          [
            makeLine("Signoff Required", rawView.signoffRequired),
            ...mapTaggedList("Planned But Incomplete", rawView.plannedButIncomplete),
          ],
          "No diagnostic findings in canonical view."
        ),
        "performed-work": withFallbackLines(
          [
            ...mapTaggedList("Unplanned Completed", rawView.unplannedCompleted),
            ...mapTaggedList("Approved Drift", rawView.approvedDrift),
          ],
          "No performed work in canonical view."
        ),
        "unresolved-exceptions": withFallbackLines(
          [
            ...mapTaggedList("Hold", rawView.holdsRaised),
            ...mapTaggedList("Excluded Work", rawView.excludedWork),
          ],
          "No unresolved exceptions in canonical view."
        ),
      });
    default:
      throw makeValidationError("ERR_INVALID_INPUT", `'rawView.route' is unsupported for skin rendering`);
  }
}

function renderKitchenTicket(rawView) {
  switch (rawView.route) {
    case "/walk":
      return buildPresentation("kitchen-ticket", rawView, {
        "ticket-rail": [
          makeLine("Finding Count", rawView.findingCount),
          makeLine("Session Of Record Ref", rawView.sessionOfRecordRef),
        ],
        "short-items": formatMappedList(
          rawView.findings,
          (finding) => formatCompactFindingLine(finding),
          "No short items in canonical walk view."
        ),
        "pass-notes": withFallbackLines(
          [
            ...formatMappedList(rawView.findings, (finding) => formatWalkCorrection(finding), ""),
            ...mapObjectLines(rawView.findingSummary),
            ...mapObjectLines(rawView.asBuiltStatusCounts),
          ].filter((line) => line !== ""),
          "No pass notes in canonical walk view."
        ),
      });
    case "/phantoms":
      return buildPresentation("kitchen-ticket", rawView, {
        "ticket-rail": [
          makeLine("Finding Count", rawView.findingCount),
          ...formatObjectLines(rawView.findingSummary, "No phantom totals in canonical view."),
        ],
        "short-items": formatMappedList(
          rawView.findings,
          (finding) => formatCompactFindingLine(finding),
          "No short items in canonical phantoms view."
        ),
        "pass-notes": formatMappedList(
          rawView.findings,
          (finding) => formatWalkCorrection(finding),
          "No pass notes in canonical phantoms view."
        ),
      });
    case "/change-order":
      return buildPresentation("kitchen-ticket", rawView, {
        "ticket-rail": [
          makeLine("Change Order Count", rawView.changeOrderCount),
          makeLine("Snapshot State", rawView.snapshotState),
        ],
        "short-items": formatMappedList(
          rawView.changeOrders,
          (entry) => formatChangeOrderCard(entry),
          "No short items in canonical change-order view."
        ),
        "pass-notes": formatMappedList(
          rawView.changeOrders,
          (entry) => formatChangeOrderPassNote(entry),
          "No pass notes in canonical change-order view."
        ),
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
    case "work-order":
      return renderWorkOrder(rawView);
    case "dispatch-board":
      return renderDispatchBoard(rawView);
    case "ticket-system":
      return renderTicketSystem(rawView);
    case "daily-log":
      return renderDailyLog(rawView);
    case "repair-order":
      return renderRepairOrder(rawView);
    case "kitchen-ticket":
      return renderKitchenTicket(rawView);
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
