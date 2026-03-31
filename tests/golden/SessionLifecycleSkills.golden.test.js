"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SessionLifecycleSkills,
  SKILL_ROUTES,
} = require("../../src/SessionLifecycleSkills");

const CREATED_AT = "2026-04-02T08:30:00Z";

function buildSessionBrief(overrides = {}) {
  return {
    briefId: "brief_wave5b_a_001",
    toolboxTalk: {
      summary: "Carry-forward review before startup.",
      counts: {
        deferredChangeOrders: 1,
        activeHolds: 2,
      },
      refs: ["change_order:co_100", "hold:hold_200"],
      currentHazards: ["Destructive change path active."],
      activeDeferredChangeOrderSummary: "One deferred change order is active.",
      permitLockoutSummary: "Permit and lockout checks are required.",
      continuityStandingRiskSummary: "Standing risk is stable.",
    },
    ...overrides,
  };
}

function buildSessionReceipt(overrides = {}) {
  return {
    receiptId: "receipt_wave5b_a_001",
    briefRef: "brief_wave5b_a_001",
    outcome: "complete_with_holds",
    signoffRequired: true,
    summary: "Session closed with one active hold and approved drift.",
    holdsRaised: ["hold_200"],
    approvedDrift: ["Add verification checklist item."],
    excludedWork: ["Marketplace packaging."],
    artifactsChanged: ["docs/specs/SESSION_LIFECYCLE_SKILLS.md"],
    createdBy: "ai",
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function buildAsBuiltSummary(overrides = {}) {
  return {
    receiptId: "receipt_wave5b_a_001",
    outcome: "partial",
    signoffRequired: true,
    plannedButIncomplete: ["Implement skill tranche docs."],
    unplannedCompleted: ["Tighten proof wording."],
    holdsRaised: ["hold_200"],
    approvedDrift: ["Tighten proof wording."],
    excludedWork: ["Package/install surfaces."],
    summary: "Session ended partial with approved drift and one hold.",
    ...overrides,
  };
}

function buildWalkEvaluation(overrides = {}) {
  return {
    findings: [
      {
        issueRef: "scope:Task B",
        findingType: "INCOMPLETE",
        severity: "MEDIUM",
        pass: "Completeness",
        summary: "Scoped work is incomplete: 'Task B'.",
        evidenceRefs: ["Task B"],
      },
    ],
    findingSummary: {
      VIOLATION: 0,
      PHANTOM: 0,
      GHOST: 0,
      DRIFT: 0,
      INCOMPLETE: 1,
      PARTIAL_VERIFICATION: 0,
      EVIDENCE_GAP: 0,
    },
    asBuilt: {
      sessionOfRecordRef: "receipt_wave5b_a_001",
      statusCounts: {
        MATCHED: 1,
        MODIFIED: 0,
        ADDED: 0,
        DEFERRED: 1,
        HELD: 0,
      },
    },
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

test("SessionLifecycleSkills exposes the locked route set", () => {
  assert.deepEqual([...SKILL_ROUTES], [
    "/toolbox-talk",
    "/receipt",
    "/as-built",
    "/walk",
  ]);
});

test("/toolbox-talk render is deterministic and does not mutate inputs", () => {
  const skills = new SessionLifecycleSkills();
  const brief = buildSessionBrief();

  const viewA = skills.renderToolboxTalk(brief);
  viewA.counts.deferredChangeOrders = 99;
  viewA.refs.push("forbidden_mutation");

  const viewB = skills.renderToolboxTalk(brief);

  assert.equal(viewB.available, true);
  assert.equal(viewB.briefId, "brief_wave5b_a_001");
  assert.equal(viewB.counts.deferredChangeOrders, 1);
  assert.deepEqual(viewB.refs, ["change_order:co_100", "hold:hold_200"]);
  assert.equal(brief.toolboxTalk.counts.deferredChangeOrders, 1);
  assert.deepEqual(brief.toolboxTalk.refs, ["change_order:co_100", "hold:hold_200"]);
});

test("/toolbox-talk render returns deterministic unavailable view when toolboxTalk is absent", () => {
  const skills = new SessionLifecycleSkills();
  const view = skills.renderToolboxTalk(
    buildSessionBrief({ toolboxTalk: undefined })
  );

  assert.equal(view.available, false);
  assert.equal(view.summary, "No toolbox talk enrichment is present for this brief.");
  assert.deepEqual(view.counts, {});
  assert.deepEqual(view.refs, []);
});

test("/receipt and /as-built render deterministic lifecycle views", () => {
  const skills = new SessionLifecycleSkills();

  const receiptView = skills.renderReceipt(buildSessionReceipt());
  const asBuiltView = skills.renderAsBuilt(buildAsBuiltSummary());

  assert.equal(receiptView.route, "/receipt");
  assert.equal(receiptView.outcome, "complete_with_holds");
  assert.deepEqual(receiptView.holdsRaised, ["hold_200"]);

  assert.equal(asBuiltView.route, "/as-built");
  assert.equal(asBuiltView.outcome, "partial");
  assert.deepEqual(asBuiltView.plannedButIncomplete, ["Implement skill tranche docs."]);
  assert.deepEqual(asBuiltView.unplannedCompleted, ["Tighten proof wording."]);
});

test("/walk render returns deterministic findings and as-built status counts", () => {
  const skills = new SessionLifecycleSkills();

  const walkView = skills.renderWalk(buildWalkEvaluation());

  assert.equal(walkView.route, "/walk");
  assert.equal(walkView.findingCount, 1);
  assert.equal(walkView.findingSummary.INCOMPLETE, 1);
  assert.equal(walkView.sessionOfRecordRef, "receipt_wave5b_a_001");
  assert.equal(walkView.asBuiltStatusCounts.MATCHED, 1);
  assert.equal(walkView.asBuiltStatusCounts.DEFERRED, 1);
});

test("SessionLifecycleSkills validates required walk status counts", () => {
  const skills = new SessionLifecycleSkills();

  expectValidationError(
    () =>
      skills.renderWalk(
        buildWalkEvaluation({
          asBuilt: {
            sessionOfRecordRef: "receipt_wave5b_a_001",
            statusCounts: {
              MATCHED: 1,
              MODIFIED: 0,
              ADDED: 0,
              DEFERRED: 1,
            },
          },
        })
      ),
    "INVALID_FIELD",
    "'asBuilt.statusCounts.HELD' is required"
  );
});

test("SessionLifecycleSkills exposes no persistence or gamification surfaces", () => {
  const skills = new SessionLifecycleSkills();

  const views = [
    skills.renderToolboxTalk(buildSessionBrief()),
    skills.renderReceipt(buildSessionReceipt()),
    skills.renderAsBuilt(buildAsBuiltSummary()),
    skills.renderWalk(buildWalkEvaluation()),
  ];

  const forbiddenFields = [
    "score",
    "points",
    "badge",
    "badges",
    "rank",
    "leaderboard",
    "engagementState",
    "usageAnalytics",
  ];

  for (const view of views) {
    for (const field of forbiddenFields) {
      assert.equal(Object.prototype.hasOwnProperty.call(view, field), false);
    }
  }

  assert.equal(typeof skills.persistSkillState, "undefined");
  assert.equal(typeof skills.createSkillLedger, "undefined");
  assert.equal(typeof skills.saveWalkAssessment, "undefined");
});
