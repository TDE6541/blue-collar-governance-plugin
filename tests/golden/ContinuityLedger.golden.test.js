"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { ContinuityLedger } = require("../../src/ContinuityLedger");

const T0 = "2026-03-29T18:00:00Z";
const T1 = "2026-03-29T18:10:00Z";
const T2 = "2026-03-29T18:20:00Z";

function buildEntry(overrides = {}) {
  return {
    entryId: "continuity_hold_001",
    entryType: "hold",
    summary: "Protected change remains blocked pending explicit authorization.",
    originSessionId: "wave2_s01",
    lastSeenSessionId: "wave2_s01",
    sourceRefs: ["hold_live_001", "receipt_intervention"],
    evidenceRefs: ["tests/live/wave1.operator-flow.live.test.js"],
    createdBy: "ai",
    createdAt: T0,
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

test("ContinuityLedger.upsertEntry persists qualifying unresolved entries and ages by session/carry count", () => {
  const ledger = new ContinuityLedger();

  const initial = ledger.upsertEntry(buildEntry());
  assert.equal(initial.sessionCount, 1);
  assert.equal(initial.carryCount, 0);

  const carried = ledger.upsertEntry(
    buildEntry({
      lastSeenSessionId: "wave2_s02",
      createdAt: T1,
      updatedAt: T1,
      evidenceRefs: ["tests/live/wave1.operator-flow.live.test.js", "hold_live_001"],
    })
  );

  assert.equal(carried.sessionCount, 2);
  assert.equal(carried.carryCount, 1);
  assert.equal(carried.lastSeenSessionId, "wave2_s02");
  assert.deepEqual(carried.sourceRefs, ["hold_live_001", "receipt_intervention"]);
  assert.deepEqual(carried.evidenceRefs, [
    "tests/live/wave1.operator-flow.live.test.js",
    "hold_live_001",
  ]);
});

test("ContinuityLedger rejects non-qualifying exclusions and does not persist them", () => {
  const ledger = new ContinuityLedger();

  expectValidationError(
    () =>
      ledger.upsertEntry(
        buildEntry({
          entryId: "continuity_skip_001",
          exclusionReason: "dismissed_false_positive",
        })
      ),
    "NON_QUALIFYING_ENTRY",
    "'dismissed_false_positive' entries must not persist in continuity"
  );

  expectValidationError(
    () =>
      ledger.upsertEntry(
        buildEntry({
          entryId: "continuity_skip_002",
          exclusionReason: "dismissed_false_positive",
        })
      ),
    "NON_QUALIFYING_ENTRY",
    "'dismissed_false_positive' entries must not persist in continuity"
  );

  assert.equal(ledger.listCarryForwardEntries().length, 0);
});

test("ContinuityLedger enforces blocked operation relevance gates", () => {
  const ledger = new ContinuityLedger();

  expectValidationError(
    () =>
      ledger.upsertEntry(
        buildEntry({
          entryId: "continuity_blocked_001",
          entryType: "blocked_operation",
          stillRelevant: true,
        })
      ),
    "INVALID_FIELD",
    "'operationClass' must be 'protected' or 'destructive' for blocked_operation entries"
  );

  const blocked = ledger.upsertEntry(
    buildEntry({
      entryId: "continuity_blocked_002",
      entryType: "blocked_operation",
      operationClass: "protected",
      stillRelevant: true,
    })
  );

  assert.equal(blocked.entryType, "blocked_operation");
  assert.equal(blocked.operationClass, "protected");
});

test("ContinuityLedger operator outcomes are constrained and stop carry-forward eligibility", () => {
  const ledger = new ContinuityLedger();
  ledger.upsertEntry(buildEntry({ entryId: "continuity_hold_002" }));

  expectValidationError(
    () => ledger.recordOperatorOutcome("continuity_hold_002", "accept", { updatedAt: T1 }),
    "INVALID_OUTCOME",
    "'outcome' must be one of: resolve, dismiss, explicitly_accept"
  );

  const resolved = ledger.recordOperatorOutcome("continuity_hold_002", "resolve", {
    updatedAt: T2,
    resolvedAt: T2,
  });

  assert.equal(resolved.operatorOutcome, "resolve");
  assert.equal(ledger.listCarryForwardEntries().length, 0);
});

test("ContinuityLedger rejects junk-drawer leakage fields", () => {
  const ledger = new ContinuityLedger();

  expectValidationError(
    () =>
      ledger.upsertEntry(
        buildEntry({
          entryId: "continuity_junk_001",
          standingRiskScore: 0.91,
        })
      ),
    "INVALID_FIELD",
    "'standingRiskScore' is not allowed in ContinuityLedger entries"
  );

  expectValidationError(
    () =>
      ledger.upsertEntry(
        buildEntry({
          entryId: "continuity_junk_002",
          boardGroup: "open-items-column-a",
        })
      ),
    "INVALID_FIELD",
    "'boardGroup' is not allowed in ContinuityLedger entries"
  );

  expectValidationError(
    () =>
      ledger.upsertEntry(
        buildEntry({
          entryId: "continuity_junk_003",
          exclusionReason: "rejected_unauthorized_change",
        })
      ),
    "NON_QUALIFYING_ENTRY",
    "'rejected_unauthorized_change' entries must not persist in continuity"
  );
});
