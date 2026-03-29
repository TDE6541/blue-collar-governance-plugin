"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { HoldEngine } = require("../../src/HoldEngine");
const { ConstraintsRegistry } = require("../../src/ConstraintsRegistry");
const { SafetyInterlocks } = require("../../src/SafetyInterlocks");
const { ScopeGuard } = require("../../src/ScopeGuard");
const { SessionBrief } = require("../../src/SessionBrief");
const { SessionReceipt } = require("../../src/SessionReceipt");

const T0 = "2026-03-29T15:00:00Z";
const T1 = "2026-03-29T15:05:00Z";
const T2 = "2026-03-29T15:10:00Z";

function createCleanBriefInput() {
  return {
    briefId: "brief_wave1_live_clean",
    goal: "Run a bounded Wave 1 operator session with no drift.",
    inScope: [
      "Update only approved implementation files.",
      "Close out with clean receipt.",
    ],
    outOfScope: ["Protected file edits", "Wave 2 behavior"],
    protectedAssets: ["README.md", "CLAUDE.md"],
    activeConstraints: ["No out-of-scope edits"],
    hazards: ["Unauthorized work would break trust"],
    riskMode: "guarded",
    expectedOutputs: ["Approved updates", "Clean receipt"],
    truthSources: ["README.md", "docs/specs/WAVE1_TRUST_KERNEL.md"],
    createdBy: "architect",
    createdAt: T0,
  };
}

function createInterventionBriefInput() {
  return {
    briefId: "brief_wave1_live_intervention",
    goal: "Run strict intervention path when protected/out-of-scope work is attempted.",
    inScope: ["Implement approved runtime/test changes only"],
    outOfScope: ["Edit protected canon files without authorization", "Wave 2 behavior"],
    protectedAssets: ["README.md", "CLAUDE.md"],
    activeConstraints: ["Protected assets require explicit approval"],
    hazards: ["Unauthorized protected edits create trust drift"],
    riskMode: "strict",
    expectedOutputs: ["Blocked unsafe attempt", "Stopped receipt with hold trace"],
    truthSources: ["README.md", "docs/specs/SAFETY_INTERLOCKS.md"],
    approvalsNeeded: ["Explicit operator authorization for protected surfaces"],
    createdBy: "architect",
    createdAt: T0,
  };
}

test("Scenario A — clean bounded path", () => {
  const briefEngine = new SessionBrief();
  const constraints = new ConstraintsRegistry();
  const interlocks = new SafetyInterlocks();
  const scopeGuard = new ScopeGuard();
  const holdEngine = new HoldEngine();
  const receiptEngine = new SessionReceipt();

  const brief = briefEngine.createBrief(createCleanBriefInput());
  const readiness = briefEngine.evaluateSessionStartReadiness(brief.briefId);
  assert.equal(readiness.ready, true);
  assert.equal(readiness.summary, "Session brief is explicit and ready for governed start.");

  constraints.createRule({
    ruleId: "rule_clean_scope",
    label: "Stay inside approved session scope",
    instruction: "Do not perform work outside explicitly requested tasks.",
    enforcementClass: "scope_limit",
    severity: "high",
    rationale: "Operator-defined scope must remain explicit.",
    evidence: ["Approved scope is listed in SessionBrief."],
    appliesTo: ["session_scope"],
    createdBy: "architect",
    createdAt: T0,
  });
  constraints.setRuleStatus("rule_clean_scope", "active", { updatedAt: T1 });

  const precedence = constraints.resolvePrecedence(["rule_clean_scope"], {
    protectedTargetInvolved: false,
  });
  assert.equal(precedence.effectiveClass, "scope_limit");

  interlocks.createInterlock({
    interlockId: "interlock_clean_destructive",
    actionCategory: "destructive_change",
    defaultOutcome: "stop",
    requiresExplicitAuthorization: false,
    operatorPrompt: "Destructive changes require stop.",
    rationale: "Destructive operations must never run silently.",
    evidence: ["SafetyInterlocks outcome rules require explicit control."],
    createdBy: "architect",
    createdAt: T0,
  });

  const interlockResult = interlocks.evaluateAction("interlock_clean_destructive", {
    actionCategory: "external_side_effect",
    targets: ["docs/INDEX.md"],
    operatorAuthorized: false,
  });
  assert.equal(interlockResult.triggered, false);
  assert.equal(interlockResult.mayProceed, true);

  assert.deepEqual(holdEngine.listHolds(), []);

  const evaluation = scopeGuard.createEvaluation({
    evaluationId: "scope_clean",
    requestedWork: [
      "Update only approved implementation files.",
      "Close out with clean receipt.",
    ],
    observedWork: [
      "Update only approved implementation files.",
      "Close out with clean receipt.",
    ],
    decision: "approve",
    decisionReason: "Observed work matches requested work without drift.",
    requiresOperatorAction: false,
    evidence: ["No unauthorized work observed."],
    createdBy: "ai",
    createdAt: T1,
  });

  assert.deepEqual(evaluation.unauthorizedWork, []);
  assert.deepEqual(evaluation.missingWork, []);
  assert.equal(evaluation.decision, "approve");

  const receipt = receiptEngine.createReceipt({
    receiptId: "receipt_clean",
    briefRef: brief.briefId,
    plannedWork: [...brief.inScope],
    completedWork: [...brief.inScope],
    untouchedWork: [],
    holdsRaised: [],
    approvedDrift: [],
    excludedWork: ["Wave 2 behavior"],
    artifactsChanged: ["src/ScopeGuard.js", "tests/live/wave1.operator-flow.live.test.js"],
    outcome: "complete",
    signoffRequired: true,
    summary: "Clean bounded session completed without intervention.",
    createdBy: "ai",
    createdAt: T2,
  });

  const asBuilt = receiptEngine.summarizeAsBuilt(receipt.receiptId);
  assert.equal(asBuilt.outcome, "complete");
  assert.deepEqual(asBuilt.plannedButIncomplete, []);
  assert.deepEqual(asBuilt.unplannedCompleted, []);
  assert.deepEqual(asBuilt.holdsRaised, []);
});

test("Scenario B — governed intervention path", () => {
  const briefEngine = new SessionBrief();
  const constraints = new ConstraintsRegistry();
  const interlocks = new SafetyInterlocks();
  const scopeGuard = new ScopeGuard();
  const holdEngine = new HoldEngine();
  const receiptEngine = new SessionReceipt();

  const brief = briefEngine.createBrief(createInterventionBriefInput());
  const readiness = briefEngine.evaluateSessionStartReadiness(brief.briefId);
  assert.equal(readiness.ready, true);
  assert.equal(readiness.hasApprovalsNeeded, true);

  constraints.createRule({
    ruleId: "rule_protected_asset",
    label: "Protect canon front door",
    instruction: "Do not edit protected canon assets without explicit authorization.",
    enforcementClass: "protected_asset",
    severity: "critical",
    rationale: "Non-technical operators rely on protected canon truth.",
    evidence: ["README and CLAUDE are sync-blocking surfaces."],
    appliesTo: ["README.md", "CLAUDE.md"],
    createdBy: "architect",
    createdAt: T0,
  });
  constraints.createRule({
    ruleId: "rule_scope_limit",
    label: "Stay within approved task list",
    instruction: "Do not add unauthorized tasks.",
    enforcementClass: "scope_limit",
    severity: "high",
    rationale: "Scope drift must be operator-visible.",
    evidence: ["ScopeGuard requires unauthorized work visibility."],
    appliesTo: ["session_scope"],
    createdBy: "architect",
    createdAt: T0,
  });

  constraints.setRuleStatus("rule_protected_asset", "active", { updatedAt: T1 });
  constraints.setRuleStatus("rule_scope_limit", "active", { updatedAt: T1 });

  const precedence = constraints.resolvePrecedence(
    ["rule_protected_asset", "rule_scope_limit"],
    { protectedTargetInvolved: true }
  );
  assert.equal(precedence.effectiveClass, "protected_asset");

  interlocks.createInterlock({
    interlockId: "interlock_protected_surface",
    actionCategory: "protected_surface_change",
    defaultOutcome: "require_authorization",
    requiresExplicitAuthorization: true,
    protectedTargets: ["README.md", "CLAUDE.md"],
    operatorPrompt: "Protected canon change detected.",
    rationale: "Protected assets require explicit authorization.",
    evidence: ["Safety interlock protected-target behavior is mandatory."],
    createdBy: "architect",
    createdAt: T0,
  });

  const blockedAction = interlocks.evaluateAction("interlock_protected_surface", {
    actionCategory: "protected_surface_change",
    targets: ["README.md"],
    operatorAuthorized: false,
    activeConstraintBlock: precedence.effectiveClass === "protected_asset",
  });

  assert.equal(blockedAction.triggered, true);
  assert.equal(blockedAction.decision, "stop");
  assert.equal(blockedAction.mayProceed, false);
  assert.match(blockedAction.operatorPrompt, /Protected target\(s\): README\.md\./);

  const hold = holdEngine.createHold({
    holdId: "hold_live_001",
    summary: "Blocked protected-surface change requires operator decision",
    blocking: true,
    reason: "Attempted protected README.md change without explicit authorization.",
    evidence: [
      "Constraints precedence resolved to protected_asset.",
      "SafetyInterlocks decision returned stop.",
    ],
    impact: "Proceeding would violate protected canon boundary.",
    options: [
      "Stop and keep protected files unchanged.",
      "Obtain explicit operator authorization.",
    ],
    resolutionPath: "Explicit operator authorization or scope reduction",
    createdBy: "ai",
    createdAt: T1,
  });

  const activeHold = holdEngine.transitionHold(hold.holdId, "active", { updatedAt: T2 });
  assert.equal(activeHold.status, "active");
  assert.equal(activeHold.blocking, true);

  const evaluation = scopeGuard.createEvaluation({
    evaluationId: "scope_intervention",
    requestedWork: ["Implement approved runtime/test updates only."],
    observedWork: [
      "Implement approved runtime/test updates only.",
      "Attempt protected README.md edit without approval.",
    ],
    decision: "reject",
    decisionReason: "Unauthorized protected edit attempt requires governed stop.",
    requiresOperatorAction: true,
    evidence: [
      "ScopeGuard detected unauthorized observed work.",
      "SafetyInterlocks and constraints blocked progression.",
    ],
    createdBy: "ai",
    createdAt: T2,
  });

  assert.deepEqual(evaluation.unauthorizedWork, [
    "Attempt protected README.md edit without approval.",
  ]);
  assert.equal(evaluation.decision, "reject");

  const receipt = receiptEngine.createReceipt({
    receiptId: "receipt_intervention",
    briefRef: brief.briefId,
    plannedWork: ["Implement approved runtime/test updates only."],
    completedWork: ["Started governed session under strict mode."],
    untouchedWork: ["Implement approved runtime/test updates only."],
    holdsRaised: [hold.holdId],
    approvedDrift: [],
    excludedWork: ["Attempt protected README.md edit without approval."],
    artifactsChanged: ["tests/live/wave1.operator-flow.live.test.js"],
    outcome: "stopped",
    signoffRequired: true,
    summary: "Session stopped after protected/out-of-scope attempt; hold and exclusions recorded.",
    createdBy: "ai",
    createdAt: T2,
  });

  const asBuilt = receiptEngine.summarizeAsBuilt(receipt.receiptId);
  assert.equal(asBuilt.outcome, "stopped");
  assert.deepEqual(asBuilt.holdsRaised, [hold.holdId]);
  assert.deepEqual(asBuilt.excludedWork, [
    "Attempt protected README.md edit without approval.",
  ]);
  assert.deepEqual(asBuilt.plannedButIncomplete, []);
  assert.deepEqual(asBuilt.unplannedCompleted, [
    "Started governed session under strict mode.",
  ]);
});
