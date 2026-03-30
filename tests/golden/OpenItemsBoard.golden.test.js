"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  OpenItemsBoard,
  BOARD_LABEL,
  GROUP_LABELS,
  GROUP_PRECEDENCE,
} = require("../../src/OpenItemsBoard");

function buildOmissionFinding(overrides = {}) {
  return {
    findingId: "omit_001",
    summary: "Quote change output is missing from session artifacts.",
    missingItemCode: "MISSING_QUOTE_CHANGE_ARTIFACT",
    profilePack: "pricing_quote_change",
    sourceRefs: ["receipt_wave2_s20"],
    evidenceRefs: ["verification_wave2_s20"],
    ...overrides,
  };
}

function buildContinuityEntry(overrides = {}) {
  return {
    entryId: "entry_001",
    summary: "Protected operation remains unresolved.",
    sourceRefs: ["continuity_entry_001"],
    evidenceRefs: ["receipt_wave2_s20"],
    ...overrides,
  };
}

function buildStandingItem(overrides = {}) {
  return {
    entryId: "entry_001",
    state: "OPEN",
    evidenceRefs: ["standing_eval_wave2_s20"],
    ...overrides,
  };
}

function buildResolvedOutcome(overrides = {}) {
  return {
    entryId: "entry_003",
    summary: "Operator resolved blocked operation this session.",
    outcome: "resolve",
    sourceRefs: ["receipt_wave2_s20"],
    evidenceRefs: ["resolution_note_wave2_s20"],
    ...overrides,
  };
}

function buildInput(overrides = {}) {
  return {
    sessionId: "wave2_s20",
    omissionFindings: [buildOmissionFinding()],
    continuityEntries: [
      buildContinuityEntry({ entryId: "entry_001" }),
      buildContinuityEntry({
        entryId: "entry_002",
        summary: "Long-carry unresolved risk item.",
      }),
    ],
    standingRiskView: [
      buildStandingItem({ entryId: "entry_001", state: "OPEN" }),
      buildStandingItem({ entryId: "entry_002", state: "STANDING" }),
    ],
    currentSessionResolvedOutcomes: [buildResolvedOutcome()],
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

test("OpenItemsBoard produces one board with exactly four fixed groups", () => {
  const board = new OpenItemsBoard().projectBoard(buildInput());

  assert.equal(board.boardLabel, BOARD_LABEL);
  assert.equal(board.sessionId, "wave2_s20");
  assert.deepEqual(board.precedence, [...GROUP_PRECEDENCE]);
  assert.deepEqual(Object.keys(board.groups), [
    GROUP_LABELS.MISSING_NOW,
    GROUP_LABELS.STILL_UNRESOLVED,
    GROUP_LABELS.AGING_INTO_RISK,
    GROUP_LABELS.RESOLVED_THIS_SESSION,
  ]);
});

test("Missing now sources only current-session omission findings", () => {
  const board = new OpenItemsBoard().projectBoard(buildInput());

  assert.equal(board.groups[GROUP_LABELS.MISSING_NOW].length, 1);
  assert.equal(board.groups[GROUP_LABELS.MISSING_NOW][0].itemId, "omit_001");
  assert.equal(
    board.groups[GROUP_LABELS.MISSING_NOW][0].missingItemCode,
    "MISSING_QUOTE_CHANGE_ARTIFACT"
  );
});

test("Still unresolved sources only OPEN/CARRIED standing states", () => {
  const board = new OpenItemsBoard().projectBoard(buildInput({
    standingRiskView: [
      buildStandingItem({ entryId: "entry_001", state: "OPEN" }),
      buildStandingItem({ entryId: "entry_004", state: "CARRIED" }),
      buildStandingItem({ entryId: "entry_002", state: "STANDING" }),
    ],
    continuityEntries: [
      buildContinuityEntry({ entryId: "entry_001" }),
      buildContinuityEntry({ entryId: "entry_002" }),
      buildContinuityEntry({ entryId: "entry_004" }),
    ],
  }));

  const still = board.groups[GROUP_LABELS.STILL_UNRESOLVED];
  assert.deepEqual(
    still.map((item) => item.itemId),
    ["entry_001", "entry_004"]
  );
  assert.deepEqual(
    still.map((item) => item.stateLabel),
    ["OPEN", "CARRIED"]
  );
});

test("Aging into risk sources only STANDING states", () => {
  const board = new OpenItemsBoard().projectBoard(buildInput());

  const aging = board.groups[GROUP_LABELS.AGING_INTO_RISK];
  assert.equal(aging.length, 1);
  assert.equal(aging[0].itemId, "entry_002");
  assert.equal(aging[0].stateLabel, "STANDING");
});

test("Resolved this session sources only explicit currentSessionResolvedOutcomes input", () => {
  const board = new OpenItemsBoard().projectBoard(buildInput({
    standingRiskView: [buildStandingItem({ entryId: "entry_003", state: "RESOLVED" })],
    continuityEntries: [buildContinuityEntry({ entryId: "entry_003" })],
    currentSessionResolvedOutcomes: [buildResolvedOutcome({ entryId: "entry_003" })],
    omissionFindings: [],
  }));

  assert.equal(board.groups[GROUP_LABELS.RESOLVED_THIS_SESSION].length, 1);
  assert.equal(
    board.groups[GROUP_LABELS.RESOLVED_THIS_SESSION][0].itemId,
    "entry_003"
  );
  assert.equal(board.groups[GROUP_LABELS.STILL_UNRESOLVED].length, 0);
  assert.equal(board.groups[GROUP_LABELS.AGING_INTO_RISK].length, 0);
});

test("Precedence + dedupe suppresses duplicate lower-group placement", () => {
  const board = new OpenItemsBoard().projectBoard(buildInput({
    omissionFindings: [
      buildOmissionFinding({
        findingId: "omit_entry_001",
        entryId: "entry_001",
        summary: "Entry 001 is missing expected output.",
      }),
    ],
    continuityEntries: [buildContinuityEntry({ entryId: "entry_001" })],
    standingRiskView: [buildStandingItem({ entryId: "entry_001", state: "STANDING" })],
    currentSessionResolvedOutcomes: [
      buildResolvedOutcome({
        entryId: "entry_001",
        summary: "Entry 001 was resolved this session.",
      }),
    ],
  }));

  assert.equal(board.groups[GROUP_LABELS.RESOLVED_THIS_SESSION].length, 1);
  assert.equal(board.groups[GROUP_LABELS.AGING_INTO_RISK].length, 0);
  assert.equal(board.groups[GROUP_LABELS.STILL_UNRESOLVED].length, 0);
  assert.equal(board.groups[GROUP_LABELS.MISSING_NOW].length, 0);
});

test("Negative control: no omission findings means no false Missing now", () => {
  const board = new OpenItemsBoard().projectBoard(
    buildInput({ omissionFindings: [] })
  );

  assert.equal(board.groups[GROUP_LABELS.MISSING_NOW].length, 0);
});

test("Negative control: unrelated continuity items do not appear under Aging into risk", () => {
  const board = new OpenItemsBoard().projectBoard(
    buildInput({
      standingRiskView: [
        buildStandingItem({ entryId: "entry_001", state: "OPEN" }),
      ],
      continuityEntries: [buildContinuityEntry({ entryId: "entry_001" })],
      omissionFindings: [],
      currentSessionResolvedOutcomes: [],
    })
  );

  assert.equal(board.groups[GROUP_LABELS.AGING_INTO_RISK].length, 0);
});

test("Negative control: non-standing items do not appear as standing", () => {
  const board = new OpenItemsBoard().projectBoard(
    buildInput({
      standingRiskView: [buildStandingItem({ entryId: "entry_001", state: "CARRIED" })],
      continuityEntries: [buildContinuityEntry({ entryId: "entry_001" })],
      omissionFindings: [],
      currentSessionResolvedOutcomes: [],
    })
  );

  assert.equal(board.groups[GROUP_LABELS.AGING_INTO_RISK].length, 0);
  assert.equal(board.groups[GROUP_LABELS.STILL_UNRESOLVED].length, 1);
});

test("Negative control: terminal standing states do not auto-populate resolved group", () => {
  const board = new OpenItemsBoard().projectBoard(
    buildInput({
      standingRiskView: [buildStandingItem({ entryId: "entry_009", state: "RESOLVED" })],
      continuityEntries: [buildContinuityEntry({ entryId: "entry_009" })],
      currentSessionResolvedOutcomes: [],
      omissionFindings: [],
    })
  );

  assert.equal(board.groups[GROUP_LABELS.RESOLVED_THIS_SESSION].length, 0);
  assert.equal(board.groups[GROUP_LABELS.STILL_UNRESOLVED].length, 0);
  assert.equal(board.groups[GROUP_LABELS.AGING_INTO_RISK].length, 0);
});

test("Negative control: clean session produces empty groups where sources are empty", () => {
  const board = new OpenItemsBoard().projectBoard({
    sessionId: "wave2_s21",
    omissionFindings: [],
    continuityEntries: [],
    standingRiskView: [],
    currentSessionResolvedOutcomes: [],
  });

  assert.equal(board.groups[GROUP_LABELS.MISSING_NOW].length, 0);
  assert.equal(board.groups[GROUP_LABELS.STILL_UNRESOLVED].length, 0);
  assert.equal(board.groups[GROUP_LABELS.AGING_INTO_RISK].length, 0);
  assert.equal(board.groups[GROUP_LABELS.RESOLVED_THIS_SESSION].length, 0);
});

test("Negative control: output contains no score/confidence/rank/priority/anomaly/prediction fields", () => {
  const board = new OpenItemsBoard().projectBoard(buildInput());
  const allItems = [
    ...board.groups[GROUP_LABELS.MISSING_NOW],
    ...board.groups[GROUP_LABELS.STILL_UNRESOLVED],
    ...board.groups[GROUP_LABELS.AGING_INTO_RISK],
    ...board.groups[GROUP_LABELS.RESOLVED_THIS_SESSION],
  ];

  const forbiddenFields = [
    "score",
    "confidence",
    "rank",
    "priority",
    "anomaly",
    "prediction",
    "smartInsights",
    "strategyHint",
  ];

  for (const item of allItems) {
    for (const field of forbiddenFields) {
      assert.equal(Object.prototype.hasOwnProperty.call(item, field), false);
    }
  }
});

test("Negative control: runtime exposes no persistence/write behavior", () => {
  const board = new OpenItemsBoard();
  const methodNames = Object.getOwnPropertyNames(OpenItemsBoard.prototype).sort();

  assert.deepEqual(methodNames, ["constructor", "projectBoard"]);
  assert.equal(typeof board.persist, "undefined");
  assert.equal(typeof board.upsert, "undefined");
  assert.equal(typeof board.write, "undefined");
});

test("OpenItemsBoard requires explicit currentSessionResolvedOutcomes array", () => {
  const board = new OpenItemsBoard();

  expectValidationError(
    () =>
      board.projectBoard({
        sessionId: "wave2_s20",
        omissionFindings: [],
        continuityEntries: [],
        standingRiskView: [],
      }),
    "INVALID_INPUT",
    "'currentSessionResolvedOutcomes' must be an array"
  );
});

test("OpenItemsBoard validates standing states deterministically", () => {
  const board = new OpenItemsBoard();

  expectValidationError(
    () =>
      board.projectBoard({
        sessionId: "wave2_s20",
        omissionFindings: [],
        continuityEntries: [buildContinuityEntry({ entryId: "entry_001" })],
        standingRiskView: [buildStandingItem({ entryId: "entry_001", state: "UNKNOWN" })],
        currentSessionResolvedOutcomes: [],
      }),
    "INVALID_FIELD",
    "'state' must be one of: OPEN, CARRIED, STANDING, RESOLVED, DISMISSED, EXPLICITLY_ACCEPTED"
  );
});

test("OpenItemsBoard requires matching continuity entries for unresolved/aging standing items", () => {
  const board = new OpenItemsBoard();

  expectValidationError(
    () =>
      board.projectBoard({
        sessionId: "wave2_s20",
        omissionFindings: [],
        continuityEntries: [],
        standingRiskView: [buildStandingItem({ entryId: "entry_missing", state: "OPEN" })],
        currentSessionResolvedOutcomes: [],
      }),
    "MISSING_CONTINUITY_ENTRY",
    "standing-risk entryId 'entry_missing' requires matching continuity entry"
  );
});
