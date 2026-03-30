"use strict";

const FINDING_TYPES = Object.freeze([
  "VIOLATION",
  "PHANTOM",
  "GHOST",
  "DRIFT",
  "INCOMPLETE",
  "PARTIAL_VERIFICATION",
  "EVIDENCE_GAP",
]);

const FINDING_TYPE_SET = new Set(FINDING_TYPES);

const DEFAULT_SEVERITY_BY_FINDING = Object.freeze({
  VIOLATION: "CRITICAL",
  PHANTOM: "HIGH",
  GHOST: "HIGH",
  DRIFT: "MEDIUM",
  INCOMPLETE: "MEDIUM",
  EVIDENCE_GAP: "MEDIUM",
  PARTIAL_VERIFICATION: "LOW",
});

const SEVERITY_ORDER = Object.freeze(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const FINDING_PRECEDENCE = Object.freeze([
  "VIOLATION",
  "PHANTOM",
  "GHOST",
  "DRIFT",
  "INCOMPLETE",
  "EVIDENCE_GAP",
  "PARTIAL_VERIFICATION",
]);

const FINDING_PRECEDENCE_INDEX = new Map(
  FINDING_PRECEDENCE.map((findingType, index) => [findingType, index])
);

const AS_BUILT_STATUSES = Object.freeze([
  "MATCHED",
  "MODIFIED",
  "ADDED",
  "DEFERRED",
  "HELD",
]);

const AS_BUILT_STATUS_SET = new Set(AS_BUILT_STATUSES);

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertRequiredPlainObject(input, fieldName) {
  if (!isPlainObject(input[fieldName])) {
    throw makeValidationError(
      "INVALID_INPUT",
      `'${fieldName}' must be an object`
    );
  }
}

function assertRequiredStringArray(input, fieldName) {
  const value = input[fieldName];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw makeValidationError(
      "INVALID_INPUT",
      `'${fieldName}' must be an array of strings`
    );
  }
}

function assertOptionalArrayOfObjects(input, fieldName) {
  if (input[fieldName] === undefined) {
    return;
  }

  if (!Array.isArray(input[fieldName]) || input[fieldName].some((entry) => !isPlainObject(entry))) {
    throw makeValidationError(
      "INVALID_INPUT",
      `'${fieldName}' must be an array of objects when provided`
    );
  }
}

function assertOptionalObject(input, fieldName) {
  if (input[fieldName] !== undefined && !isPlainObject(input[fieldName])) {
    throw makeValidationError(
      "INVALID_INPUT",
      `'${fieldName}' must be an object when provided`
    );
  }
}

function normalizeInput(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "Foreman's Walk input must be an object"
    );
  }

  assertRequiredPlainObject(input, "sessionBrief");
  assertRequiredPlainObject(input, "sessionReceipt");

  assertRequiredStringArray(input.sessionBrief, "inScope");
  assertRequiredStringArray(input.sessionBrief, "outOfScope");
  assertRequiredStringArray(input.sessionReceipt, "completedWork");
  assertRequiredStringArray(input.sessionReceipt, "holdsRaised");

  assertOptionalArrayOfObjects(input, "performedActions");
  assertOptionalArrayOfObjects(input, "forensicEntries");
  assertOptionalObject(input, "omissionEnrichment");

  if (
    input.omissionEnrichment !== undefined &&
    (!Array.isArray(input.omissionEnrichment.findings) ||
      input.omissionEnrichment.findings.some((finding) => !isPlainObject(finding)))
  ) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'omissionEnrichment.findings' must be an array of objects when omissionEnrichment is provided"
    );
  }

  const sessionBrief = {
    ...input.sessionBrief,
    inScope: [...input.sessionBrief.inScope],
    outOfScope: [...input.sessionBrief.outOfScope],
    controlRodProfile: input.sessionBrief.controlRodProfile,
  };

  const sessionReceipt = {
    ...input.sessionReceipt,
    completedWork: [...input.sessionReceipt.completedWork],
    holdsRaised: [...input.sessionReceipt.holdsRaised],
  };

  const performedActions = (input.performedActions || sessionReceipt.completedWork.map((workItem, index) => ({
    actionId: `action_${index + 1}`,
    workItem,
  }))).map(normalizeActionRecord);

  const forensicEntries = (input.forensicEntries || []).map(normalizeForensicEntry);
  const omissionEnrichment = input.omissionEnrichment
    ? { findings: [...input.omissionEnrichment.findings] }
    : undefined;

  return {
    sessionBrief,
    sessionReceipt,
    performedActions,
    forensicEntries,
    omissionEnrichment,
  };
}

function normalizeActionRecord(action, index) {
  const fallbackIndex = index + 1;
  if (!isPlainObject(action)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'performedActions' must contain objects"
    );
  }

  if (typeof action.workItem !== "string" || action.workItem.trim() === "") {
    throw makeValidationError(
      "INVALID_INPUT",
      "'performedActions[].workItem' must be a non-empty string"
    );
  }

  const actionId =
    typeof action.actionId === "string" && action.actionId.trim() !== ""
      ? action.actionId
      : `action_${fallbackIndex}`;

  if (action.domainId !== undefined && typeof action.domainId !== "string") {
    throw makeValidationError(
      "INVALID_INPUT",
      "'performedActions[].domainId' must be a string when provided"
    );
  }

  if (action.operationType !== undefined && typeof action.operationType !== "string") {
    throw makeValidationError(
      "INVALID_INPUT",
      "'performedActions[].operationType' must be a string when provided"
    );
  }

  if (action.hardStopAuthorized !== undefined && typeof action.hardStopAuthorized !== "boolean") {
    throw makeValidationError(
      "INVALID_INPUT",
      "'performedActions[].hardStopAuthorized' must be a boolean when provided"
    );
  }

  return {
    actionId,
    workItem: action.workItem,
    domainId: action.domainId,
    operationType: action.operationType,
    hardStopAuthorized: action.hardStopAuthorized === true,
  };
}

function normalizeForensicEntry(entry) {
  if (!isPlainObject(entry)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'forensicEntries' must contain objects"
    );
  }

  if (typeof entry.entryId !== "string" || entry.entryId.trim() === "") {
    throw makeValidationError(
      "INVALID_INPUT",
      "'forensicEntries[].entryId' must be a non-empty string"
    );
  }

  if (typeof entry.entryType !== "string" || entry.entryType.trim() === "") {
    throw makeValidationError(
      "INVALID_INPUT",
      "'forensicEntries[].entryType' must be a non-empty string"
    );
  }

  if (!Array.isArray(entry.linkedEntryRefs) || entry.linkedEntryRefs.some((ref) => typeof ref !== "string")) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'forensicEntries[].linkedEntryRefs' must be an array of strings"
    );
  }

  if (!isPlainObject(entry.payload)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'forensicEntries[].payload' must be an object"
    );
  }

  return {
    entryId: entry.entryId,
    entryType: entry.entryType,
    linkedEntryRefs: [...entry.linkedEntryRefs],
    payload: { ...entry.payload },
  };
}

function buildDomainAutonomyMap(controlRodProfile) {
  const map = new Map();

  if (!isPlainObject(controlRodProfile) || !Array.isArray(controlRodProfile.domainRules)) {
    return map;
  }

  for (const rule of controlRodProfile.domainRules) {
    if (
      isPlainObject(rule) &&
      typeof rule.domainId === "string" &&
      typeof rule.autonomyLevel === "string"
    ) {
      map.set(rule.domainId, rule.autonomyLevel);
    }
  }

  return map;
}

function escalateSeverityIfSupervised(defaultSeverity, domainId, domainAutonomyById) {
  if (typeof domainId !== "string" || domainId.trim() === "") {
    return defaultSeverity;
  }

  if (domainAutonomyById.get(domainId) !== "SUPERVISED") {
    return defaultSeverity;
  }

  const index = SEVERITY_ORDER.indexOf(defaultSeverity);
  if (index < 0 || index >= SEVERITY_ORDER.length - 1) {
    return defaultSeverity;
  }

  return SEVERITY_ORDER[index + 1];
}

function candidateSortKey(candidate) {
  return FINDING_PRECEDENCE_INDEX.get(candidate.findingType);
}

function addCandidate(candidatesByIssue, candidate) {
  if (!FINDING_TYPE_SET.has(candidate.findingType)) {
    throw makeValidationError(
      "INVALID_FINDING_TYPE",
      `unsupported finding type '${candidate.findingType}'`
    );
  }

  const existing = candidatesByIssue.get(candidate.issueRef);
  if (!existing || candidateSortKey(candidate) < candidateSortKey(existing)) {
    candidatesByIssue.set(candidate.issueRef, candidate);
  }
}

function buildAsBuilt(sessionBrief, sessionReceipt) {
  const inScopeSet = new Set(sessionBrief.inScope);
  const completedSet = new Set(sessionReceipt.completedWork);
  const holdsSet = new Set(sessionReceipt.holdsRaised);

  const items = [];

  for (const scopeItem of sessionBrief.inScope) {
    if (completedSet.has(scopeItem)) {
      items.push({ workItem: scopeItem, status: "MATCHED" });
      continue;
    }

    const modifiedEntry = sessionReceipt.completedWork.find(
      (completedItem) => completedItem.startsWith("MODIFIED::") && completedItem.includes(`::${scopeItem}`)
    );

    if (modifiedEntry) {
      items.push({ workItem: scopeItem, status: "MODIFIED" });
      continue;
    }

    if (holdsSet.has(scopeItem)) {
      items.push({ workItem: scopeItem, status: "HELD" });
      continue;
    }

    items.push({ workItem: scopeItem, status: "DEFERRED" });
  }

  for (const completedItem of sessionReceipt.completedWork) {
    if (inScopeSet.has(completedItem)) {
      continue;
    }

    if (completedItem.startsWith("MODIFIED::")) {
      continue;
    }

    items.push({ workItem: completedItem, status: "ADDED" });
  }

  const statusCounts = {
    MATCHED: 0,
    MODIFIED: 0,
    ADDED: 0,
    DEFERRED: 0,
    HELD: 0,
  };

  for (const item of items) {
    if (!AS_BUILT_STATUS_SET.has(item.status)) {
      throw makeValidationError(
        "INVALID_AS_BUILT_STATUS",
        `unsupported as-built status '${item.status}'`
      );
    }

    statusCounts[item.status] += 1;
  }

  return {
    sessionOfRecordRef: sessionReceipt.receiptId,
    accountabilityDeltaOfRecord: "As-Built",
    items,
    statusCounts,
  };
}

function detectCycles(entriesById) {
  const visiting = new Set();
  const visited = new Set();
  const cycleEntryIds = new Set();

  function dfs(entryId, pathStack) {
    if (visiting.has(entryId)) {
      cycleEntryIds.add(entryId);
      for (const pathEntryId of pathStack) {
        cycleEntryIds.add(pathEntryId);
      }
      return;
    }

    if (visited.has(entryId)) {
      return;
    }

    visiting.add(entryId);
    const entry = entriesById.get(entryId);
    if (entry) {
      for (const linkedEntryId of entry.linkedEntryRefs) {
        if (entriesById.has(linkedEntryId)) {
          dfs(linkedEntryId, [...pathStack, entryId]);
        }
      }
    }

    visiting.delete(entryId);
    visited.add(entryId);
  }

  for (const entryId of entriesById.keys()) {
    dfs(entryId, []);
  }

  return cycleEntryIds;
}

function buildSummaryByFindingType(findings) {
  const summary = {
    VIOLATION: 0,
    PHANTOM: 0,
    GHOST: 0,
    DRIFT: 0,
    INCOMPLETE: 0,
    PARTIAL_VERIFICATION: 0,
    EVIDENCE_GAP: 0,
  };

  for (const finding of findings) {
    summary[finding.findingType] += 1;
  }

  return summary;
}

class ForemansWalk {
  evaluate(input) {
    const normalized = normalizeInput(input);
    const candidatesByIssue = new Map();
    const domainAutonomyById = buildDomainAutonomyMap(
      normalized.sessionBrief.controlRodProfile
    );

    const outOfScopeSet = new Set(normalized.sessionBrief.outOfScope);

    for (const action of normalized.performedActions) {
      if (outOfScopeSet.has(action.workItem)) {
        addCandidate(candidatesByIssue, {
          issueRef: `action:${action.actionId}`,
          findingType: "DRIFT",
          domainId: action.domainId,
          summary: `Out-of-scope work was performed: '${action.workItem}'.`,
          pass: "Scope Compliance",
          evidenceRefs: [action.workItem],
        });
      }

      if (typeof action.domainId === "string") {
        const autonomyLevel = domainAutonomyById.get(action.domainId);
        const ruleCoversOperation =
          action.operationType === undefined ||
          !isPlainObject(normalized.sessionBrief.controlRodProfile) ||
          !Array.isArray(normalized.sessionBrief.controlRodProfile.domainRules) ||
          normalized.sessionBrief.controlRodProfile.domainRules.some(
            (rule) =>
              isPlainObject(rule) &&
              rule.domainId === action.domainId &&
              Array.isArray(rule.operationTypes) &&
              (action.operationType === undefined ||
                rule.operationTypes.includes(action.operationType))
          );

        if (
          autonomyLevel === "HARD_STOP" &&
          ruleCoversOperation &&
          action.hardStopAuthorized !== true
        ) {
          addCandidate(candidatesByIssue, {
            issueRef: `action:${action.actionId}`,
            findingType: "VIOLATION",
            domainId: action.domainId,
            summary: `Unauthorized HARD_STOP action detected for '${action.workItem}'.`,
            pass: "Constraint Compliance",
            evidenceRefs: [action.workItem],
          });
        }
      }
    }

    const completedSet = new Set(normalized.sessionReceipt.completedWork);
    for (const scopeItem of normalized.sessionBrief.inScope) {
      if (!completedSet.has(scopeItem)) {
        const omissionNote = normalized.omissionEnrichment
          ? ` Omission enrichment findings available: ${normalized.omissionEnrichment.findings.length}.`
          : "";

        addCandidate(candidatesByIssue, {
          issueRef: `scope:${scopeItem}`,
          findingType: "INCOMPLETE",
          summary: `Scoped work is incomplete: '${scopeItem}'.${omissionNote}`,
          pass: "Completeness",
          evidenceRefs: [scopeItem],
        });
      }
    }

    const entriesById = new Map();
    for (const entry of normalized.forensicEntries) {
      entriesById.set(entry.entryId, entry);
    }

    const claims = normalized.forensicEntries.filter((entry) => entry.entryType === "CLAIM");
    const evidences = normalized.forensicEntries.filter((entry) => entry.entryType === "EVIDENCE");
    const claimLinkedEvidenceIds = new Set();

    for (const claim of claims) {
      const evidenceRefs = claim.linkedEntryRefs.filter((linkedEntryId) => {
        const linkedEntry = entriesById.get(linkedEntryId);
        return linkedEntry && linkedEntry.entryType === "EVIDENCE";
      });

      for (const evidenceRef of evidenceRefs) {
        claimLinkedEvidenceIds.add(evidenceRef);
      }

      const gapRefs = claim.linkedEntryRefs.filter((linkedEntryId) => {
        const linkedEntry = entriesById.get(linkedEntryId);
        return linkedEntry && linkedEntry.entryType === "GAP";
      });

      if (claim.linkedEntryRefs.length === 0 || evidenceRefs.length === 0) {
        addCandidate(candidatesByIssue, {
          issueRef: `claim:${claim.entryId}`,
          findingType: "PHANTOM",
          domainId: claim.payload.domainId,
          summary: `Claim '${claim.entryId}' does not have supporting evidence linkage.`,
          pass: "Truthfulness",
          evidenceRefs: [claim.entryId],
        });
      } else if (gapRefs.length > 0) {
        addCandidate(candidatesByIssue, {
          issueRef: `claim:${claim.entryId}`,
          findingType: "PARTIAL_VERIFICATION",
          domainId: claim.payload.domainId,
          summary: `Claim '${claim.entryId}' has partial support with open gap references.`,
          pass: "Truthfulness",
          evidenceRefs: [claim.entryId, ...gapRefs],
        });
      }

      for (const linkedEntryId of claim.linkedEntryRefs) {
        if (!entriesById.has(linkedEntryId)) {
          addCandidate(candidatesByIssue, {
            issueRef: `claim:${claim.entryId}`,
            findingType: "EVIDENCE_GAP",
            domainId: claim.payload.domainId,
            summary: `Claim '${claim.entryId}' links to missing evidence reference '${linkedEntryId}'.`,
            pass: "Evidence Integrity",
            evidenceRefs: [claim.entryId, linkedEntryId],
          });
        }
      }
    }

    for (const evidence of evidences) {
      if (!claimLinkedEvidenceIds.has(evidence.entryId)) {
        addCandidate(candidatesByIssue, {
          issueRef: `evidence:${evidence.entryId}`,
          findingType: "GHOST",
          domainId: evidence.payload.domainId,
          summary: `Evidence '${evidence.entryId}' has no linked claim.`,
          pass: "Truthfulness",
          evidenceRefs: [evidence.entryId],
        });
      }
    }

    const cycleEntryIds = detectCycles(entriesById);
    for (const cycleEntryId of cycleEntryIds) {
      const entry = entriesById.get(cycleEntryId);
      const domainId = entry && entry.payload ? entry.payload.domainId : undefined;
      addCandidate(candidatesByIssue, {
        issueRef: `cycle:${cycleEntryId}`,
        findingType: "EVIDENCE_GAP",
        domainId,
        summary: `Circular evidence linkage detected at '${cycleEntryId}'.`,
        pass: "Evidence Integrity",
        evidenceRefs: [cycleEntryId],
      });
    }

    const findings = Array.from(candidatesByIssue.values())
      .sort((a, b) => {
        if (a.issueRef < b.issueRef) {
          return -1;
        }
        if (a.issueRef > b.issueRef) {
          return 1;
        }
        return 0;
      })
      .map((candidate) => {
        const defaultSeverity = DEFAULT_SEVERITY_BY_FINDING[candidate.findingType];
        return {
          issueRef: candidate.issueRef,
          findingType: candidate.findingType,
          severity: escalateSeverityIfSupervised(
            defaultSeverity,
            candidate.domainId,
            domainAutonomyById
          ),
          pass: candidate.pass,
          summary: candidate.summary,
          evidenceRefs: [...candidate.evidenceRefs],
        };
      });

    const asBuilt = buildAsBuilt(normalized.sessionBrief, normalized.sessionReceipt);

    return {
      findings,
      findingSummary: buildSummaryByFindingType(findings),
      asBuilt,
    };
  }
}

module.exports = {
  ForemansWalk,
  FINDING_TYPES,
  DEFAULT_SEVERITY_BY_FINDING,
  AS_BUILT_STATUSES,
};
