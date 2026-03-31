"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { DiagnoseSkill, SKILL_ROUTES } = require("../../src/DiagnoseSkill");

function expectValidationError(action, code, message) {
  try {
    action();
    assert.fail("Expected validation error, but no error was thrown");
  } catch (error) {
    assert.equal(error.name, "ValidationError");
    assert.equal(error.code, code);
    assert.equal(error.message, `${code}: ${message}`);
  }
}

function sampleInput() {
  return {
    walkEvaluation: {
      findings: [
        {
          issueRef: "claim:claim_001",
          findingType: "PHANTOM",
          severity: "HIGH",
          pass: "Truthfulness",
          summary: "Claim has no supporting evidence linkage.",
          evidenceRefs: ["claim_001", "missing_001"],
        },
        {
          issueRef: "claim:claim_002",
          findingType: "INCOMPLETE",
          severity: "MEDIUM",
          pass: "Completeness",
          summary: "Scoped work is incomplete.",
          evidenceRefs: ["claim_002"],
        },
      ],
    },
    chainView: {
      chainId: "forensic_chain_wave5_s40",
      entries: [
        {
          entryId: "claim_001",
          entryType: "CLAIM",
          payload: {
            summary: "Claim one summary.",
          },
          linkedEntryRefs: ["evidence_001"],
        },
        {
          entryId: "claim_002",
          entryType: "CLAIM",
          payload: {
            summary: "Claim two summary.",
          },
          linkedEntryRefs: [],
        },
        {
          entryId: "evidence_001",
          entryType: "EVIDENCE",
          payload: {
            summary: "Evidence one summary.",
          },
          linkedEntryRefs: [],
        },
      ],
    },
  };
}

test("DiagnoseSkill keeps locked route list", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/diagnose"]);
});

test("/diagnose renders deterministic evidence links and keeps input unchanged", () => {
  const skill = new DiagnoseSkill();
  const input = sampleInput();
  const snapshot = JSON.parse(JSON.stringify(input));

  const viewA = skill.renderDiagnose(input);
  const viewB = skill.renderDiagnose(input);

  assert.deepEqual(input, snapshot);
  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/diagnose");
  assert.equal(viewA.chainId, "forensic_chain_wave5_s40");
  assert.equal(viewA.findingCount, 2);
  assert.equal(viewA.chainEntryCount, 3);
  assert.equal(viewA.findingSummary.PHANTOM, 1);
  assert.equal(viewA.findingSummary.INCOMPLETE, 1);
  assert.equal(viewA.chainEntryTypeSummary.CLAIM, 2);
  assert.equal(viewA.chainEntryTypeSummary.EVIDENCE, 1);
  assert.equal(viewA.chainEntryTypeSummary.GAP, 0);
  assert.equal(viewA.linkedEvidenceRefCount, 2);
  assert.equal(viewA.unlinkedEvidenceRefCount, 1);
  assert.equal(viewA.diagnostics[0].linkedChainEntries.length, 1);
  assert.equal(viewA.diagnostics[0].linkedChainEntries[0].entryId, "claim_001");
  assert.deepEqual(viewA.diagnostics[0].unlinkedEvidenceRefs, ["missing_001"]);
});

test("/diagnose keeps unmatched evidence refs visible", () => {
  const skill = new DiagnoseSkill();
  const input = sampleInput();
  input.walkEvaluation.findings[1].evidenceRefs = ["missing_002", "missing_003"];

  const view = skill.renderDiagnose(input);

  assert.equal(view.linkedEvidenceRefCount, 1);
  assert.equal(view.unlinkedEvidenceRefCount, 3);
  assert.deepEqual(view.diagnostics[1].unlinkedEvidenceRefs, [
    "missing_002",
    "missing_003",
  ]);
});

test("/diagnose requires walkEvaluation and chainView", () => {
  const skill = new DiagnoseSkill();

  expectValidationError(
    () => skill.renderDiagnose({}),
    "ERR_INVALID_INPUT",
    "'walkEvaluation' is required"
  );

  expectValidationError(
    () => skill.renderDiagnose({ walkEvaluation: { findings: [] } }),
    "ERR_INVALID_INPUT",
    "'chainView' is required"
  );
});

test("DiagnoseSkill method list stays render only", () => {
  const methodNames = Object.getOwnPropertyNames(DiagnoseSkill.prototype).sort();

  assert.deepEqual(methodNames, ["constructor", "renderDiagnose"]);
});
