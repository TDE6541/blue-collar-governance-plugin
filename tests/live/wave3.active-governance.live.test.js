"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { SessionBrief } = require("../../src/SessionBrief");
const { SessionReceipt } = require("../../src/SessionReceipt");
const { ControlRodMode } = require("../../src/ControlRodMode");
const { ForensicChain } = require("../../src/ForensicChain");
const { ForemansWalk } = require("../../src/ForemansWalk");
const { ContinuityLedger } = require("../../src/ContinuityLedger");
const { StandingRiskEngine } = require("../../src/StandingRiskEngine");
const {
  OpenItemsBoard,
  GROUP_LABELS,
} = require("../../src/OpenItemsBoard");

const T0 = "2026-03-30T20:00:00Z";
const T1 = "2026-03-30T20:05:00Z";
const T2 = "2026-03-30T20:10:00Z";
const T3 = "2026-03-30T20:15:00Z";
const T4 = "2026-03-30T20:20:00Z";

function createBriefInput(overrides = {}) {
  const briefId = overrides.briefId || "brief_wave3_d_live";
  const inScope = overrides.inScope || ["Ship approved docs update"];
  const outOfScope = overrides.outOfScope || ["Adjust pricing logic"];

  return {
    briefId,
    goal: overrides.goal || "Run bounded Wave 3 governance session.",
    inScope,
    outOfScope,
    protectedAssets: overrides.protectedAssets || ["README.md", "CLAUDE.md"],
    activeConstraints: overrides.activeConstraints || ["Stay inside approved scope."],
    hazards: overrides.hazards || ["Unauthorized protected work."],
    riskMode: overrides.riskMode || "guarded",
    expectedOutputs: overrides.expectedOutputs || ["Receipt", "Findings"],
    truthSources: overrides.truthSources || ["README.md", "docs/specs/FOREMANS_WALK_ENGINE.md"],
    approvalsNeeded: overrides.approvalsNeeded,
    controlRodProfile: overrides.controlRodProfile,
    createdBy: overrides.createdBy || "architect",
    createdAt: overrides.createdAt || T0,
    notes: overrides.notes,
  };
}

function createReceiptInput(overrides = {}) {
  return {
    receiptId: overrides.receiptId || "receipt_wave3_d_live",
    briefRef: overrides.briefRef || "brief_wave3_d_live",
    plannedWork: overrides.plannedWork || ["Ship approved docs update"],
    completedWork: overrides.completedWork || ["Ship approved docs update"],
    untouchedWork: overrides.untouchedWork || [],
    holdsRaised: overrides.holdsRaised || [],
    approvedDrift: overrides.approvedDrift || [],
    excludedWork: overrides.excludedWork || ["Adjust pricing logic"],
    artifactsChanged:
      overrides.artifactsChanged || ["tests/live/wave3.active-governance.live.test.js"],
    outcome: overrides.outcome || "complete",
    signoffRequired:
      overrides.signoffRequired === undefined ? true : overrides.signoffRequired,
    summary: overrides.summary || "Wave 3 integration proof receipt.",
    createdBy: overrides.createdBy || "ai",
    createdAt: overrides.createdAt || T1,
    notes: overrides.notes,
  };
}

function createForensicEntry(overrides = {}) {
  return {
    entryId: "claim_001",
    entryType: "CLAIM",
    recordedAt: T1,
    sessionId: "wave3_d_live_s01",
    sourceArtifact: "tests/live/wave3.active-governance.live.test.js",
    sourceLocation: "Scenario",
    payload: {
      domainId: "documentation_comments",
      summary: "Claim for integration proof",
    },
    linkedEntryRefs: [],
    ...overrides,
  };
}

function createEngines() {
  return {
    briefEngine: new SessionBrief(),
    receiptEngine: new SessionReceipt(),
    walkEngine: new ForemansWalk(),
    continuityLedger: new ContinuityLedger(),
    standingRiskEngine: new StandingRiskEngine(),
    boardEngine: new OpenItemsBoard(),
  };
}

test("Scenario A — clean bounded path", () => {
  const {
    briefEngine,
    receiptEngine,
    walkEngine,
    continuityLedger,
    standingRiskEngine,
    boardEngine,
  } = createEngines();

  const brief = briefEngine.createBrief(
    createBriefInput({
      briefId: "brief_wave3_d_clean",
      inScope: ["Ship approved docs update", "Record deterministic receipt"],
      outOfScope: ["Adjust pricing logic"],
      controlRodProfile: "balanced",
    })
  );

  const receipt = receiptEngine.createReceipt(
    createReceiptInput({
      receiptId: "receipt_wave3_d_clean",
      briefRef: brief.briefId,
      plannedWork: [...brief.inScope],
      completedWork: [...brief.inScope],
      excludedWork: [...brief.outOfScope],
      outcome: "complete",
      summary: "Clean bounded completion.",
    })
  );

  const chain = new ForensicChain("forensic_chain_wave3_d_clean");
  chain.appendEntry(
    createForensicEntry({
      entryId: "evidence_clean_001",
      entryType: "EVIDENCE",
      recordedAt: T1,
      payload: {
        domainId: "documentation_comments",
        summary: "Receipt artifact confirms scoped completion.",
      },
    })
  );
  chain.appendEntry(
    createForensicEntry({
      entryId: "claim_clean_001",
      entryType: "CLAIM",
      recordedAt: T2,
      payload: {
        domainId: "documentation_comments",
        summary: "Session completed exactly scoped work.",
      },
      linkedEntryRefs: ["evidence_clean_001"],
    })
  );

  const evaluation = walkEngine.evaluate({
    sessionBrief: brief,
    sessionReceipt: receipt,
    performedActions: [
      {
        actionId: "clean_1",
        workItem: "Ship approved docs update",
        domainId: "documentation_comments",
      },
      {
        actionId: "clean_2",
        workItem: "Record deterministic receipt",
        domainId: "documentation_comments",
      },
    ],
    forensicEntries: chain.listEntries(),
  });

  assert.equal(evaluation.findings.length, 0);
  assert.deepEqual(evaluation.asBuilt.statusCounts, {
    MATCHED: 2,
    MODIFIED: 0,
    ADDED: 0,
    DEFERRED: 0,
    HELD: 0,
  });

  assert.deepEqual(continuityLedger.listCarryForwardEntries(), []);

  const standingRisk = standingRiskEngine.deriveStandingRisk([], {
    evaluationSessionId: "wave3_d_live_s01",
    continuationSignals: [],
  });
  assert.deepEqual(standingRisk, []);

  const board = boardEngine.projectBoard({
    sessionId: "wave3_d_live_s01",
    omissionFindings: [],
    continuityEntries: [],
    standingRiskView: standingRisk,
    currentSessionResolvedOutcomes: [],
  });

  assert.equal(board.groups[GROUP_LABELS.MISSING_NOW].length, 0);
  assert.equal(board.groups[GROUP_LABELS.STILL_UNRESOLVED].length, 0);
  assert.equal(board.groups[GROUP_LABELS.AGING_INTO_RISK].length, 0);
  assert.equal(board.groups[GROUP_LABELS.RESOLVED_THIS_SESSION].length, 0);
});

test("Scenario B — governed intervention path", () => {
  const {
    briefEngine,
    receiptEngine,
    walkEngine,
    continuityLedger,
    standingRiskEngine,
    boardEngine,
  } = createEngines();

  const brief = briefEngine.createBrief(
    createBriefInput({
      briefId: "brief_wave3_d_intervention",
      inScope: ["Ship approved docs update"],
      outOfScope: ["Adjust pricing logic"],
      controlRodProfile: "conservative",
      riskMode: "strict",
    })
  );

  const receipt = receiptEngine.createReceipt(
    createReceiptInput({
      receiptId: "receipt_wave3_d_intervention",
      briefRef: brief.briefId,
      plannedWork: [...brief.inScope],
      completedWork: ["Ship approved docs update", "Adjust pricing logic"],
      excludedWork: ["Additional unrequested pricing changes"],
      outcome: "complete_with_holds",
      holdsRaised: ["hold_wave3_d_violation_001"],
      summary: "Intervention path with prohibited pricing action attempt.",
    })
  );

  const chain = new ForensicChain("forensic_chain_wave3_d_intervention");
  chain.appendEntry(
    createForensicEntry({
      entryId: "evidence_intervention_001",
      entryType: "EVIDENCE",
      recordedAt: T1,
      sessionId: "wave3_d_live_s02",
      sourceArtifact: "src/SessionReceipt.js",
      sourceLocation: "receipt_wave3_d_intervention.completedWork",
      payload: {
        domainId: "pricing_quote_logic",
        summary: "Receipt records the pricing-change action.",
      },
    })
  );
  chain.appendEntry(
    createForensicEntry({
      entryId: "claim_intervention_001",
      entryType: "CLAIM",
      recordedAt: T2,
      sessionId: "wave3_d_live_s02",
      payload: {
        domainId: "pricing_quote_logic",
        summary: "Pricing action occurred under conservative rods.",
      },
      linkedEntryRefs: ["evidence_intervention_001"],
    })
  );

  const evaluation = walkEngine.evaluate({
    sessionBrief: brief,
    sessionReceipt: receipt,
    performedActions: [
      {
        actionId: "intervention_1",
        workItem: "Adjust pricing logic",
        domainId: "pricing_quote_logic",
        operationType: "change_rules",
        hardStopAuthorized: false,
      },
    ],
    forensicEntries: chain.listEntries(),
  });

  assert.ok(evaluation.findings.length > 0);
  assert.equal(
    evaluation.findings.some((finding) => finding.findingType === "VIOLATION"),
    true
  );

  const violation = evaluation.findings.find(
    (finding) => finding.findingType === "VIOLATION"
  );
  assert.ok(violation);
  assert.equal(violation.severity, "CRITICAL");

  const promoted = continuityLedger.upsertEntry({
    entryId: "continuity_wave3_d_violation_001",
    entryType: "blocked_operation",
    summary: violation.summary,
    originSessionId: "wave3_d_live_s02",
    lastSeenSessionId: "wave3_d_live_s02",
    sourceRefs: [violation.issueRef, receipt.receiptId],
    evidenceRefs: [
      ...violation.evidenceRefs,
      "claim_intervention_001",
      "evidence_intervention_001",
    ],
    operationClass: "protected",
    stillRelevant: true,
    createdBy: "ai",
    createdAt: T3,
  });

  const standingRisk = standingRiskEngine.deriveStandingRisk(
    continuityLedger.listCarryForwardEntries(),
    {
      evaluationSessionId: "wave3_d_live_s02",
      continuationSignals: [
        {
          entryId: promoted.entryId,
          relevantWorkContinued: true,
          blastRadiusStillExists: true,
          evidenceRefs: ["signal_wave3_d_001"],
        },
      ],
    }
  );

  assert.equal(standingRisk.length, 1);
  assert.equal(standingRisk[0].entryId, promoted.entryId);
  assert.equal(standingRisk[0].state, "OPEN");

  const board = boardEngine.projectBoard({
    sessionId: "wave3_d_live_s02",
    omissionFindings: [],
    continuityEntries: continuityLedger.listCarryForwardEntries(),
    standingRiskView: standingRisk,
    currentSessionResolvedOutcomes: [],
  });

  assert.equal(board.groups[GROUP_LABELS.STILL_UNRESOLVED].length, 1);
  assert.equal(
    board.groups[GROUP_LABELS.STILL_UNRESOLVED][0].itemId,
    "continuity_wave3_d_violation_001"
  );
  assert.equal(board.groups[GROUP_LABELS.MISSING_NOW].length, 0);
  assert.equal(board.groups[GROUP_LABELS.AGING_INTO_RISK].length, 0);
  assert.equal(board.groups[GROUP_LABELS.RESOLVED_THIS_SESSION].length, 0);
});

test("Scenario C — truthfulness and evidence-integrity pressure test", () => {
  const { briefEngine, receiptEngine, walkEngine } = createEngines();

  const mode = new ControlRodMode();
  const brief = briefEngine.createBrief(
    createBriefInput({
      briefId: "brief_wave3_d_truthfulness",
      inScope: ["Verify evidence-linked claim"],
      outOfScope: ["Adjust pricing logic"],
      controlRodProfile: mode.resolveProfile("balanced"),
    })
  );

  const receipt = receiptEngine.createReceipt(
    createReceiptInput({
      receiptId: "receipt_wave3_d_truthfulness",
      briefRef: brief.briefId,
      plannedWork: [...brief.inScope],
      completedWork: [...brief.inScope],
      excludedWork: [...brief.outOfScope],
      outcome: "complete",
      summary: "Truthfulness pressure path.",
    })
  );

  const chain = new ForensicChain("forensic_chain_wave3_d_truthfulness");
  chain.appendEntry(
    createForensicEntry({
      entryId: "evidence_truth_001",
      entryType: "EVIDENCE",
      recordedAt: T1,
      sessionId: "wave3_d_live_s03",
      payload: {
        domainId: "documentation_comments",
        summary: "Receipt subsection references the verified output.",
      },
    })
  );
  chain.appendEntry(
    createForensicEntry({
      entryId: "gap_truth_001",
      entryType: "GAP",
      recordedAt: T2,
      sessionId: "wave3_d_live_s03",
      payload: {
        domainId: "documentation_comments",
        summary: "One supporting screenshot is still pending.",
      },
    })
  );
  chain.appendEntry(
    createForensicEntry({
      entryId: "claim_truth_001",
      entryType: "CLAIM",
      recordedAt: T3,
      sessionId: "wave3_d_live_s03",
      payload: {
        domainId: "documentation_comments",
        summary: "Claim is evidence-backed but still carries one explicit gap.",
      },
      linkedEntryRefs: ["evidence_truth_001", "gap_truth_001"],
    })
  );

  const claimSnapshot = chain.getEntry("claim_truth_001");
  assert.ok(claimSnapshot);

  assert.throws(
    () => {
      claimSnapshot.payload.summary = "mutated";
    },
    TypeError
  );

  assert.throws(
    () => {
      claimSnapshot.linkedEntryRefs.push("evidence_truth_002");
    },
    TypeError
  );

  const evaluation = walkEngine.evaluate({
    sessionBrief: brief,
    sessionReceipt: receipt,
    performedActions: [
      {
        actionId: "truth_1",
        workItem: "Verify evidence-linked claim",
        domainId: "documentation_comments",
      },
    ],
    forensicEntries: chain.listEntries(),
  });

  assert.equal(
    evaluation.findings.some(
      (finding) => finding.findingType === "PARTIAL_VERIFICATION"
    ),
    true
  );
  assert.equal(
    evaluation.findings.some((finding) => finding.findingType === "PHANTOM"),
    false
  );
  assert.equal(
    evaluation.findings.some((finding) => finding.findingType === "EVIDENCE_GAP"),
    false
  );

  const persistedClaim = chain.getEntry("claim_truth_001");
  assert.equal(
    persistedClaim.payload.summary,
    "Claim is evidence-backed but still carries one explicit gap."
  );
  assert.equal(typeof chain.updateEntry, "undefined");
  assert.equal(typeof chain.deleteEntry, "undefined");
});

