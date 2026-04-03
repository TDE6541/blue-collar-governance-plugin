"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createPermit,
  revokePermit,
} = require("../../src/PermitIssuanceSkill");

function makeState() {
  return {
    activePermits: [],
    chainEntries: [],
    nextChainCounter: 1,
  };
}

function stubAppendChainEntry(state, entry) {
  const counter = state.nextChainCounter || 1;
  state.nextChainCounter = counter + 1;
  const chainEntry = {
    ...entry,
    entryId: `hook_${entry.eventType}_${entry.sessionId}_${String(counter).padStart(4, "0")}`,
    chainId: `hook_chain_${entry.sessionId}`,
    linkedEntryRefs: [],
  };
  state.chainEntries.push(chainEntry);
  return chainEntry;
}

const GRANTED_INPUT = {
  domainId: "pricing_quote_logic",
  sessionId: "session-permit-test",
  operatorDecision: "GRANTED",
  scopeJustification: "Need to update pricing rules",
  riskAssessment: "Low risk, bounded change",
  rollbackPlan: "Revert the file edit",
  createdAt: "2026-04-03T16:10:00Z",
};

test("PermitIssuanceSkill create produces valid permit with GRANTED decision", () => {
  const state = makeState();
  const result = createPermit(GRANTED_INPUT, state, stubAppendChainEntry);

  assert.equal(result.action, "created");
  assert.equal(result.permit.requestedDomains.length, 1);
  assert.equal(result.permit.requestedDomains[0], "pricing_quote_logic");
  assert.equal(result.permit.operatorDecision, "GRANTED");
  assert.equal(result.permit.sessionId, "session-permit-test");
  assert.ok(result.permit.permitId);
  assert.ok(result.permit.chainRef);
  assert.equal(state.activePermits.length, 1);
});

test("PermitIssuanceSkill create produces valid permit with CONDITIONAL decision", () => {
  const state = makeState();
  const result = createPermit(
    {
      ...GRANTED_INPUT,
      operatorDecision: "CONDITIONAL",
      conditions: ["must verify pricing after change"],
    },
    state,
    stubAppendChainEntry
  );

  assert.equal(result.permit.operatorDecision, "CONDITIONAL");
  assert.deepEqual(result.permit.conditions, ["must verify pricing after change"]);
});

test("PermitIssuanceSkill create produces valid permit with DENIED decision", () => {
  const state = makeState();
  const result = createPermit(
    { ...GRANTED_INPUT, operatorDecision: "DENIED" },
    state,
    stubAppendChainEntry
  );

  assert.equal(result.permit.operatorDecision, "DENIED");
});

test("PermitIssuanceSkill create writes permit_created chain entry", () => {
  const state = makeState();
  const result = createPermit(GRANTED_INPUT, state, stubAppendChainEntry);

  assert.ok(result.chainEntryId);
  assert.equal(state.chainEntries.length, 1);
  assert.equal(state.chainEntries[0].entryType, "OPERATOR_ACTION");
  assert.equal(state.chainEntries[0].payload.action, "permit_created");
  assert.equal(state.chainEntries[0].payload.domainId, "pricing_quote_logic");
});

test("PermitIssuanceSkill rejects duplicate active permit for same domain", () => {
  const state = makeState();
  createPermit(GRANTED_INPUT, state, stubAppendChainEntry);

  let error;
  try {
    createPermit(GRANTED_INPUT, state, stubAppendChainEntry);
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);
  assert.equal(error.code, "DUPLICATE_ACTIVE");
  assert.equal(state.activePermits.length, 1);
});

test("PermitIssuanceSkill rejects CONDITIONAL without conditions", () => {
  const state = makeState();

  let error;
  try {
    createPermit(
      { ...GRANTED_INPUT, operatorDecision: "CONDITIONAL" },
      state,
      stubAppendChainEntry
    );
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);
  assert.equal(error.code, "INVALID_FIELD");
});

test("PermitIssuanceSkill revoke removes permit and writes permit_revoked chain entry", () => {
  const state = makeState();
  const created = createPermit(GRANTED_INPUT, state, stubAppendChainEntry);

  const revoked = revokePermit(
    {
      permitId: created.permit.permitId,
      sessionId: "session-permit-test",
      revokedAt: "2026-04-03T16:15:00Z",
    },
    state,
    stubAppendChainEntry
  );

  assert.equal(revoked.action, "revoked");
  assert.equal(revoked.permitId, created.permit.permitId);
  assert.equal(state.activePermits.length, 0);

  const revokeEntry = state.chainEntries.find(
    (e) => e.payload.action === "permit_revoked"
  );
  assert.ok(revokeEntry);
  assert.equal(revokeEntry.entryType, "OPERATOR_ACTION");
});

test("PermitIssuanceSkill revoke fails on non-existent permit", () => {
  const state = makeState();

  let error;
  try {
    revokePermit(
      { permitId: "nonexistent", sessionId: "s1" },
      state,
      stubAppendChainEntry
    );
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);
  assert.equal(error.code, "NOT_FOUND");
});

test("PermitIssuanceSkill create after revoke succeeds for same domain", () => {
  const state = makeState();
  const first = createPermit(GRANTED_INPUT, state, stubAppendChainEntry);
  revokePermit(
    { permitId: first.permit.permitId, sessionId: "session-permit-test" },
    state,
    stubAppendChainEntry
  );
  const second = createPermit(GRANTED_INPUT, state, stubAppendChainEntry);

  assert.equal(second.action, "created");
  assert.equal(state.activePermits.length, 1);
  assert.notEqual(second.permit.permitId, first.permit.permitId);
});

test("PermitIssuanceSkill uses single-domain array in v1", () => {
  const state = makeState();
  const result = createPermit(GRANTED_INPUT, state, stubAppendChainEntry);

  assert.ok(Array.isArray(result.permit.requestedDomains));
  assert.equal(result.permit.requestedDomains.length, 1);
});
