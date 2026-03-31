"use strict";

const SKILL_ROUTES = Object.freeze(["/prevention-record", "/rights"]);
const RIGHTS_VIEW_MODE = "MANUAL_STATIC";

const RIGHTS_ITEMS = Object.freeze([
  Object.freeze({
    rightId: "RIGHT_SCOPE_CLARITY",
    title: "Scope Clarity",
    declaration:
      "The operator has the right to a clear scope statement before work begins."
  }),
  Object.freeze({
    rightId: "RIGHT_RISK_VISIBILITY",
    title: "Risk Visibility",
    declaration:
      "The operator has the right to plain risk visibility with direct evidence refs."
  }),
  Object.freeze({
    rightId: "RIGHT_EVIDENCE_TRACE",
    title: "Evidence Trace",
    declaration:
      "The operator has the right to trace each governance signal to explicit source refs."
  }),
  Object.freeze({
    rightId: "RIGHT_HOLD_PATH",
    title: "HOLD Path",
    declaration:
      "The operator has the right to a HOLD path when explicit evidence is missing."
  }),
  Object.freeze({
    rightId: "RIGHT_LEGIBLE_CLOSEOUT",
    title: "Legible Closeout",
    declaration:
      "The operator has the right to legible closeout records for each session." 
  })
]);

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function assertStringArray(value, fieldName, { nonEmpty = false } = {}) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be an array of non-empty strings`
    );
  }

  if (nonEmpty && value.length === 0) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be a non-empty array of strings`
    );
  }
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function normalizeInputList(value, fieldName) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be an array when provided`
    );
  }

  return value;
}

function normalizeWalkFindings(value) {
  return normalizeInputList(value, "foremansWalkFindings").map((item, index) => {
    if (!isPlainObject(item)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'foremansWalkFindings[${index}]' must be an object`
      );
    }

    assertRequiredString(item, "findingId", `foremansWalkFindings[${index}]`);
    assertRequiredString(item, "findingType", `foremansWalkFindings[${index}]`);
    assertRequiredString(item, "summary", `foremansWalkFindings[${index}]`);
    assertStringArray(item.evidenceRefs, `foremansWalkFindings[${index}].evidenceRefs`, {
      nonEmpty: true
    });

    if (item.sourceRefs !== undefined) {
      assertStringArray(item.sourceRefs, `foremansWalkFindings[${index}].sourceRefs`);
    }

    return {
      signalId: `walk:${item.findingId}`,
      sourceSurface: "FOREMANS_WALK",
      sourceType: item.findingType,
      summary: item.summary,
      sourceRefs: uniqueStrings([...(item.sourceRefs || [])]),
      evidenceRefs: uniqueStrings([...item.evidenceRefs])
    };
  });
}

function normalizeBoardItems(value) {
  return normalizeInputList(value, "boardCapturedItems").map((item, index) => {
    if (!isPlainObject(item)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'boardCapturedItems[${index}]' must be an object`
      );
    }

    assertRequiredString(item, "itemId", `boardCapturedItems[${index}]`);
    assertRequiredString(item, "summary", `boardCapturedItems[${index}]`);

    const sourceRefs = item.sourceRefs || [];
    const evidenceRefs = item.evidenceRefs || [];

    assertStringArray(sourceRefs, `boardCapturedItems[${index}].sourceRefs`);
    assertStringArray(evidenceRefs, `boardCapturedItems[${index}].evidenceRefs`);

    if (sourceRefs.length === 0 && evidenceRefs.length === 0) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'boardCapturedItems[${index}]' must include at least one sourceRef or evidenceRef`
      );
    }

    return {
      signalId: `board:${item.itemId}`,
      sourceSurface: "OPEN_ITEMS_BOARD",
      sourceType: item.stateLabel || item.missingItemCode || "BOARD_ITEM",
      summary: item.summary,
      sourceRefs: uniqueStrings([...sourceRefs]),
      evidenceRefs: uniqueStrings([...evidenceRefs])
    };
  });
}

function normalizeContinuityEntries(value) {
  return normalizeInputList(value, "continuityEntries").map((item, index) => {
    if (!isPlainObject(item)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'continuityEntries[${index}]' must be an object`
      );
    }

    assertRequiredString(item, "entryId", `continuityEntries[${index}]`);
    assertRequiredString(item, "entryType", `continuityEntries[${index}]`);
    assertRequiredString(item, "summary", `continuityEntries[${index}]`);
    assertStringArray(item.sourceRefs, `continuityEntries[${index}].sourceRefs`, {
      nonEmpty: true
    });

    if (item.evidenceRefs !== undefined) {
      assertStringArray(item.evidenceRefs, `continuityEntries[${index}].evidenceRefs`);
    }

    return {
      signalId: `continuity:${item.entryId}`,
      sourceSurface: "CONTINUITY_LEDGER",
      sourceType: item.entryType,
      summary: item.summary,
      sourceRefs: uniqueStrings([...item.sourceRefs]),
      evidenceRefs: uniqueStrings([...(item.evidenceRefs || [])])
    };
  });
}

function normalizeStandingRiskItems(value) {
  return normalizeInputList(value, "standingRiskItems").map((item, index) => {
    if (!isPlainObject(item)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'standingRiskItems[${index}]' must be an object`
      );
    }

    assertRequiredString(item, "entryId", `standingRiskItems[${index}]`);
    assertRequiredString(item, "state", `standingRiskItems[${index}]`);
    assertRequiredString(item, "summary", `standingRiskItems[${index}]`);

    const sourceRefs = item.sourceRefs || [];
    const evidenceRefs = item.evidenceRefs || [];

    assertStringArray(sourceRefs, `standingRiskItems[${index}].sourceRefs`);
    assertStringArray(evidenceRefs, `standingRiskItems[${index}].evidenceRefs`);

    return {
      signalId: `standing:${item.entryId}`,
      sourceSurface: "STANDING_RISK",
      sourceType: item.state,
      summary: item.summary,
      sourceRefs: uniqueStrings([...sourceRefs]),
      evidenceRefs: uniqueStrings([...evidenceRefs])
    };
  });
}

function normalizeForensicEntries(value) {
  return normalizeInputList(value, "forensicEntries").map((item, index) => {
    if (!isPlainObject(item)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'forensicEntries[${index}]' must be an object`
      );
    }

    assertRequiredString(item, "entryId", `forensicEntries[${index}]`);
    assertRequiredString(item, "entryType", `forensicEntries[${index}]`);
    assertRequiredString(item, "recordedAt", `forensicEntries[${index}]`);
    assertRequiredString(item, "sourceArtifact", `forensicEntries[${index}]`);
    assertRequiredString(item, "sourceLocation", `forensicEntries[${index}]`);

    if (!isPlainObject(item.payload)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'forensicEntries[${index}].payload' must be an object`
      );
    }

    if (item.linkedEntryRefs !== undefined) {
      assertStringArray(item.linkedEntryRefs, `forensicEntries[${index}].linkedEntryRefs`);
    }

    const summary =
      typeof item.payload.summary === "string" && item.payload.summary.trim() !== ""
        ? item.payload.summary
        : `${item.entryType} signal`; 

    return {
      signalId: `forensic:${item.entryId}`,
      sourceSurface: "FORENSIC_CHAIN",
      sourceType: item.entryType,
      summary,
      sourceRefs: [`${item.sourceArtifact}:${item.sourceLocation}`],
      evidenceRefs: uniqueStrings([...(item.linkedEntryRefs || [])])
    };
  });
}

function cloneSignal(input) {
  return {
    signalId: input.signalId,
    sourceSurface: input.sourceSurface,
    sourceType: input.sourceType,
    summary: input.summary,
    sourceRefs: [...input.sourceRefs],
    evidenceRefs: [...input.evidenceRefs]
  };
}

class CompressedGovernanceHealthSkills {
  renderPreventionRecord(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'input' must be an object"
      );
    }

    assertRequiredString(input, "sessionId");

    const walkSignals = normalizeWalkFindings(input.foremansWalkFindings);
    const boardSignals = normalizeBoardItems(input.boardCapturedItems);
    const continuitySignals = normalizeContinuityEntries(input.continuityEntries);
    const standingSignals = normalizeStandingRiskItems(input.standingRiskItems);
    const forensicSignals = normalizeForensicEntries(input.forensicEntries);

    const capturedSignals = [
      ...walkSignals,
      ...boardSignals,
      ...continuitySignals,
      ...standingSignals,
      ...forensicSignals
    ].map(cloneSignal);

    if (capturedSignals.length === 0) {
      throw makeValidationError(
        "HOLD_INSUFFICIENT_EVIDENCE",
        "No explicit captured governance signal is available for '/prevention-record'"
      );
    }

    return {
      route: "/prevention-record",
      sessionId: input.sessionId,
      sourceCounts: {
        foremansWalkFindings: walkSignals.length,
        boardCapturedItems: boardSignals.length,
        continuityEntries: continuitySignals.length,
        standingRiskItems: standingSignals.length,
        forensicEntries: forensicSignals.length,
        totalSignals: capturedSignals.length
      },
      capturedSignals
    };
  }

  renderRights() {
    return {
      route: "/rights",
      viewMode: RIGHTS_VIEW_MODE,
      rights: RIGHTS_ITEMS.map((item) => ({ ...item }))
    };
  }
}

module.exports = {
  CompressedGovernanceHealthSkills,
  SKILL_ROUTES,
  RIGHTS_VIEW_MODE
};
