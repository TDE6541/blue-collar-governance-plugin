"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { SessionBrief } = require("../../src/SessionBrief");
const { SessionReceipt } = require("../../src/SessionReceipt");
const { ControlRodMode } = require("../../src/ControlRodMode");
const { ForensicChain } = require("../../src/ForensicChain");
const { BuddySystem } = require("../../src/BuddySystem");
const { ChangeOrderEngine } = require("../../src/ChangeOrderEngine");
const { ForemansWalk } = require("../../src/ForemansWalk");
const { ContinuityLedger } = require("../../src/ContinuityLedger");
const { StandingRiskEngine } = require("../../src/StandingRiskEngine");
const { OpenItemsBoard, GROUP_LABELS } = require("../../src/OpenItemsBoard");

const T0 = "2026-03-30T23:30:00Z";
const T1 = "2026-03-30T23:35:00Z";
const T2 = "2026-03-30T23:40:00Z";
const T3 = "2026-03-30T23:45:00Z";
const T4 = "2026-03-30T23:50:00Z";
const T5 = "2026-03-31T00:00:00Z";

function createBriefInput(overrides = {}) {
  return {
    briefId: overrides.briefId || "brief_wave4_live_001",
    goal: overrides.goal || "Run Wave 4 live oversight integration proof.",
    inScope: overrides.inScope || ["Execute approved Wave 4 flow"],
    outOfScope: overrides.outOfScope || ["Unapproved HARD_STOP actions"],
    protectedAssets: ["README.md", "CLAUDE.md"],
    activeConstraints: ["No out-of-scope edits"],
    hazards: ["Unauthorized HARD_STOP operations"],
    riskMode: "guarded",
    expectedOutputs: ["Live oversight trail", "Receipt"],
    truthSources: ["docs/specs/WAVE4_LIVE_OVERSIGHT.md", "docs/specs/SESSION_BRIEF.md"],
    createdBy: "architect",
    createdAt: T0,
    controlRodProfile: overrides.controlRodProfile || "conservative",
    toolboxTalk: overrides.toolboxTalk,
  };
}

function createReceiptInput(overrides = {}) {
  return {
    receiptId: overrides.receiptId || "receipt_wave4_live_001",
    briefRef: overrides.briefRef || "brief_wave4_live_001",
    plannedWork: overrides.plannedWork || ["Execute approved Wave 4 flow"],
    completedWork: overrides.completedWork || ["Execute approved Wave 4 flow"],
    untouchedWork: overrides.untouchedWork || [],
    holdsRaised: overrides.holdsRaised || [],
    approvedDrift: overrides.approvedDrift || [],
    excludedWork: overrides.excludedWork || ["Unapproved HARD_STOP actions"],
    artifactsChanged: overrides.artifactsChanged || ["tests/live/wave4.live-oversight.live.test.js"],
    outcome: overrides.outcome || "complete",
    signoffRequired: true,
    summary: overrides.summary || "Wave 4 live proof receipt.",
    createdBy: "ai",
    createdAt: overrides.createdAt || T5,
  };
}

test("Wave4 D1 spine: clean buddy session stays clean", () => {
  const chain = new ForensicChain("forensic_chain_wave4_live_clean");
  const buddy = new BuddySystem({
    buddyId: "buddy_wave4_clean",
    sessionId: "wave4_live_clean",
    startedAt: T0,
    chain,
  });

  const briefEngine = new SessionBrief();
  const receiptEngine = new SessionReceipt();
  const walk = new ForemansWalk();

  const brief = briefEngine.createBrief(
    createBriefInput({
      briefId: "brief_wave4_live_clean",
      inScope: ["Execute approved Wave 4 flow"],
      outOfScope: ["Unapproved HARD_STOP actions"],
      controlRodProfile: "balanced",
    })
  );

  const presence = buddy.checkPresence(T1);
  assert.equal(presence.timedOut, false);
  assert.equal(buddy.listCallouts().length, 0);

  const receipt = receiptEngine.createReceipt(
    createReceiptInput({
      receiptId: "receipt_wave4_live_clean",
      briefRef: brief.briefId,
      plannedWork: [...brief.inScope],
      completedWork: [...brief.inScope],
      excludedWork: [...brief.outOfScope],
      summary: "Clean run with buddy active and zero callouts.",
    })
  );

  const review = walk.evaluate({
    sessionBrief: brief,
    sessionReceipt: receipt,
    performedActions: [
      {
        actionId: "clean_1",
        workItem: "Execute approved Wave 4 flow",
        domainId: "documentation_comments",
      },
    ],
    forensicEntries: chain.listEntries(),
  });

  assert.equal(review.findings.length, 0);
});

test("Wave4 D1 spine: drift -> change order outcomes + permit/lockout + dead-man + immutability + foreman agreement", () => {
  const chain = new ForensicChain("forensic_chain_wave4_live_ops");
  const buddy = new BuddySystem({
    buddyId: "buddy_wave4_ops",
    sessionId: "wave4_live_ops",
    startedAt: T0,
    chain,
  });
  const coEngine = new ChangeOrderEngine();
  const controlRod = new ControlRodMode();
  const continuity = new ContinuityLedger();
  const standingRisk = new StandingRiskEngine();
  const board = new OpenItemsBoard();
  const walk = new ForemansWalk();

  const driftCallout = buddy.detectDrift({
    summary: "Out-of-scope schema update requested.",
    detectedAt: T1,
    sourceRefs: ["scope_guard:drift_001"],
    evidenceRefs: ["receipt:wave4_live_ops"],
  });

  const generated = coEngine.createFromDrift({
    changeOrderId: "co_wave4_001",
    sessionId: "wave4_live_ops",
    calloutType: "DRIFT",
    calloutRef: driftCallout.calloutId,
    summary: driftCallout.summary,
    requestedChange: "Allow schema update in approved migration path.",
    scopeBoundary: "database_schema only",
    impactStatement: "Scope drift requires explicit governed decision.",
    sourceRefs: driftCallout.sourceRefs,
    evidenceRefs: driftCallout.evidenceRefs,
    createdBy: "ai",
    createdAt: T1,
  });

  const approved = coEngine.decide("co_wave4_001", {
    status: "APPROVED",
    decisionReason: "Approved bounded schema adjustment.",
    decisionBy: "architect",
    decidedAt: T2,
  });
  assert.equal(approved.executionOutcome.workMayContinue, true);

  coEngine.createFromDrift({
    changeOrderId: "co_wave4_002",
    sessionId: "wave4_live_ops",
    calloutType: "DRIFT",
    calloutRef: driftCallout.calloutId,
    summary: "Second drift candidate.",
    requestedChange: "Expand outside approved migration path.",
    scopeBoundary: "database_schema + unrelated files",
    impactStatement: "Out-of-scope expansion.",
    sourceRefs: driftCallout.sourceRefs,
    evidenceRefs: driftCallout.evidenceRefs,
    createdBy: "ai",
    createdAt: T2,
  });

  const rejected = coEngine.decide("co_wave4_002", {
    status: "REJECTED",
    decisionReason: "Drift exceeds approved boundary.",
    decisionBy: "architect",
    decidedAt: T3,
  });
  assert.equal(rejected.executionOutcome.workMayContinue, false);
  assert.equal(rejected.executionOutcome.driftPathState, "REJECTED_HALT");

  coEngine.createFromDrift({
    changeOrderId: "co_wave4_003",
    sessionId: "wave4_live_ops",
    calloutType: "DRIFT",
    calloutRef: driftCallout.calloutId,
    summary: "Third drift candidate pending review.",
    requestedChange: "Pause pending policy clarification.",
    scopeBoundary: "database_schema only",
    impactStatement: "Needs deferred review.",
    sourceRefs: driftCallout.sourceRefs,
    evidenceRefs: driftCallout.evidenceRefs,
    createdBy: "ai",
    createdAt: T3,
  });

  const deferred = coEngine.decide("co_wave4_003", {
    status: "DEFERRED",
    decisionReason: "Need additional operator review.",
    decisionBy: "architect",
    decidedAt: T4,
  });

  continuity.upsertEntry(deferred.executionOutcome.continuityPromotion);

  const deniedGate = controlRod.evaluateHardStopGate({
    profile: controlRod.resolveProfile("conservative"),
    domainId: "pricing_quote_logic",
    sessionId: "wave4_live_ops",
    evaluatedAt: T3,
    authorization: {
      authorizationId: "loto_001",
      domainId: "pricing_quote_logic",
      authorizedBy: "architect",
      authorizedAt: T1,
      reason: "Permit process required for HARD_STOP domain.",
      scope: { scopeType: "SESSION", sessionId: "wave4_live_ops" },
      chainRef: "chain_loto_001",
    },
    permit: {
      permitId: "permit_001",
      sessionId: "wave4_live_ops",
      requestedDomains: ["pricing_quote_logic"],
      scopeJustification: "Pricing adjustment request.",
      riskAssessment: "High risk.",
      rollbackPlan: "Revert pricing rule.",
      operatorDecision: "DENIED",
      chainRef: "chain_permit_001",
    },
  });

  assert.equal(deniedGate.mayProceed, false);

  const violationCallout = buddy.detectViolation({
    summary: "LOCKOUT violation: denied permit path attempted.",
    detectedAt: T3,
    sourceRefs: ["control_rod:permit_001"],
    evidenceRefs: ["gate:PERMIT_DENIED"],
  });
  assert.equal(violationCallout.urgency, "HALT");

  const conditionalGate = controlRod.evaluateHardStopGate({
    profile: controlRod.resolveProfile("conservative"),
    domainId: "pricing_quote_logic",
    sessionId: "wave4_live_ops",
    evaluatedAt: T4,
    authorization: {
      authorizationId: "loto_002",
      domainId: "pricing_quote_logic",
      authorizedBy: "architect",
      authorizedAt: T1,
      reason: "Conditional permit trial.",
      scope: { scopeType: "SESSION", sessionId: "wave4_live_ops" },
      chainRef: "chain_loto_002",
    },
    permit: {
      permitId: "permit_002",
      sessionId: "wave4_live_ops",
      requestedDomains: ["pricing_quote_logic"],
      scopeJustification: "Bounded pricing test.",
      riskAssessment: "Medium risk.",
      rollbackPlan: "Rollback pricing tweak.",
      operatorDecision: "CONDITIONAL",
      conditions: ["operator-present", "single-file-only"],
      chainRef: "chain_permit_002",
    },
  });

  assert.equal(conditionalGate.mayProceed, true);
  assert.equal(conditionalGate.constrained, true);

  const presenceTimeout = buddy.checkPresence(T5);
  assert.equal(presenceTimeout.timedOut, true);
  assert.equal(presenceTimeout.sessionPaused, true);

  const immutableEntry = chain.getEntry(violationCallout.chainEntryRef);
  assert.ok(immutableEntry);
  assert.throws(
    () => {
      immutableEntry.payload.summary = "mutated";
    },
    TypeError
  );

  const standing = standingRisk.deriveStandingRisk(continuity.listCarryForwardEntries(), {
    evaluationSessionId: "wave4_live_ops",
    continuationSignals: [
      {
        entryId: deferred.executionOutcome.continuityPromotion.entryId,
        relevantWorkContinued: true,
        blastRadiusStillExists: true,
        evidenceRefs: ["signal:wave4_live_ops"],
      },
    ],
  });

  const boardView = board.projectBoard({
    sessionId: "wave4_live_ops",
    omissionFindings: [],
    continuityEntries: continuity.listCarryForwardEntries(),
    standingRiskView: standing,
    currentSessionResolvedOutcomes: [],
  });

  assert.equal(boardView.groups[GROUP_LABELS.STILL_UNRESOLVED].length, 1);

  const briefEngine = new SessionBrief();
  const receiptEngine = new SessionReceipt();

  const brief = briefEngine.createBrief(
    createBriefInput({
      briefId: "brief_wave4_live_ops",
      inScope: ["Execute approved Wave 4 flow"],
      outOfScope: ["Unapproved HARD_STOP actions"],
      controlRodProfile: "conservative",
    })
  );

  const receipt = receiptEngine.createReceipt(
    createReceiptInput({
      receiptId: "receipt_wave4_live_ops",
      briefRef: brief.briefId,
      completedWork: ["Execute approved Wave 4 flow", "Unapproved HARD_STOP actions"],
      holdsRaised: ["hold_wave4_lockout_001"],
      outcome: "complete_with_holds",
      summary: "Session recorded lockout violation and deferred drift.",
    })
  );

  const foremanResult = walk.evaluate({
    sessionBrief: brief,
    sessionReceipt: receipt,
    performedActions: [
      {
        actionId: "a_lockout",
        workItem: "Unapproved HARD_STOP actions",
        domainId: "pricing_quote_logic",
        operationType: "change_rules",
        hardStopAuthorized: false,
      },
    ],
    forensicEntries: chain.listEntries(),
  });

  assert.equal(
    foremanResult.findings.some((finding) => finding.findingType === "VIOLATION"),
    true
  );
  assert.equal(
    buddy.listCallouts().some((callout) => callout.calloutType === "VIOLATION"),
    true
  );
});

test("Wave4 D1 spine: Toolbox Talk surfaces unresolved state at next session start", () => {
  const briefEngine = new SessionBrief();

  const nextBrief = briefEngine.createBrief(
    createBriefInput({
      briefId: "brief_wave4_next",
      toolboxTalk: {
        summary: "Carry-forward review before session start.",
        counts: {
          activeCallouts: 2,
          deferredChangeOrders: 1,
          unresolvedContinuityEntries: 1,
        },
        refs: ["co_wave4_003", "buddy_callout_wave4_live_ops_002"],
        currentHazards: ["Pricing lockout remains constrained."],
        activeDeferredChangeOrderSummary: "One deferred change order remains active for operator review.",
        permitLockoutSummary: "One denied permit, one conditional permit active.",
        continuityStandingRiskSummary: "One unresolved deferred continuity item.",
      },
    })
  );

  assert.ok(nextBrief.toolboxTalk);
  assert.equal(nextBrief.toolboxTalk.summary, "Carry-forward review before session start.");
  assert.equal(nextBrief.toolboxTalk.counts.deferredChangeOrders, 1);
  assert.equal(nextBrief.toolboxTalk.refs.includes("co_wave4_003"), true);
});
