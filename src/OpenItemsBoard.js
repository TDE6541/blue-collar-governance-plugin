"use strict";

const BOARD_LABEL = "Open Items Board";
const GROUP_LABELS = Object.freeze({
  MISSING_NOW: "Missing now",
  STILL_UNRESOLVED: "Still unresolved",
  AGING_INTO_RISK: "Aging into risk",
  RESOLVED_THIS_SESSION: "Resolved this session",
});

const GROUP_PRECEDENCE = Object.freeze([
  GROUP_LABELS.RESOLVED_THIS_SESSION,
  GROUP_LABELS.AGING_INTO_RISK,
  GROUP_LABELS.STILL_UNRESOLVED,
  GROUP_LABELS.MISSING_NOW,
]);

const STANDING_STATES = new Set([
  "OPEN",
  "CARRIED",
  "STANDING",
  "RESOLVED",
  "DISMISSED",
  "EXPLICITLY_ACCEPTED",
]);
const UNRESOLVED_STATES = new Set(["OPEN", "CARRIED"]);
const AGING_STATES = new Set(["STANDING"]);
const OUTCOMES = new Set(["resolve", "dismiss", "explicitly_accept"]);

const FORBIDDEN_FIELDS = new Set([
  "score",
  "confidence",
  "rank",
  "priority",
  "anomaly",
  "prediction",
  "smartInsights",
  "strategyHint",
]);

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

function assertStringArray(input, fieldName, allowEmpty = false) {
  const value = input[fieldName];
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be ${allowEmpty ? "an array" : "a non-empty array"} of strings`
    );
  }

  if (value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be ${allowEmpty ? "an array" : "a non-empty array"} of strings`
    );
  }
}

function assertNoForbiddenFields(input, objectName) {
  for (const field of FORBIDDEN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'${objectName}' must not include '${field}'`
      );
    }
  }
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function normalizeOmissionFinding(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FINDING",
      "omission finding must be an object"
    );
  }

  assertNoForbiddenFields(input, "omission finding");
  assertRequiredString(input, "findingId");
  assertRequiredString(input, "summary");
  assertRequiredString(input, "missingItemCode");
  assertRequiredString(input, "profilePack");
  assertStringArray(input, "evidenceRefs", false);

  if (input.sourceRefs !== undefined) {
    assertStringArray(input, "sourceRefs", true);
  }

  if (input.entryId !== undefined) {
    if (typeof input.entryId !== "string" || input.entryId.trim() === "") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'entryId' must be a non-empty string when provided"
      );
    }
  }

  return {
    findingId: input.findingId,
    entryId: input.entryId,
    summary: input.summary,
    missingItemCode: input.missingItemCode,
    profilePack: input.profilePack,
    sourceRefs: uniqueStrings([...(input.sourceRefs || [])]),
    evidenceRefs: uniqueStrings([...input.evidenceRefs]),
  };
}

function normalizeContinuityEntry(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_CONTINUITY_ENTRY",
      "continuity entry must be an object"
    );
  }

  assertNoForbiddenFields(input, "continuity entry");
  assertRequiredString(input, "entryId");
  assertRequiredString(input, "summary");
  assertStringArray(input, "sourceRefs", false);

  if (input.evidenceRefs !== undefined) {
    assertStringArray(input, "evidenceRefs", true);
  }

  return {
    entryId: input.entryId,
    summary: input.summary,
    sourceRefs: uniqueStrings([...input.sourceRefs]),
    evidenceRefs: uniqueStrings([...(input.evidenceRefs || [])]),
  };
}

function normalizeStandingRiskItem(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_STANDING_ITEM",
      "standing-risk item must be an object"
    );
  }

  assertNoForbiddenFields(input, "standing-risk item");
  assertRequiredString(input, "entryId");
  assertRequiredString(input, "state");

  if (!STANDING_STATES.has(input.state)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'state' must be one of: OPEN, CARRIED, STANDING, RESOLVED, DISMISSED, EXPLICITLY_ACCEPTED"
    );
  }

  if (input.evidenceRefs !== undefined) {
    assertStringArray(input, "evidenceRefs", true);
  }

  return {
    entryId: input.entryId,
    state: input.state,
    evidenceRefs: uniqueStrings([...(input.evidenceRefs || [])]),
  };
}

function normalizeResolvedOutcome(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_RESOLVED_OUTCOME",
      "resolved outcome must be an object"
    );
  }

  assertNoForbiddenFields(input, "resolved outcome");
  assertRequiredString(input, "entryId");
  assertRequiredString(input, "summary");
  assertRequiredString(input, "outcome");
  assertStringArray(input, "sourceRefs", false);

  if (!OUTCOMES.has(input.outcome)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'outcome' must be one of: resolve, dismiss, explicitly_accept"
    );
  }

  if (input.evidenceRefs !== undefined) {
    assertStringArray(input, "evidenceRefs", true);
  }

  return {
    entryId: input.entryId,
    summary: input.summary,
    outcome: input.outcome,
    sourceRefs: uniqueStrings([...input.sourceRefs]),
    evidenceRefs: uniqueStrings([...(input.evidenceRefs || [])]),
  };
}

function normalizeBoardInput(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "open-items board input must be an object"
    );
  }

  assertRequiredString(input, "sessionId");

  if (!Array.isArray(input.omissionFindings)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'omissionFindings' must be an array"
    );
  }

  if (!Array.isArray(input.continuityEntries)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'continuityEntries' must be an array"
    );
  }

  if (!Array.isArray(input.standingRiskView)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'standingRiskView' must be an array"
    );
  }

  if (!Array.isArray(input.currentSessionResolvedOutcomes)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'currentSessionResolvedOutcomes' must be an array"
    );
  }

  return {
    sessionId: input.sessionId,
    omissionFindings: input.omissionFindings.map(normalizeOmissionFinding),
    continuityEntries: input.continuityEntries.map(normalizeContinuityEntry),
    standingRiskView: input.standingRiskView.map(normalizeStandingRiskItem),
    currentSessionResolvedOutcomes:
      input.currentSessionResolvedOutcomes.map(normalizeResolvedOutcome),
  };
}

function makeGroupContainer() {
  return {
    [GROUP_LABELS.MISSING_NOW]: [],
    [GROUP_LABELS.STILL_UNRESOLVED]: [],
    [GROUP_LABELS.AGING_INTO_RISK]: [],
    [GROUP_LABELS.RESOLVED_THIS_SESSION]: [],
  };
}

function dedupeKeyForFinding(finding) {
  if (finding.entryId) {
    return `entry:${finding.entryId}`;
  }

  return `finding:${finding.findingId}`;
}

class OpenItemsBoard {
  projectBoard(input) {
    const normalized = normalizeBoardInput(input);

    const continuityByEntryId = new Map();
    for (const entry of normalized.continuityEntries) {
      if (continuityByEntryId.has(entry.entryId)) {
        throw makeValidationError(
          "DUPLICATE_ENTRY",
          `continuity entryId '${entry.entryId}' appears more than once`
        );
      }

      continuityByEntryId.set(entry.entryId, entry);
    }

    const candidates = {
      [GROUP_LABELS.RESOLVED_THIS_SESSION]: [],
      [GROUP_LABELS.AGING_INTO_RISK]: [],
      [GROUP_LABELS.STILL_UNRESOLVED]: [],
      [GROUP_LABELS.MISSING_NOW]: [],
    };

    for (const outcome of normalized.currentSessionResolvedOutcomes) {
      candidates[GROUP_LABELS.RESOLVED_THIS_SESSION].push({
        dedupeKey: `entry:${outcome.entryId}`,
        item: {
          itemId: outcome.entryId,
          summary: outcome.summary,
          stateLabel: "Resolved this session",
          sourceRefs: [...outcome.sourceRefs],
          evidenceRefs: [...outcome.evidenceRefs],
        },
      });
    }

    for (const standingItem of normalized.standingRiskView) {
      if (!UNRESOLVED_STATES.has(standingItem.state) && !AGING_STATES.has(standingItem.state)) {
        continue;
      }

      const continuityEntry = continuityByEntryId.get(standingItem.entryId);
      if (!continuityEntry) {
        throw makeValidationError(
          "MISSING_CONTINUITY_ENTRY",
          `standing-risk entryId '${standingItem.entryId}' requires matching continuity entry`
        );
      }

      const targetGroup = AGING_STATES.has(standingItem.state)
        ? GROUP_LABELS.AGING_INTO_RISK
        : GROUP_LABELS.STILL_UNRESOLVED;

      candidates[targetGroup].push({
        dedupeKey: `entry:${standingItem.entryId}`,
        item: {
          itemId: standingItem.entryId,
          summary: continuityEntry.summary,
          stateLabel: standingItem.state,
          sourceRefs: [...continuityEntry.sourceRefs],
          evidenceRefs: uniqueStrings([
            ...continuityEntry.evidenceRefs,
            ...standingItem.evidenceRefs,
          ]),
        },
      });
    }

    for (const finding of normalized.omissionFindings) {
      candidates[GROUP_LABELS.MISSING_NOW].push({
        dedupeKey: dedupeKeyForFinding(finding),
        item: {
          itemId: finding.findingId,
          summary: finding.summary,
          missingItemCode: finding.missingItemCode,
          profilePack: finding.profilePack,
          sourceRefs: [...finding.sourceRefs],
          evidenceRefs: [...finding.evidenceRefs],
        },
      });
    }

    const groups = makeGroupContainer();
    const seenDedupeKeys = new Set();

    for (const groupLabel of GROUP_PRECEDENCE) {
      for (const candidate of candidates[groupLabel]) {
        if (seenDedupeKeys.has(candidate.dedupeKey)) {
          continue;
        }

        groups[groupLabel].push(candidate.item);
        seenDedupeKeys.add(candidate.dedupeKey);
      }
    }

    return {
      boardLabel: BOARD_LABEL,
      sessionId: normalized.sessionId,
      precedence: [...GROUP_PRECEDENCE],
      groups,
    };
  }
}

module.exports = {
  OpenItemsBoard,
  BOARD_LABEL,
  GROUP_LABELS,
  GROUP_PRECEDENCE,
};
