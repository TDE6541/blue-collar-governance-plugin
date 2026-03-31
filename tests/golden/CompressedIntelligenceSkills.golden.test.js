"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CompressedIntelligenceSkills,
  SKILL_ROUTES,
} = require("../../src/CompressedIntelligenceSkills");

function buildWalkEvaluation(overrides = {}) {
  return {
    findings: [
      {
        issueRef: "claim:claim_001",
        findingType: "PHANTOM",
        severity: "HIGH",
        pass: "Truthfulness",
        summary: "Claim has no linked evidence.",
        evidenceRefs: ["claim_001"],
      },
      {
        issueRef: "evidence:evidence_001",
        findingType: "GHOST",
        severity: "HIGH",
        pass: "Truthfulness",
        summary: "Evidence has no linked claim.",
        evidenceRefs: ["evidence_001"],
      },
      {
        issueRef: "claim:claim_002",
        findingType: "PARTIAL_VERIFICATION",
        severity: "LOW",
        pass: "Truthfulness",
        summary: "Claim has partial support.",
        evidenceRefs: ["claim_002", "gap_001"],
      },
      {
        issueRef: "scope:task_001",
        findingType: "DRIFT",
        severity: "MEDIUM",
        pass: "Scope Compliance",
        summary: "Out-of-scope work.",
        evidenceRefs: ["task_001"],
      },
      {
        issueRef: "cycle:entry_001",
        findingType: "EVIDENCE_GAP",
        severity: "MEDIUM",
        pass: "Evidence Integrity",
        summary: "Circular linkage detected.",
        evidenceRefs: ["entry_001"],
      },
    ],
    ...overrides,
  };
}

function buildStandingRiskViews(overrides = {}) {
  return {
    views: [
      {
        entryId: "cont_001",
        entryType: "blocked_operation",
        state: "OPEN",
        originSessionId: "wave2_s01",
        lastSeenSessionId: "wave2_s02",
        sessionCount: 2,
        carryCount: 0,
        triadSatisfied: true,
        relevantWorkContinued: true,
        blastRadiusStillExists: true,
        evidenceRefs: ["signal_001"],
        rationale: "Triad satisfied with carryCount=0.",
      },
      {
        entryId: "cont_002",
        entryType: "blocked_operation",
        state: "CARRIED",
        originSessionId: "wave2_s01",
        lastSeenSessionId: "wave2_s03",
        sessionCount: 3,
        carryCount: 1,
        triadSatisfied: true,
        relevantWorkContinued: true,
        blastRadiusStillExists: true,
        evidenceRefs: ["signal_002"],
        rationale: "Triad satisfied with carryCount=1.",
      },
      {
        entryId: "cont_003",
        entryType: "blocked_operation",
        state: "STANDING",
        originSessionId: "wave2_s01",
        lastSeenSessionId: "wave2_s04",
        sessionCount: 4,
        carryCount: 2,
        triadSatisfied: true,
        relevantWorkContinued: true,
        blastRadiusStillExists: true,
        evidenceRefs: ["signal_003"],
        rationale: "Triad satisfied with carryCount>=2.",
      },
      {
        entryId: "cont_004",
        entryType: "blocked_operation",
        state: "RESOLVED",
        originSessionId: "wave2_s01",
        lastSeenSessionId: "wave2_s04",
        sessionCount: 4,
        carryCount: 2,
        triadSatisfied: false,
        relevantWorkContinued: false,
        blastRadiusStillExists: false,
        evidenceRefs: ["signal_004"],
        rationale: "Operator resolved continuity entry.",
      },
      {
        entryId: "cont_005",
        entryType: "blocked_operation",
        state: "DISMISSED",
        originSessionId: "wave2_s01",
        lastSeenSessionId: "wave2_s05",
        sessionCount: 5,
        carryCount: 2,
        triadSatisfied: false,
        relevantWorkContinued: false,
        blastRadiusStillExists: false,
        evidenceRefs: ["signal_005"],
        rationale: "Operator dismissed continuity entry.",
      },
    ],
    ...overrides,
  }.views;
}

function buildOmissionEvaluation(overrides = {}) {
  return {
    profilePack: "pricing_quote_change",
    sessionId: "wave5b_s02",
    findings: [
      {
        profilePack: "pricing_quote_change",
        missingExpectedItem: "QUOTE_CHANGE_APPLIED",
        missingItemCode: "MISSING_QUOTE_CHANGE_ARTIFACT",
        summary:
          "Missing expected output for 'pricing_quote_change': Quote change artifact captured.",
        evidenceRefs: ["receipt:wave5b_s02"],
      },
    ],
    ...overrides,
  };
}

function expectValidationError(run, code, message) {
  let error;
  try {
    run();
  } catch (caught) {
    error = caught;
  }

  if (!error) {
    assert.fail("Expected validation error, but no error was thrown");
  }

  assert.equal(error.name, "ValidationError");
  assert.equal(error.code, code);
  assert.equal(error.message, `${code}: ${message}`);
}

test("CompressedIntelligenceSkills exposes the locked route set", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/phantoms", "/ufo", "/gaps"]);
});

test("/phantoms maps to ForemansWalk truthfulness findings only and does not mutate input", () => {
  const skills = new CompressedIntelligenceSkills();
  const evaluation = buildWalkEvaluation();

  const viewA = skills.renderPhantoms(evaluation);
  assert.equal(viewA.route, "/phantoms");
  assert.equal(viewA.findingCount, 3);
  assert.deepEqual(viewA.findingSummary, {
    PHANTOM: 1,
    GHOST: 1,
    PARTIAL_VERIFICATION: 1,
  });
  assert.equal(viewA.findings.every((finding) => finding.pass === "Truthfulness"), true);

  viewA.findings[0].evidenceRefs.push("forbidden_mutation");
  const viewB = skills.renderPhantoms(evaluation);

  assert.equal(viewB.findings[0].evidenceRefs.includes("forbidden_mutation"), false);
  assert.equal(evaluation.findings[0].evidenceRefs.includes("forbidden_mutation"), false);
});

test("/ufo maps to StandingRisk unresolved and aging visibility only", () => {
  const skills = new CompressedIntelligenceSkills();
  const view = skills.renderUfo(buildStandingRiskViews());

  assert.equal(view.route, "/ufo");
  assert.equal(view.unresolvedCount, 3);
  assert.equal(view.terminalExcludedCount, 2);
  assert.deepEqual(view.escalationSummary, {
    OPEN: 1,
    CARRIED: 1,
    STANDING: 1,
  });
  assert.equal(
    view.unresolvedItems.every((entry) =>
      ["OPEN", "CARRIED", "STANDING"].includes(entry.state)
    ),
    true
  );
});

test("/gaps maps to OmissionCoverage expected-missing findings", () => {
  const skills = new CompressedIntelligenceSkills();
  const view = skills.renderGaps(buildOmissionEvaluation());

  assert.equal(view.route, "/gaps");
  assert.equal(view.profilePack, "pricing_quote_change");
  assert.equal(view.missingCount, 1);
  assert.equal(view.missingFindings[0].missingExpectedItem, "QUOTE_CHANGE_APPLIED");
  assert.equal(view.missingFindings[0].missingItemCode, "MISSING_QUOTE_CHANGE_ARTIFACT");
});

test("CompressedIntelligenceSkills validates StandingRisk state vocabulary", () => {
  const skills = new CompressedIntelligenceSkills();

  expectValidationError(
    () =>
      skills.renderUfo(
        buildStandingRiskViews({
          views: [
            {
              entryId: "cont_bad",
              entryType: "blocked_operation",
              state: "UNKNOWN_STATE",
              originSessionId: "wave2_s01",
              lastSeenSessionId: "wave2_s02",
              sessionCount: 2,
              carryCount: 0,
              triadSatisfied: false,
              relevantWorkContinued: false,
              blastRadiusStillExists: false,
              evidenceRefs: ["signal_bad"],
              rationale: "Invalid test entry.",
            },
          ],
        })
      ),
    "INVALID_FIELD",
    "'state' must be one of: OPEN, CARRIED, STANDING, RESOLVED, DISMISSED, EXPLICITLY_ACCEPTED"
  );
});

test("CompressedIntelligenceSkills validates profile-pack consistency for /gaps", () => {
  const skills = new CompressedIntelligenceSkills();

  expectValidationError(
    () =>
      skills.renderGaps(
        buildOmissionEvaluation({
          findings: [
            {
              profilePack: "form_customer_data_flow",
              missingExpectedItem: "CUSTOMER_DATA_FLOW_CAPTURED",
              missingItemCode: "MISSING_CUSTOMER_DATA_FLOW_ARTIFACT",
              summary: "Pack mismatch for negative control.",
              evidenceRefs: ["ref_mismatch"],
            },
          ],
        })
      ),
    "INVALID_FIELD",
    "'findings[0].profilePack' must match 'profilePack'"
  );
});

test("CompressedIntelligenceSkills exposes no persistence or gamification surfaces", () => {
  const skills = new CompressedIntelligenceSkills();

  const views = [
    skills.renderPhantoms(buildWalkEvaluation()),
    skills.renderUfo(buildStandingRiskViews()),
    skills.renderGaps(buildOmissionEvaluation()),
  ];

  const forbiddenFields = [
    "score",
    "points",
    "badge",
    "badges",
    "rank",
    "leaderboard",
    "usageAnalytics",
    "engagementState",
  ];

  for (const view of views) {
    for (const field of forbiddenFields) {
      assert.equal(Object.prototype.hasOwnProperty.call(view, field), false);
    }
  }

  assert.equal(typeof skills.persistSkillState, "undefined");
  assert.equal(typeof skills.createIntelligenceLedger, "undefined");
  assert.equal(typeof skills.saveUfoState, "undefined");
});
