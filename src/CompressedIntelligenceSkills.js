"use strict";

const SKILL_ROUTES = Object.freeze(["/phantoms", "/ufo", "/gaps"]);

const PHANTOMS_FINDING_TYPES = new Set([
  "PHANTOM",
  "GHOST",
  "PARTIAL_VERIFICATION",
]);

const UNRESOLVED_STANDING_STATES = new Set(["OPEN", "CARRIED", "STANDING"]);
const TERMINAL_STANDING_STATES = new Set([
  "RESOLVED",
  "DISMISSED",
  "EXPLICITLY_ACCEPTED",
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

function assertNonNegativeInteger(input, fieldName) {
  if (!Number.isInteger(input[fieldName]) || input[fieldName] < 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a non-negative integer`
    );
  }
}

function normalizePhantomsInput(input) {
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

  return input.findings.map((findingInput, index) => {
    if (!isPlainObject(findingInput)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'findings[${index}]' must be an object`
      );
    }

    assertRequiredString(findingInput, "issueRef");
    assertRequiredString(findingInput, "findingType");
    assertRequiredString(findingInput, "severity");
    assertRequiredString(findingInput, "pass");
    assertRequiredString(findingInput, "summary");
    assertStringArray(findingInput.evidenceRefs, "evidenceRefs");

    return {
      issueRef: findingInput.issueRef,
      findingType: findingInput.findingType,
      severity: findingInput.severity,
      pass: findingInput.pass,
      summary: findingInput.summary,
      evidenceRefs: [...findingInput.evidenceRefs],
    };
  });
}

function normalizeUfoInput(standingRiskViews) {
  if (!Array.isArray(standingRiskViews)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'standingRiskViews' must be an array"
    );
  }

  return standingRiskViews.map((input, index) => {
    if (!isPlainObject(input)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'standingRiskViews[${index}]' must be an object`
      );
    }

    assertRequiredString(input, "entryId");
    assertRequiredString(input, "entryType");
    assertRequiredString(input, "state");
    assertRequiredString(input, "originSessionId");
    assertRequiredString(input, "lastSeenSessionId");
    assertNonNegativeInteger(input, "sessionCount");
    assertNonNegativeInteger(input, "carryCount");
    assertRequiredBoolean(input, "triadSatisfied");
    assertRequiredBoolean(input, "relevantWorkContinued");
    assertRequiredBoolean(input, "blastRadiusStillExists");
    assertRequiredString(input, "rationale");
    assertStringArray(input.evidenceRefs, "evidenceRefs");

    if (
      !UNRESOLVED_STANDING_STATES.has(input.state) &&
      !TERMINAL_STANDING_STATES.has(input.state)
    ) {
      throw makeValidationError(
        "INVALID_FIELD",
        "'state' must be one of: OPEN, CARRIED, STANDING, RESOLVED, DISMISSED, EXPLICITLY_ACCEPTED"
      );
    }

    return {
      entryId: input.entryId,
      entryType: input.entryType,
      state: input.state,
      originSessionId: input.originSessionId,
      lastSeenSessionId: input.lastSeenSessionId,
      sessionCount: input.sessionCount,
      carryCount: input.carryCount,
      triadSatisfied: input.triadSatisfied,
      relevantWorkContinued: input.relevantWorkContinued,
      blastRadiusStillExists: input.blastRadiusStillExists,
      rationale: input.rationale,
      evidenceRefs: [...input.evidenceRefs],
    };
  });
}

function normalizeGapsInput(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_INPUT",
      "'omissionEvaluation' must be an object"
    );
  }

  assertRequiredString(input, "profilePack");
  assertRequiredString(input, "sessionId");

  if (!Array.isArray(input.findings)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'findings' must be an array"
    );
  }

  const findings = input.findings.map((findingInput, index) => {
    if (!isPlainObject(findingInput)) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'findings[${index}]' must be an object`
      );
    }

    assertRequiredString(findingInput, "profilePack");
    assertRequiredString(findingInput, "missingExpectedItem");
    assertRequiredString(findingInput, "missingItemCode");
    assertRequiredString(findingInput, "summary");
    assertStringArray(findingInput.evidenceRefs, "evidenceRefs");

    if (findingInput.profilePack !== input.profilePack) {
      throw makeValidationError(
        "INVALID_FIELD",
        `'findings[${index}].profilePack' must match 'profilePack'`
      );
    }

    return {
      profilePack: findingInput.profilePack,
      missingExpectedItem: findingInput.missingExpectedItem,
      missingItemCode: findingInput.missingItemCode,
      summary: findingInput.summary,
      evidenceRefs: [...findingInput.evidenceRefs],
    };
  });

  return {
    profilePack: input.profilePack,
    sessionId: input.sessionId,
    findings,
  };
}

class CompressedIntelligenceSkills {
  renderPhantoms(walkEvaluation) {
    const normalizedFindings = normalizePhantomsInput(walkEvaluation);
    const truthfulnessFindings = normalizedFindings.filter(
      (finding) =>
        PHANTOMS_FINDING_TYPES.has(finding.findingType) &&
        finding.pass === "Truthfulness"
    );

    const findingSummary = {
      PHANTOM: 0,
      GHOST: 0,
      PARTIAL_VERIFICATION: 0,
    };

    for (const finding of truthfulnessFindings) {
      findingSummary[finding.findingType] += 1;
    }

    return {
      route: "/phantoms",
      findingCount: truthfulnessFindings.length,
      findingSummary,
      findings: truthfulnessFindings.map((finding) => ({
        issueRef: finding.issueRef,
        findingType: finding.findingType,
        severity: finding.severity,
        pass: finding.pass,
        summary: finding.summary,
        evidenceRefs: [...finding.evidenceRefs],
      })),
    };
  }

  renderUfo(standingRiskViews) {
    const normalizedViews = normalizeUfoInput(standingRiskViews);
    const unresolved = normalizedViews.filter((view) =>
      UNRESOLVED_STANDING_STATES.has(view.state)
    );
    const terminalExcludedCount = normalizedViews.length - unresolved.length;

    const escalationSummary = {
      OPEN: 0,
      CARRIED: 0,
      STANDING: 0,
    };

    for (const view of unresolved) {
      escalationSummary[view.state] += 1;
    }

    return {
      route: "/ufo",
      unresolvedCount: unresolved.length,
      terminalExcludedCount,
      escalationSummary,
      unresolvedItems: unresolved.map((view) => ({
        entryId: view.entryId,
        entryType: view.entryType,
        state: view.state,
        originSessionId: view.originSessionId,
        lastSeenSessionId: view.lastSeenSessionId,
        sessionCount: view.sessionCount,
        carryCount: view.carryCount,
        triadSatisfied: view.triadSatisfied,
        relevantWorkContinued: view.relevantWorkContinued,
        blastRadiusStillExists: view.blastRadiusStillExists,
        rationale: view.rationale,
        evidenceRefs: [...view.evidenceRefs],
      })),
    };
  }

  renderGaps(omissionEvaluation) {
    const normalized = normalizeGapsInput(omissionEvaluation);

    return {
      route: "/gaps",
      profilePack: normalized.profilePack,
      sessionId: normalized.sessionId,
      missingCount: normalized.findings.length,
      missingFindings: normalized.findings.map((finding) => ({
        profilePack: finding.profilePack,
        missingExpectedItem: finding.missingExpectedItem,
        missingItemCode: finding.missingItemCode,
        summary: finding.summary,
        evidenceRefs: [...finding.evidenceRefs],
      })),
    };
  }
}

module.exports = {
  CompressedIntelligenceSkills,
  SKILL_ROUTES,
};
