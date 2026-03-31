"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CompressedHistoryTrustSkills,
  SKILL_ROUTES,
} = require("../../src/CompressedHistoryTrustSkills");

const T0 = "2026-04-03T08:00:00Z";
const T1 = "2026-04-03T08:05:00Z";
const T2 = "2026-04-03T08:10:00Z";

function buildChainView(overrides = {}) {
  return {
    chainId: "forensic_chain_wave5b_c_001",
    entries: [
      {
        chainId: "forensic_chain_wave5b_c_001",
        entryId: "evidence_001",
        entryType: "EVIDENCE",
        recordedAt: T0,
        sessionId: "wave5b_c_s01",
        sourceArtifact: "docs/WAVE4_CLOSEOUT.md",
        sourceLocation: "Evidence",
        payload: {
          summary: "Evidence exists for trust posture.",
        },
        linkedEntryRefs: [],
      },
      {
        chainId: "forensic_chain_wave5b_c_001",
        entryId: "claim_001",
        entryType: "CLAIM",
        recordedAt: T1,
        sessionId: "wave5b_c_s01",
        sourceArtifact: "docs/WAVE5_CLOSEOUT.md",
        sourceLocation: "Claim",
        payload: {
          summary: "Claim references prior evidence.",
        },
        linkedEntryRefs: ["evidence_001"],
      },
      {
        chainId: "forensic_chain_wave5b_c_001",
        entryId: "finding_001",
        entryType: "FINDING",
        recordedAt: T2,
        sessionId: "wave5b_c_s01",
        sourceArtifact: "tests/live/wave4.live-oversight.live.test.js",
        sourceLocation: "Result",
        payload: {
          summary: "Finding linked to claim and evidence.",
        },
        linkedEntryRefs: ["claim_001", "evidence_001"],
      },
    ],
    ...overrides,
  };
}

function buildWarrantyViews(overrides = {}) {
  return {
    views: [
      {
        operatorKey: "operator_alpha",
        currentLevel: "JOURNEYMAN",
        warrantyState: "HEALTHY",
        hasRecentRegression: false,
        degradationObserved: false,
        outOfBandChangeDetected: false,
        coverageExpired: false,
        evidenceRefs: [],
        rationale: "No warning signals are present; derived warranty state is HEALTHY.",
        evaluatedAt: T2,
      },
      {
        operatorKey: "operator_bravo",
        currentLevel: "APPRENTICE",
        warrantyState: "DEGRADED",
        hasRecentRegression: true,
        degradationObserved: true,
        outOfBandChangeDetected: true,
        coverageExpired: false,
        evidenceRefs: ["forensic_regression_001", "forensic_signal_001"],
        rationale:
          "Degradation is observed with regression or out-of-band change evidence; derived warranty state is DEGRADED.",
        evaluatedAt: T2,
      },
    ],
    ...overrides,
  }.views;
}

function buildTrustStates(overrides = {}) {
  return {
    states: [
      {
        operatorKey: "operator_alpha",
        currentLevel: "JOURNEYMAN",
        levelTransitions: [
          {
            transitionId: "decision_001",
            fromLevel: "APPRENTICE",
            toLevel: "JOURNEYMAN",
            reasonCodes: ["PROMOTION_SIGNAL_TRUE"],
            forensicReferenceIds: ["forensic_promote_001"],
            decidedAt: T1,
          },
        ],
        decisionHistory: [
          {
            decisionId: "decision_001",
            decisionType: "PROMOTION",
            fromLevel: "APPRENTICE",
            toLevel: "JOURNEYMAN",
            reasonCodes: ["PROMOTION_SIGNAL_TRUE"],
            forensicReferenceIds: ["forensic_promote_001"],
            decidedAt: T1,
          },
          {
            decisionId: "decision_002",
            decisionType: "HOLD",
            fromLevel: "JOURNEYMAN",
            toLevel: "JOURNEYMAN",
            reasonCodes: ["NO_SIGNAL"],
            forensicReferenceIds: ["forensic_hold_001"],
            decidedAt: T2,
          },
        ],
        createdAt: T0,
        updatedAt: T2,
      },
      {
        operatorKey: "operator_bravo",
        currentLevel: "APPRENTICE",
        levelTransitions: [],
        decisionHistory: [],
        createdAt: T0,
        updatedAt: T0,
      },
    ],
    ...overrides,
  }.states;
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

test("CompressedHistoryTrustSkills exposes the locked route set", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/chain", "/warranty", "/journeyman"]);
});

test("/chain renders deterministic forensic history view and does not mutate input", () => {
  const skills = new CompressedHistoryTrustSkills();
  const chainView = buildChainView();

  const viewA = skills.renderChain(chainView);
  assert.equal(viewA.route, "/chain");
  assert.equal(viewA.chainId, "forensic_chain_wave5b_c_001");
  assert.equal(viewA.entryCount, 3);
  assert.deepEqual(viewA.entryTypeSummary, {
    CLAIM: 1,
    EVIDENCE: 1,
    GAP: 0,
    FINDING: 1,
    OPERATOR_ACTION: 0,
  });

  viewA.entries[0].payload.summary = "forbidden_mutation";
  viewA.entries[1].linkedEntryRefs.push("forbidden_ref");

  const viewB = skills.renderChain(chainView);
  assert.equal(viewB.entries[0].payload.summary, "Evidence exists for trust posture.");
  assert.deepEqual(viewB.entries[1].linkedEntryRefs, ["evidence_001"]);
  assert.equal(chainView.entries[0].payload.summary, "Evidence exists for trust posture.");
  assert.deepEqual(chainView.entries[1].linkedEntryRefs, ["evidence_001"]);
});

test("/warranty renders read-only warranty posture summary", () => {
  const skills = new CompressedHistoryTrustSkills();
  const view = skills.renderWarranty(buildWarrantyViews());

  assert.equal(view.route, "/warranty");
  assert.equal(view.viewCount, 2);
  assert.deepEqual(view.stateSummary, {
    HEALTHY: 1,
    WATCH: 0,
    DEGRADED: 1,
    EXPIRED: 0,
  });
  assert.equal(view.views[1].operatorKey, "operator_bravo");
  assert.equal(view.views[1].warrantyState, "DEGRADED");
});

test("/journeyman renders read-only persisted trust posture summary", () => {
  const skills = new CompressedHistoryTrustSkills();
  const view = skills.renderJourneyman(buildTrustStates());

  assert.equal(view.route, "/journeyman");
  assert.equal(view.operatorCount, 2);
  assert.deepEqual(view.levelSummary, {
    APPRENTICE: 1,
    JOURNEYMAN: 1,
    FOREMAN: 0,
  });

  const alpha = view.operators.find((entry) => entry.operatorKey === "operator_alpha");
  assert.ok(alpha);
  assert.equal(alpha.currentLevel, "JOURNEYMAN");
  assert.equal(alpha.transitionCount, 1);
  assert.equal(alpha.decisionCount, 2);
  assert.equal(alpha.lastDecisionType, "HOLD");
  assert.equal(alpha.lastDecisionAt, T2);
  assert.deepEqual(alpha.recentForensicReferenceIds, ["forensic_hold_001"]);

  const bravo = view.operators.find((entry) => entry.operatorKey === "operator_bravo");
  assert.ok(bravo);
  assert.equal(bravo.lastDecisionType, null);
  assert.equal(bravo.lastDecisionAt, null);
  assert.deepEqual(bravo.recentForensicReferenceIds, []);
});

test("CompressedHistoryTrustSkills validates /chain chainId consistency", () => {
  const skills = new CompressedHistoryTrustSkills();

  expectValidationError(
    () =>
      skills.renderChain(
        buildChainView({
          entries: [
            {
              chainId: "forensic_chain_other",
              entryId: "evidence_001",
              entryType: "EVIDENCE",
              recordedAt: T0,
              sessionId: "wave5b_c_s01",
              sourceArtifact: "docs/WAVE4_CLOSEOUT.md",
              sourceLocation: "Evidence",
              payload: { summary: "Mismatch" },
              linkedEntryRefs: [],
            },
          ],
        })
      ),
    "INVALID_FIELD",
    "'entries[0].chainId' must match 'chainId'"
  );
});

test("CompressedHistoryTrustSkills validates /journeyman trust level vocabulary", () => {
  const skills = new CompressedHistoryTrustSkills();

  expectValidationError(
    () =>
      skills.renderJourneyman(
        buildTrustStates({
          states: [
            {
              operatorKey: "operator_bad",
              currentLevel: "LEAD",
              levelTransitions: [],
              decisionHistory: [],
              createdAt: T0,
              updatedAt: T0,
            },
          ],
        })
      ),
    "INVALID_FIELD",
    "'currentLevel' must be one of: APPRENTICE, JOURNEYMAN, FOREMAN"
  );
});

test("CompressedHistoryTrustSkills exposes no init/evaluate/write or gamification surfaces", () => {
  const skills = new CompressedHistoryTrustSkills();

  const views = [
    skills.renderChain(buildChainView()),
    skills.renderWarranty(buildWarrantyViews()),
    skills.renderJourneyman(buildTrustStates()),
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

  assert.equal(typeof skills.appendEntry, "undefined");
  assert.equal(typeof skills.evaluateDecision, "undefined");
  assert.equal(typeof skills.readTrustState, "undefined");
  assert.equal(typeof skills.initializeOperator, "undefined");
  assert.equal(typeof skills.recordDecisionOutcome, "undefined");
  assert.equal(typeof skills.persistSkillState, "undefined");
});
