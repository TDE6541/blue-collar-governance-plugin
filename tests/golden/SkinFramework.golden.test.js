"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SkinFramework,
  SUPPORTED_SKINS,
  DEFAULT_SKIN_ID,
  ROUTE_SUPPORT_MATRIX,
} = require("../../src/SkinFramework");
const { SessionLifecycleSkills } = require("../../src/SessionLifecycleSkills");
const { ChangeOrderSkill } = require("../../src/ChangeOrderSkill");

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

function buildChangeOrderRecord(overrides = {}) {
  return {
    changeOrderId: "co_001",
    status: "DEFERRED",
    decisionReason: "Awaiting operator decision.",
    decisionBy: "ai",
    decidedAt: "2026-03-31T02:10:00Z",
    sourceRefs: ["session_brief:wave4_s01", "callout:callout_drift_001"],
    evidenceRefs: ["chain:buddy_chain_wave4_s01_001", "receipt:wave4_s01"],
    ...overrides,
  };
}

function expectValidationError(action, code, message) {
  let error;

  try {
    action();
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

function buildToolboxTalkView() {
  const skills = new SessionLifecycleSkills();
  return skills.renderToolboxTalk(buildSessionBrief());
}

function buildReceiptView() {
  const skills = new SessionLifecycleSkills();
  return skills.renderReceipt(buildSessionReceipt());
}

function buildAsBuiltView() {
  const skills = new SessionLifecycleSkills();
  return skills.renderAsBuilt(buildAsBuiltSummary());
}

function buildWalkView() {
  const skills = new SessionLifecycleSkills();
  return skills.renderWalk(buildWalkEvaluation());
}

function buildChangeOrderView() {
  const skill = new ChangeOrderSkill();
  return skill.renderChangeOrder({
    changeOrders: [buildChangeOrderRecord()],
  });
}

test("SkinFramework exposes the locked tranche 1 skin ids and support matrix", () => {
  assert.deepEqual(SUPPORTED_SKINS, [
    "whiteboard",
    "punch-list",
    "inspection-report",
  ]);
  assert.equal(DEFAULT_SKIN_ID, "whiteboard");
  assert.deepEqual(ROUTE_SUPPORT_MATRIX, {
    whiteboard: ["/toolbox-talk", "/receipt", "/as-built", "/walk"],
    "punch-list": ["/toolbox-talk", "/receipt", "/as-built", "/walk"],
    "inspection-report": ["/receipt", "/as-built", "/walk"],
  });
});

test("SkinFramework defaults to Whiteboard for supported routes and preserves raw views underneath", () => {
  const framework = new SkinFramework();
  const rawView = buildToolboxTalkView();
  const snapshot = JSON.parse(JSON.stringify(rawView));

  const skinned = framework.render(rawView);
  skinned.rawView.refs.push("forbidden_mutation");
  skinned.presentation.sections[0].lines.push("forbidden_presentation_mutation");

  const rerendered = framework.render(rawView);

  assert.deepEqual(rawView, snapshot);
  assert.equal(rerendered.route, "/toolbox-talk");
  assert.equal(rerendered.requestedSkinId, "whiteboard");
  assert.equal(rerendered.appliedSkinId, "whiteboard");
  assert.equal(rerendered.supported, true);
  assert.equal(rerendered.fallbackMode, "none");
  assert.equal(rerendered.presentation.skinLabel, "Whiteboard");
  assert.equal(rerendered.presentation.sections[0].heading, "Board Summary");
  assert.equal(rerendered.rawView.refs.includes("forbidden_mutation"), false);
  assert.equal(
    rerendered.presentation.sections[0].lines.includes("forbidden_presentation_mutation"),
    false
  );
});

test("SkinFramework renders Punch List with closeout and signoff framing", () => {
  const framework = new SkinFramework();
  const skinned = framework.render(buildReceiptView(), { skinId: "punch-list" });

  assert.deepEqual(Object.keys(skinned).sort(), [
    "appliedSkinId",
    "fallbackMode",
    "presentation",
    "rawView",
    "renderNote",
    "requestedSkinId",
    "route",
    "supported",
  ]);
  assert.equal(skinned.route, "/receipt");
  assert.equal(skinned.supported, true);
  assert.equal(skinned.appliedSkinId, "punch-list");
  assert.equal(skinned.presentation.skinLabel, "Punch List");
  assert.deepEqual(
    skinned.presentation.sections.map((section) => section.heading),
    ["Closeout Status", "Punch Items", "Signoff Record"]
  );
});

test("SkinFramework renders Inspection Report only on supported tranche 1 routes", () => {
  const framework = new SkinFramework();
  const skinned = framework.render(buildWalkView(), { skinId: "inspection-report" });

  assert.equal(skinned.route, "/walk");
  assert.equal(skinned.supported, true);
  assert.equal(skinned.appliedSkinId, "inspection-report");
  assert.equal(skinned.presentation.skinLabel, "Inspection Report");
  assert.deepEqual(
    skinned.presentation.sections.map((section) => section.heading),
    [
      "Observation Summary",
      "Evaluation Totals",
      "Observations",
      "Corrections Required",
    ]
  );
});

test("SkinFramework fails closed to raw canonical render for unsupported Inspection Report /toolbox-talk", () => {
  const framework = new SkinFramework();
  const rawView = buildToolboxTalkView();
  const skinned = framework.render(rawView, { skinId: "inspection-report" });

  assert.equal(skinned.route, "/toolbox-talk");
  assert.equal(skinned.requestedSkinId, "inspection-report");
  assert.equal(skinned.appliedSkinId, null);
  assert.equal(skinned.supported, false);
  assert.equal(skinned.fallbackMode, "raw_canonical_view");
  assert.equal(skinned.presentation, null);
  assert.deepEqual(skinned.rawView, rawView);
  assert.equal(
    skinned.renderNote,
    "skin 'inspection-report' does not support route '/toolbox-talk'; returning raw canonical view"
  );
});

test("SkinFramework fails closed to raw canonical render for unsupported routes even with default Whiteboard", () => {
  const framework = new SkinFramework();
  const rawView = buildChangeOrderView();
  const skinned = framework.render(rawView);

  assert.equal(skinned.route, "/change-order");
  assert.equal(skinned.requestedSkinId, "whiteboard");
  assert.equal(skinned.appliedSkinId, null);
  assert.equal(skinned.supported, false);
  assert.equal(skinned.fallbackMode, "raw_canonical_view");
  assert.equal(skinned.presentation, null);
  assert.deepEqual(skinned.rawView, rawView);
});

test("SkinFramework keeps Whiteboard, Punch List, and Inspection Report structurally distinct", () => {
  const framework = new SkinFramework();
  const receiptView = buildReceiptView();

  const whiteboard = framework.render(receiptView, { skinId: "whiteboard" });
  const punchList = framework.render(receiptView, { skinId: "punch-list" });
  const inspection = framework.render(receiptView, { skinId: "inspection-report" });

  assert.notDeepEqual(
    whiteboard.presentation.sections.map((section) => section.heading),
    punchList.presentation.sections.map((section) => section.heading)
  );
  assert.notDeepEqual(
    punchList.presentation.sections.map((section) => section.heading),
    inspection.presentation.sections.map((section) => section.heading)
  );
  assert.notDeepEqual(
    whiteboard.presentation.sections.map((section) => section.heading),
    inspection.presentation.sections.map((section) => section.heading)
  );
});

test("SkinFramework does not introduce fake fields or widen raw route outputs", () => {
  const framework = new SkinFramework();
  const rawView = buildAsBuiltView();
  const skinned = framework.render(rawView, { skinId: "inspection-report" });

  const forbiddenFields = [
    "score",
    "points",
    "badge",
    "badges",
    "rank",
    "leaderboard",
    "skinStatus",
    "evaluationColor",
    "syntheticSeverity",
  ];

  for (const field of forbiddenFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(skinned, field), false);
    assert.equal(Object.prototype.hasOwnProperty.call(skinned.rawView, field), false);
    assert.equal(Object.prototype.hasOwnProperty.call(skinned.presentation, field), false);
  }

  assert.deepEqual(Object.keys(skinned.rawView).sort(), [
    "approvedDrift",
    "excludedWork",
    "holdsRaised",
    "outcome",
    "plannedButIncomplete",
    "receiptId",
    "route",
    "signoffRequired",
    "summary",
    "unplannedCompleted",
  ]);
});

test("SkinFramework validates inputs and keeps a render-only method surface", () => {
  const framework = new SkinFramework();

  expectValidationError(() => framework.render(null), "ERR_INVALID_INPUT", "'rawView' must be an object");
  expectValidationError(
    () => framework.render({}),
    "ERR_INVALID_INPUT",
    "'rawView.route' must be a non-empty string"
  );
  expectValidationError(
    () => framework.render(buildReceiptView(), { skinId: "military-brief" }),
    "ERR_INVALID_INPUT",
    "'options.skinId' must be one of whiteboard, punch-list, inspection-report"
  );

  const methodNames = Object.getOwnPropertyNames(SkinFramework.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "render"]);
  assert.equal(typeof framework.persistSkinState, "undefined");
});
