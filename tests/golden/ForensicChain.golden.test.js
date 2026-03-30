"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { ForensicChain } = require("../../src/ForensicChain");

const T0 = "2026-03-30T10:00:00Z";
const T1 = "2026-03-30T10:05:00Z";
const T2 = "2026-03-30T10:10:00Z";
const T3 = "2026-03-30T10:15:00Z";
const T4 = "2026-03-30T10:20:00Z";

function buildEntry(overrides = {}) {
  return {
    entryId: "claim_001",
    entryType: "CLAIM",
    recordedAt: T0,
    sessionId: "wave3_s01",
    sourceArtifact: "docs/WAVE2_CLOSEOUT.md",
    sourceLocation: "No-Leakage Confirmation",
    payload: {
      summary: "Continuity remained the only persisted substrate.",
    },
    linkedEntryRefs: [],
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

test("ForensicChain append + deterministic linking across CLAIM/EVIDENCE/GAP/FINDING/OPERATOR_ACTION", () => {
  const chain = new ForensicChain("forensic_chain_wave3_001");

  chain.appendEntry(
    buildEntry({
      entryId: "evidence_001",
      entryType: "EVIDENCE",
      recordedAt: T0,
      payload: { summary: "Receipt line confirms continuity substrate claim." },
      linkedEntryRefs: [],
    })
  );

  chain.appendEntry(
    buildEntry({
      entryId: "gap_001",
      entryType: "GAP",
      recordedAt: T1,
      payload: { summary: "No direct session transcript reference attached yet." },
      linkedEntryRefs: [],
    })
  );

  const claim = chain.appendEntry(
    buildEntry({
      entryId: "claim_001",
      entryType: "CLAIM",
      recordedAt: T2,
      payload: { summary: "Continuity remained the only operational substrate." },
      linkedEntryRefs: ["evidence_001", "gap_001"],
    })
  );

  const finding = chain.appendEntry(
    buildEntry({
      entryId: "finding_001",
      entryType: "FINDING",
      recordedAt: T3,
      payload: { summary: "Claim is supported but still has one explicit gap." },
      linkedEntryRefs: ["claim_001", "evidence_001", "gap_001"],
    })
  );

  const operatorAction = chain.appendEntry(
    buildEntry({
      entryId: "operator_action_001",
      entryType: "OPERATOR_ACTION",
      recordedAt: T4,
      payload: { summary: "Operator approved carry-forward with visible gap trail." },
      linkedEntryRefs: ["finding_001"],
    })
  );

  assert.equal(chain.getChainId(), "forensic_chain_wave3_001");
  assert.equal(claim.chainId, "forensic_chain_wave3_001");
  assert.deepEqual(claim.linkedEntryRefs, ["evidence_001", "gap_001"]);
  assert.deepEqual(finding.linkedEntryRefs, ["claim_001", "evidence_001", "gap_001"]);
  assert.deepEqual(operatorAction.linkedEntryRefs, ["finding_001"]);

  const listedIds = chain.listEntries().map((entry) => entry.entryId);
  assert.deepEqual(listedIds, [
    "evidence_001",
    "gap_001",
    "claim_001",
    "finding_001",
    "operator_action_001",
  ]);
});

test("ForensicChain is append-only and returned entries are immutable snapshots", () => {
  const chain = new ForensicChain("forensic_chain_wave3_immutability");

  chain.appendEntry(
    buildEntry({
      entryId: "claim_immutability_001",
      payload: { summary: "Initial claim text." },
    })
  );

  const entry = chain.getEntry("claim_immutability_001");
  assert.ok(entry);

  assert.throws(
    () => {
      entry.payload.summary = "Mutated";
    },
    TypeError
  );

  assert.throws(
    () => {
      entry.linkedEntryRefs.push("x");
    },
    TypeError
  );

  const freshRead = chain.getEntry("claim_immutability_001");
  assert.equal(freshRead.payload.summary, "Initial claim text.");

  const methodNames = Object.getOwnPropertyNames(ForensicChain.prototype).sort();
  assert.deepEqual(methodNames, [
    "appendEntry",
    "constructor",
    "getChainId",
    "getEntry",
    "listEntries",
  ]);
  assert.equal(typeof chain.updateEntry, "undefined");
  assert.equal(typeof chain.deleteEntry, "undefined");
});

test("ForensicChain rejects malformed linkage deterministically", () => {
  const chain = new ForensicChain("forensic_chain_wave3_invalid_links");

  chain.appendEntry(buildEntry({ entryId: "evidence_100", entryType: "EVIDENCE" }));

  expectValidationError(
    () =>
      chain.appendEntry(
        buildEntry({
          entryId: "claim_bad_missing",
          linkedEntryRefs: ["missing_entry_001"],
        })
      ),
    "INVALID_LINK",
    "linked entryId 'missing_entry_001' was not found"
  );

  expectValidationError(
    () =>
      chain.appendEntry(
        buildEntry({
          entryId: "claim_bad_duplicate",
          linkedEntryRefs: ["evidence_100", "evidence_100"],
        })
      ),
    "INVALID_LINK",
    "'linkedEntryRefs' must not contain duplicate entry references"
  );

  expectValidationError(
    () =>
      chain.appendEntry(
        buildEntry({
          entryId: "claim_bad_self",
          linkedEntryRefs: ["claim_bad_self"],
        })
      ),
    "INVALID_LINK",
    "entries must not link to their own entryId"
  );

  expectValidationError(
    () =>
      chain.appendEntry(
        buildEntry({
          entryId: "claim_bad_shape",
          linkedEntryRefs: ["evidence_100", 42],
        })
      ),
    "INVALID_FIELD",
    "'linkedEntryRefs' must be an array of non-empty strings"
  );
});

test("ForensicChain rejects invalid entry types and duplicate entry ids deterministically", () => {
  const chain = new ForensicChain("forensic_chain_wave3_validation");

  expectValidationError(
    () =>
      chain.appendEntry(
        buildEntry({
          entryId: "invalid_type_001",
          entryType: "NOTE",
        })
      ),
    "INVALID_FIELD",
    "'entryType' must be one of: CLAIM, EVIDENCE, GAP, FINDING, OPERATOR_ACTION"
  );

  chain.appendEntry(buildEntry({ entryId: "claim_unique_001" }));

  expectValidationError(
    () => chain.appendEntry(buildEntry({ entryId: "claim_unique_001" })),
    "DUPLICATE_ENTRY",
    "entryId 'claim_unique_001' already exists"
  );
});