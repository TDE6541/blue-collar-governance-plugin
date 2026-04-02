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
const { CompressedIntelligenceSkills } = require("../../src/CompressedIntelligenceSkills");
const { ChangeOrderSkill } = require("../../src/ChangeOrderSkill");
const { ControlRodPostureSkill } = require("../../src/ControlRodPostureSkill");

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

function buildPhantomsWalkEvaluation(overrides = {}) {
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
    ],
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

function buildPhantomsView() {
  const skills = new CompressedIntelligenceSkills();
  return skills.renderPhantoms(buildPhantomsWalkEvaluation());
}

function buildChangeOrderView() {
  const skill = new ChangeOrderSkill();
  return skill.renderChangeOrder({
    changeOrders: [buildChangeOrderRecord()],
  });
}

function buildControlRodsView() {
  const skill = new ControlRodPostureSkill();
  return skill.renderControlRods({
    controlRodProfile: "balanced",
  });
}

test("SkinFramework exposes the locked tranche 1-3 skin ids and support matrix", () => {
  assert.deepEqual(SUPPORTED_SKINS, [
    "whiteboard",
    "punch-list",
    "inspection-report",
    "work-order",
    "dispatch-board",
    "ticket-system",
    "daily-log",
    "repair-order",
    "kitchen-ticket",
  ]);
  assert.equal(DEFAULT_SKIN_ID, "whiteboard");
  assert.deepEqual(ROUTE_SUPPORT_MATRIX, {
    whiteboard: ["/toolbox-talk", "/receipt", "/as-built", "/walk"],
    "punch-list": ["/toolbox-talk", "/receipt", "/as-built", "/walk"],
    "inspection-report": ["/receipt", "/as-built", "/walk"],
    "work-order": ["/toolbox-talk", "/receipt", "/as-built"],
    "dispatch-board": ["/walk", "/phantoms", "/change-order", "/control-rods"],
    "ticket-system": ["/receipt", "/walk", "/phantoms", "/change-order"],
    "daily-log": ["/toolbox-talk", "/receipt", "/as-built", "/walk"],
    "repair-order": ["/receipt", "/as-built"],
    "kitchen-ticket": ["/walk", "/phantoms", "/change-order"],
  });
});

test("SkinFramework defaults to Whiteboard for supported routes and preserves raw views underneath", () => {
  const framework = new SkinFramework();
  const rawView = buildToolboxTalkView();
  const snapshot = structuredClone(rawView);

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

test("SkinFramework renders Work Order on the locked tranche 2 routes", () => {
  const framework = new SkinFramework();
  const cases = [
    {
      rawView: buildToolboxTalkView(),
      route: "/toolbox-talk",
      headings: ["Work Order Header", "Scope Of Work", "Blockers And Do-Not Notes"],
    },
    {
      rawView: buildReceiptView(),
      route: "/receipt",
      headings: [
        "Work Order Header",
        "Scope Of Work",
        "Blockers And Do-Not Notes",
        "Document Record",
      ],
    },
    {
      rawView: buildAsBuiltView(),
      route: "/as-built",
      headings: ["Work Order Header", "Scope Of Work", "Blockers And Do-Not Notes"],
    },
  ];

  for (const { rawView, route, headings } of cases) {
    const snapshot = structuredClone(rawView);
    const skinned = framework.render(rawView, { skinId: "work-order" });

    assert.deepEqual(rawView, snapshot);
    assert.equal(skinned.route, route);
    assert.equal(skinned.supported, true);
    assert.equal(skinned.appliedSkinId, "work-order");
    assert.deepEqual(skinned.rawView, rawView);
    assert.equal(skinned.presentation.skinLabel, "Work Order");
    assert.deepEqual(
      skinned.presentation.sections.map((section) => section.heading),
      headings
    );
  }
});

test("SkinFramework renders Dispatch Board on the locked tranche 2 routes", () => {
  const framework = new SkinFramework();
  const cases = [
    {
      rawView: buildWalkView(),
      route: "/walk",
      headings: ["Board Overview", "Finding Queue", "Status Queue"],
    },
    {
      rawView: buildPhantomsView(),
      route: "/phantoms",
      headings: [
        "Board Overview",
        "Phantom Lane",
        "Ghost Lane",
        "Partial Verification Lane",
      ],
    },
    {
      rawView: buildChangeOrderView(),
      route: "/change-order",
      headings: ["Board Overview", "Deferred Lane", "Approved Lane", "Rejected Lane"],
    },
    {
      rawView: buildControlRodsView(),
      route: "/control-rods",
      headings: ["Board Overview", "Hard Stop Lane", "Supervised Lane", "Full Auto Lane"],
    },
  ];

  for (const { rawView, route, headings } of cases) {
    const snapshot = structuredClone(rawView);
    const skinned = framework.render(rawView, { skinId: "dispatch-board" });

    assert.deepEqual(rawView, snapshot);
    assert.equal(skinned.route, route);
    assert.equal(skinned.supported, true);
    assert.equal(skinned.appliedSkinId, "dispatch-board");
    assert.deepEqual(skinned.rawView, rawView);
    assert.equal(skinned.presentation.skinLabel, "Dispatch Board");
    assert.deepEqual(
      skinned.presentation.sections.map((section) => section.heading),
      headings
    );
  }
});

test("SkinFramework renders Ticket System on the locked tranche 2 routes", () => {
  const framework = new SkinFramework();
  const cases = [
    {
      rawView: buildReceiptView(),
      route: "/receipt",
      headings: ["Ticket Record", "Lifecycle Detail", "Ticket Detail"],
    },
    {
      rawView: buildWalkView(),
      route: "/walk",
      headings: ["Ticket Record", "Lifecycle Detail", "Evidence Detail"],
    },
    {
      rawView: buildPhantomsView(),
      route: "/phantoms",
      headings: ["Ticket Record", "Lifecycle Detail", "Evidence Detail"],
    },
    {
      rawView: buildChangeOrderView(),
      route: "/change-order",
      headings: ["Ticket Record", "Lifecycle Detail", "Evidence Detail"],
    },
  ];

  for (const { rawView, route, headings } of cases) {
    const snapshot = structuredClone(rawView);
    const skinned = framework.render(rawView, { skinId: "ticket-system" });

    assert.deepEqual(rawView, snapshot);
    assert.equal(skinned.route, route);
    assert.equal(skinned.supported, true);
    assert.equal(skinned.appliedSkinId, "ticket-system");
    assert.deepEqual(skinned.rawView, rawView);
    assert.equal(skinned.presentation.skinLabel, "Ticket System");
    assert.deepEqual(
      skinned.presentation.sections.map((section) => section.heading),
      headings
    );
  }
});

test("SkinFramework renders Daily Log on the locked tranche 3 routes", () => {
  const framework = new SkinFramework();
  const cases = [
    {
      rawView: buildToolboxTalkView(),
      route: "/toolbox-talk",
      headings: ["Daily Header", "Work Notes", "Safety And Hazards", "Daily Notes"],
    },
    {
      rawView: buildReceiptView(),
      route: "/receipt",
      headings: ["Daily Header", "Work Notes", "Issues And Delays", "Daily Notes"],
    },
    {
      rawView: buildAsBuiltView(),
      route: "/as-built",
      headings: ["Daily Header", "Work Notes", "Issues And Delays", "Daily Notes"],
    },
    {
      rawView: buildWalkView(),
      route: "/walk",
      headings: ["Daily Header", "Issue Log", "Count Snapshot", "Daily Notes"],
    },
  ];

  for (const { rawView, route, headings } of cases) {
    const snapshot = structuredClone(rawView);
    const skinned = framework.render(rawView, { skinId: "daily-log" });

    assert.deepEqual(rawView, snapshot);
    assert.equal(skinned.route, route);
    assert.equal(skinned.supported, true);
    assert.equal(skinned.appliedSkinId, "daily-log");
    assert.deepEqual(skinned.rawView, rawView);
    assert.equal(skinned.presentation.skinLabel, "Daily Log");
    assert.deepEqual(
      skinned.presentation.sections.map((section) => section.heading),
      headings
    );
  }
});

test("SkinFramework renders Repair Order on the locked tranche 3 routes", () => {
  const framework = new SkinFramework();
  const cases = [
    {
      rawView: buildReceiptView(),
      route: "/receipt",
      headings: ["Reported Condition", "Diagnostic Findings", "Performed Work"],
    },
    {
      rawView: buildAsBuiltView(),
      route: "/as-built",
      headings: [
        "Reported Condition",
        "Diagnostic Findings",
        "Performed Work",
        "Unresolved Exceptions",
      ],
    },
  ];

  for (const { rawView, route, headings } of cases) {
    const snapshot = structuredClone(rawView);
    const skinned = framework.render(rawView, { skinId: "repair-order" });

    assert.deepEqual(rawView, snapshot);
    assert.equal(skinned.route, route);
    assert.equal(skinned.supported, true);
    assert.equal(skinned.appliedSkinId, "repair-order");
    assert.deepEqual(skinned.rawView, rawView);
    assert.equal(skinned.presentation.skinLabel, "Repair Order");
    assert.deepEqual(
      skinned.presentation.sections.map((section) => section.heading),
      headings
    );
  }
});

test("SkinFramework renders Kitchen Ticket on the locked tranche 3 routes", () => {
  const framework = new SkinFramework();
  const cases = [
    {
      rawView: buildWalkView(),
      route: "/walk",
      headings: ["Ticket Rail", "Short Items", "Pass Notes"],
    },
    {
      rawView: buildPhantomsView(),
      route: "/phantoms",
      headings: ["Ticket Rail", "Short Items", "Pass Notes"],
    },
    {
      rawView: buildChangeOrderView(),
      route: "/change-order",
      headings: ["Ticket Rail", "Short Items", "Pass Notes"],
    },
  ];

  for (const { rawView, route, headings } of cases) {
    const snapshot = structuredClone(rawView);
    const skinned = framework.render(rawView, { skinId: "kitchen-ticket" });

    assert.deepEqual(rawView, snapshot);
    assert.equal(skinned.route, route);
    assert.equal(skinned.supported, true);
    assert.equal(skinned.appliedSkinId, "kitchen-ticket");
    assert.deepEqual(skinned.rawView, rawView);
    assert.equal(skinned.presentation.skinLabel, "Kitchen Ticket");
    assert.deepEqual(
      skinned.presentation.sections.map((section) => section.heading),
      headings
    );
  }
});

test("SkinFramework keeps Daily Log, Repair Order, and Kitchen Ticket structurally distinct", () => {
  const framework = new SkinFramework();

  const dailyLog = framework.render(buildReceiptView(), { skinId: "daily-log" });
  const workOrder = framework.render(buildReceiptView(), { skinId: "work-order" });
  const repairOrder = framework.render(buildReceiptView(), { skinId: "repair-order" });
  const ticketReceipt = framework.render(buildReceiptView(), { skinId: "ticket-system" });
  const kitchenTicket = framework.render(buildChangeOrderView(), { skinId: "kitchen-ticket" });
  const ticketChange = framework.render(buildChangeOrderView(), { skinId: "ticket-system" });
  const dispatchChange = framework.render(buildChangeOrderView(), { skinId: "dispatch-board" });

  assert.notDeepEqual(
    dailyLog.presentation.sections.map((section) => section.heading),
    workOrder.presentation.sections.map((section) => section.heading)
  );
  assert.notDeepEqual(
    repairOrder.presentation.sections.map((section) => section.heading),
    ticketReceipt.presentation.sections.map((section) => section.heading)
  );
  assert.notDeepEqual(
    kitchenTicket.presentation.sections.map((section) => section.heading),
    ticketChange.presentation.sections.map((section) => section.heading)
  );
  assert.equal(
    dispatchChange.presentation.sections.some((section) => /Lane/.test(section.heading)),
    true
  );
  assert.equal(
    kitchenTicket.presentation.sections.some((section) => /Lane/.test(section.heading)),
    false
  );
  assert.equal(
    kitchenTicket.presentation.sections.some((section) => /Lifecycle|Evidence Detail/.test(section.heading)),
    false
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

test("SkinFramework fails closed to raw canonical render for unsupported tranche 2-3 combinations", () => {
  const framework = new SkinFramework();
  const cases = [
    { rawView: buildWalkView(), skinId: "work-order", route: "/walk" },
    { rawView: buildReceiptView(), skinId: "dispatch-board", route: "/receipt" },
    { rawView: buildControlRodsView(), skinId: "ticket-system", route: "/control-rods" },
    { rawView: buildPhantomsView(), skinId: "daily-log", route: "/phantoms" },
    { rawView: buildWalkView(), skinId: "repair-order", route: "/walk" },
    { rawView: buildControlRodsView(), skinId: "kitchen-ticket", route: "/control-rods" },
  ];

  for (const { rawView, skinId, route } of cases) {
    const skinned = framework.render(rawView, { skinId });

    assert.equal(skinned.route, route);
    assert.equal(skinned.requestedSkinId, skinId);
    assert.equal(skinned.appliedSkinId, null);
    assert.equal(skinned.supported, false);
    assert.equal(skinned.fallbackMode, "raw_canonical_view");
    assert.equal(skinned.presentation, null);
    assert.deepEqual(skinned.rawView, rawView);
    assert.equal(
      skinned.renderNote,
      `skin '${skinId}' does not support route '${route}'; returning raw canonical view`
    );
  }
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

test("SkinFramework keeps Work Order, Dispatch Board, and Ticket System structurally distinct", () => {
  const framework = new SkinFramework();

  const workOrder = framework.render(buildReceiptView(), { skinId: "work-order" });
  const dispatch = framework.render(buildChangeOrderView(), { skinId: "dispatch-board" });
  const ticketReceipt = framework.render(buildReceiptView(), { skinId: "ticket-system" });
  const ticketChange = framework.render(buildChangeOrderView(), { skinId: "ticket-system" });

  assert.notDeepEqual(
    workOrder.presentation.sections.map((section) => section.heading),
    ticketReceipt.presentation.sections.map((section) => section.heading)
  );
  assert.notDeepEqual(
    dispatch.presentation.sections.map((section) => section.heading),
    ticketChange.presentation.sections.map((section) => section.heading)
  );
  assert.equal(
    dispatch.presentation.sections.some((section) => /Lane/.test(section.heading)),
    true
  );
  assert.equal(
    ticketChange.presentation.sections.some((section) => /Lane/.test(section.heading)),
    false
  );
});

test("SkinFramework does not introduce fake fields or widen raw route outputs across tranche 1-3", () => {
  const framework = new SkinFramework();
  const views = [
    framework.render(buildAsBuiltView(), { skinId: "inspection-report" }),
    framework.render(buildReceiptView(), { skinId: "work-order" }),
    framework.render(buildControlRodsView(), { skinId: "dispatch-board" }),
    framework.render(buildChangeOrderView(), { skinId: "ticket-system" }),
    framework.render(buildWalkView(), { skinId: "daily-log" }),
    framework.render(buildReceiptView(), { skinId: "repair-order" }),
    framework.render(buildChangeOrderView(), { skinId: "kitchen-ticket" }),
  ];

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
    "ageBadge",
    "ageColor",
    "overdueBadge",
    "sla",
    "eta",
    "assignedTech",
    "assignedCrew",
    "duration",
    "laborTotal",
    "laborHours",
    "laborRate",
    "pricing",
    "partsCost",
    "partsInventory",
    "roNumber",
    "approvalSignature",
    "customerApprovalSignature",
    "technicianAssignment",
    "invoiceStatus",
    "checkoutState",
    "gps",
    "fleetTelemetry",
    "dispatchTimestamp",
    "scheduleWindow",
    "prepTimer",
    "stationTimer",
    "stationRoute",
    "bumpState",
    "rushFlag",
    "ticketPriority",
    "incidentRecord",
    "dualSignoff",
    "superintendentReview",
  ];

  for (const skinned of views) {
    for (const field of forbiddenFields) {
      assert.equal(Object.prototype.hasOwnProperty.call(skinned, field), false);
      assert.equal(Object.prototype.hasOwnProperty.call(skinned.rawView, field), false);
      assert.equal(Object.prototype.hasOwnProperty.call(skinned.presentation, field), false);
    }
  }

  assert.deepEqual(Object.keys(views[0].rawView).sort(), [
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
  assert.deepEqual(Object.keys(views[2].rawView).sort(), [
    "domains",
    "profile",
    "route",
    "starterProfileIds",
    "summary",
  ]);
  assert.deepEqual(Object.keys(views[3].rawView).sort(), [
    "changeOrderCount",
    "changeOrders",
    "renderNote",
    "route",
    "snapshotState",
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
    "'options.skinId' must be one of whiteboard, punch-list, inspection-report, work-order, dispatch-board, ticket-system, daily-log, repair-order, kitchen-ticket"
  );

  const methodNames = Object.getOwnPropertyNames(SkinFramework.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "render"]);
  assert.equal(typeof framework.persistSkinState, "undefined");
});
