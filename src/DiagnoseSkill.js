"use strict";

const SKILL_ROUTES = Object.freeze(["/diagnose"]);
const CHAIN_ENTRY_TYPES = Object.freeze([
  "CLAIM",
  "EVIDENCE",
  "GAP",
  "FINDING",
  "OPERATOR_ACTION",
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

function assertStringList(value, fieldName, { allowEmpty = true } = {}) {
  if (!Array.isArray(value)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be an array of strings`
    );
  }

  if (!allowEmpty && value.length === 0) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be a non-empty array of strings`
    );
  }

  if (value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be an array of non-empty strings`
    );
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cloneTextList(values) {
  return values.map((value) => `${value}`);
}

function normalizeWalkFinding(input, index) {
  const fieldBase = `walkEvaluation.findings[${index}]`;
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldBase}' must be an object`
    );
  }

  assertRequiredString(input, "issueRef", fieldBase);
  assertRequiredString(input, "findingType", fieldBase);
  assertRequiredString(input, "severity", fieldBase);
  assertRequiredString(input, "pass", fieldBase);
  assertRequiredString(input, "summary", fieldBase);
  assertStringList(input.evidenceRefs, `${fieldBase}.evidenceRefs`);

  return {
    issueRef: input.issueRef,
    findingType: input.findingType,
    severity: input.severity,
    pass: input.pass,
    summary: input.summary,
    evidenceRefs: cloneTextList(input.evidenceRefs),
  };
}

function buildFindingSummary(findings) {
  const summary = {};

  for (const finding of findings) {
    if (!Object.prototype.hasOwnProperty.call(summary, finding.findingType)) {
      summary[finding.findingType] = 0;
    }

    summary[finding.findingType] += 1;
  }

  return summary;
}

function normalizeWalkEvaluation(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'walkEvaluation' must be an object"
    );
  }

  if (!Array.isArray(input.findings)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'walkEvaluation.findings' must be an array"
    );
  }

  const findings = input.findings.map((finding, index) =>
    normalizeWalkFinding(finding, index)
  );

  return {
    findings,
    findingSummary: buildFindingSummary(findings),
  };
}

function normalizeChainEntry(input, index) {
  const fieldBase = `chainView.entries[${index}]`;
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldBase}' must be an object`
    );
  }

  assertRequiredString(input, "entryId", fieldBase);
  assertRequiredString(input, "entryType", fieldBase);

  if (!CHAIN_ENTRY_TYPES.includes(input.entryType)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldBase}.entryType' must be one of: CLAIM, EVIDENCE, GAP, FINDING, OPERATOR_ACTION`
    );
  }

  if (!isPlainObject(input.payload)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldBase}.payload' must be an object`
    );
  }

  assertStringList(input.linkedEntryRefs, `${fieldBase}.linkedEntryRefs`);

  return {
    entryId: input.entryId,
    entryType: input.entryType,
    payload: deepClone(input.payload),
    linkedEntryRefs: cloneTextList(input.linkedEntryRefs),
  };
}

function normalizeChainView(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'chainView' must be an object"
    );
  }

  assertRequiredString(input, "chainId", "chainView");

  if (!Array.isArray(input.entries)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'chainView.entries' must be an array"
    );
  }

  return {
    chainId: input.chainId,
    entries: input.entries.map((entry, index) => normalizeChainEntry(entry, index)),
  };
}

function buildChainEntryTypeSummary(entries) {
  const summary = {
    CLAIM: 0,
    EVIDENCE: 0,
    GAP: 0,
    FINDING: 0,
    OPERATOR_ACTION: 0,
  };

  for (const entry of entries) {
    summary[entry.entryType] += 1;
  }

  return summary;
}

function buildEntryIndex(entries) {
  const index = {};

  for (const entry of entries) {
    index[entry.entryId] = entry;
  }

  return index;
}

function buildDiagnostics(findings, entryIndex) {
  const diagnostics = [];
  let linkedEvidenceRefCount = 0;
  let unlinkedEvidenceRefCount = 0;

  for (const finding of findings) {
    const linkedChainEntries = [];
    const unlinkedEvidenceRefs = [];
    const linkedSeen = {};
    const unlinkedSeen = {};

    for (const evidenceRef of finding.evidenceRefs) {
      const entry = entryIndex[evidenceRef];

      if (entry) {
        linkedEvidenceRefCount += 1;

        if (!linkedSeen[evidenceRef]) {
          linkedSeen[evidenceRef] = true;
          linkedChainEntries.push({
            entryId: entry.entryId,
            entryType: entry.entryType,
            payloadSummary:
              typeof entry.payload.summary === "string"
                ? entry.payload.summary
                : undefined,
            linkedEntryRefs: cloneTextList(entry.linkedEntryRefs),
          });
        }
      } else {
        unlinkedEvidenceRefCount += 1;

        if (!unlinkedSeen[evidenceRef]) {
          unlinkedSeen[evidenceRef] = true;
          unlinkedEvidenceRefs.push(evidenceRef);
        }
      }
    }

    diagnostics.push({
      issueRef: finding.issueRef,
      findingType: finding.findingType,
      severity: finding.severity,
      pass: finding.pass,
      summary: finding.summary,
      evidenceRefs: cloneTextList(finding.evidenceRefs),
      linkedChainEntries,
      unlinkedEvidenceRefs,
    });
  }

  return {
    diagnostics,
    linkedEvidenceRefCount,
    unlinkedEvidenceRefCount,
  };
}

class DiagnoseSkill {
  renderDiagnose(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
    }

    if (input.walkEvaluation === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'walkEvaluation' is required"
      );
    }

    if (input.chainView === undefined) {
      throw makeValidationError("ERR_INVALID_INPUT", "'chainView' is required");
    }

    const walkEvaluation = normalizeWalkEvaluation(input.walkEvaluation);
    const chainView = normalizeChainView(input.chainView);
    const chainEntryTypeSummary = buildChainEntryTypeSummary(chainView.entries);
    const entryIndex = buildEntryIndex(chainView.entries);
    const diagnosticsOutput = buildDiagnostics(walkEvaluation.findings, entryIndex);

    return {
      route: "/diagnose",
      chainId: chainView.chainId,
      findingCount: walkEvaluation.findings.length,
      findingSummary: walkEvaluation.findingSummary,
      chainEntryCount: chainView.entries.length,
      chainEntryTypeSummary,
      linkedEvidenceRefCount: diagnosticsOutput.linkedEvidenceRefCount,
      unlinkedEvidenceRefCount: diagnosticsOutput.unlinkedEvidenceRefCount,
      diagnostics: diagnosticsOutput.diagnostics,
    };
  }
}

module.exports = {
  DiagnoseSkill,
  SKILL_ROUTES,
};
