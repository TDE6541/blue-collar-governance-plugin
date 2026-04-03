"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createLotoClearance,
  revokeLotoClearance,
} = require("../../src/LotoClearanceSkill");

function makeState() {
  return {
    activeAuthorizations: [],
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

const SESSION_INPUT = {
  domainId: "pricing_quote_logic",
  operatorName: "test-operator",
  reason: "Need to modify pricing for test",
  sessionId: "session-loto-test",
  scope: { scopeType: "SESSION", sessionId: "session-loto-test" },
  createdAt: "2026-04-03T16:00:00Z",
};

test("LotoClearanceSkill create produces valid clearance with SESSION scope", () => {
  const state = makeState();
  const result = createLotoClearance(SESSION_INPUT, state, stubAppendChainEntry);

  assert.equal(result.action, "created");
  assert.equal(result.clearance.domainId, "pricing_quote_logic");
  assert.equal(result.clearance.authorizedBy, "test-operator");
  assert.equal(result.clearance.scope.scopeType, "SESSION");
  assert.equal(result.clearance.scope.sessionId, "session-loto-test");
  assert.ok(result.clearance.authorizationId);
  assert.ok(result.clearance.chainRef);
  assert.equal(state.activeAuthorizations.length, 1);
});

test("LotoClearanceSkill create produces valid clearance with EXPIRY scope", () => {
  const state = makeState();
  const result = createLotoClearance(
    {
      ...SESSION_INPUT,
      scope: { scopeType: "EXPIRY", expiresAt: "2026-04-04T00:00:00Z" },
    },
    state,
    stubAppendChainEntry
  );

  assert.equal(result.action, "created");
  assert.equal(result.clearance.scope.scopeType, "EXPIRY");
  assert.equal(result.clearance.scope.expiresAt, "2026-04-04T00:00:00Z");
});

test("LotoClearanceSkill create writes authorization_created chain entry", () => {
  const state = makeState();
  const result = createLotoClearance(SESSION_INPUT, state, stubAppendChainEntry);

  assert.ok(result.chainEntryId);
  assert.equal(state.chainEntries.length, 1);
  assert.equal(state.chainEntries[0].entryType, "OPERATOR_ACTION");
  assert.equal(state.chainEntries[0].payload.action, "authorization_created");
  assert.equal(state.chainEntries[0].payload.domainId, "pricing_quote_logic");
});

test("LotoClearanceSkill rejects duplicate active clearance for same domain", () => {
  const state = makeState();
  createLotoClearance(SESSION_INPUT, state, stubAppendChainEntry);

  let error;
  try {
    createLotoClearance(SESSION_INPUT, state, stubAppendChainEntry);
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);
  assert.equal(error.code, "DUPLICATE_ACTIVE");
  assert.equal(state.activeAuthorizations.length, 1);
});

test("LotoClearanceSkill revoke removes clearance and writes authorization_revoked chain entry", () => {
  const state = makeState();
  const created = createLotoClearance(SESSION_INPUT, state, stubAppendChainEntry);

  const revoked = revokeLotoClearance(
    {
      clearanceId: created.clearance.authorizationId,
      sessionId: "session-loto-test",
      revokedAt: "2026-04-03T16:05:00Z",
    },
    state,
    stubAppendChainEntry
  );

  assert.equal(revoked.action, "revoked");
  assert.equal(revoked.clearanceId, created.clearance.authorizationId);
  assert.equal(state.activeAuthorizations.length, 0);

  const revokeEntry = state.chainEntries.find(
    (e) => e.payload.action === "authorization_revoked"
  );
  assert.ok(revokeEntry);
  assert.equal(revokeEntry.entryType, "OPERATOR_ACTION");
});

test("LotoClearanceSkill revoke fails on non-existent clearance", () => {
  const state = makeState();

  let error;
  try {
    revokeLotoClearance(
      { clearanceId: "nonexistent", sessionId: "s1" },
      state,
      stubAppendChainEntry
    );
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);
  assert.equal(error.code, "NOT_FOUND");
});

test("LotoClearanceSkill create after revoke succeeds for same domain", () => {
  const state = makeState();
  const first = createLotoClearance(SESSION_INPUT, state, stubAppendChainEntry);
  revokeLotoClearance(
    { clearanceId: first.clearance.authorizationId, sessionId: "session-loto-test" },
    state,
    stubAppendChainEntry
  );
  const second = createLotoClearance(SESSION_INPUT, state, stubAppendChainEntry);

  assert.equal(second.action, "created");
  assert.equal(state.activeAuthorizations.length, 1);
  assert.notEqual(second.clearance.authorizationId, first.clearance.authorizationId);
});
